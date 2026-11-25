/**
 * Проверка агентского цикла A5 на серверных сессиях.
 *
 * В проекте нет vitest/jest, поэтому `useAiAgentChat.ts` транспилируется
 * установленным `typescript`, а Vue/Pinia/сервис/реестр/исполнитель
 * подменяются минимальными заглушками. Проверяется именно A5-контракт:
 * - сессия создаётся на сервере, клиент не генерирует id;
 * - первый ход уходит как `message`, продолжение — как `toolResults`;
 * - история сессии заполняет ленту и LLM-историю;
 * - архивная сессия read-only и не вызывает сервис;
 * - лимит 10 шагов не даёт отправить 11-й запрос.
 *
 * Запуск: `yarn test:ai-chat-agent`.
 */

import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

import ts from 'typescript';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptsDir, '..');
const composablePath = path.join(
    projectDir,
    'src',
    'modules',
    'ai-chat',
    'composables',
    'useAiAgentChat.ts',
);

const VUE_STUB = `
export function ref(value) {
    return { value };
}

export function shallowRef(value) {
    return { value };
}

export function reactive(value) {
    return value;
}

export function computed(getter) {
    return {
        get value() {
            return getter();
        },
    };
}
`;

const REGISTRY_STUB = `
export function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const openApiToolRegistry = {
    async initialize() {},
    refreshRoles() {},
    getActiveTools() {
        return [];
    },
    getTools() {
        return [];
    },
    resolveTool() {
        return null;
    },
    resetSession() {},
};
`;

const TOOL_EXECUTOR_STUB = `
export const SEARCH_TOOL_NAME = 'search_api_endpoints';

export const toolExecutor = {
    requiresConfirmation() {
        return false;
    },
    async execute(name) {
        return {
            ok: true,
            status: 200,
            data: { name },
            truncated: false,
            content: JSON.stringify({ok: true, name}),
        };
    },
};
`;

const SERVICE_STUB = `
export const serviceState = {
    calls: [],
    queue: [],
};

export const aiChatService = {
    async startTurn(id, payload) {
        serviceState.calls.push({id, payload});

        if (serviceState.queue.length === 0) {
            throw new Error('No queued turn response');
        }

        return serviceState.queue.shift();
    },
};

export default aiChatService;
`;

const STORE_STUB = `
export const storeState = {
    session: null,
    messages: [],
    createResponse: null,
    createError: null,
    openResponse: null,
    openError: null,
    createdPayloads: [],
    openedIds: [],
    applyCalls: [],
};

function uspeh(data, status = 200) {
    return {ok: true, status, data, errorKey: null, errorDetails: null};
}

const store = {
    get session() {
        return storeState.session;
    },
    get messages() {
        return storeState.messages;
    },
    async sozdatSessiyu(payload) {
        storeState.createdPayloads.push(payload);

        if (storeState.createError !== null) {
            return storeState.createError;
        }

        const session = storeState.createResponse;
        storeState.session = session;

        return uspeh(session, 201);
    },
    applyTurnResult(result, dopolnenie) {
        storeState.applyCalls.push({result, dopolnenie});

        if (storeState.session !== null && storeState.session.id === result.session.id) {
            storeState.session = {
                ...storeState.session,
                title: result.session.title,
                archived: result.session.archived,
                updatedAt: result.session.updatedAt,
            };
        }
    },
    sbrosit() {
        storeState.session = null;
    },
    async otkrytSessiyu(id) {
        storeState.openedIds.push(id);

        if (storeState.openError !== null) {
            return storeState.openError;
        }

        const data = storeState.openResponse;
        storeState.session = data.session;
        storeState.messages = data.messages;

        return uspeh(data);
    },
};

export function useStorSessiyAiChata() {
    return store;
}

export default useStorSessiyAiChata;
`;

/** Транспилирует композабл с подменой зависимостей на локальные заглушки. */
async function loadComposable() {
    const source = await readFile(composablePath, 'utf8');
    let output = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            isolatedModules: true,
        },
        fileName: composablePath,
    }).outputText;

    const replacements = [
        [/from\s+['"]vue['"]/g, "from './vue.mjs'"],
        [
            /from\s+['"]@\/modules\/ai-chat\/services\/OpenApiToolRegistry['"]/g,
            "from './registry.mjs'",
        ],
        [
            /from\s+['"]@\/modules\/ai-chat\/services\/ToolExecutor['"]/g,
            "from './tool-executor.mjs'",
        ],
        [
            /from\s+['"]@\/modules\/ai-chat\/services\/AiChatService['"]/g,
            "from './service.mjs'",
        ],
        [
            /from\s+['"]@\/modules\/ai-chat\/store\/StorSessiyAiChata['"]/g,
            "from './store.mjs'",
        ],
    ];

    for (const [pattern, replacement] of replacements) {
        output = output.replace(pattern, replacement);
    }

    const tempDir = await mkdtemp(path.join(tmpdir(), 'ai-chat-agent-'));

    await writeFile(path.join(tempDir, 'vue.mjs'), VUE_STUB, 'utf8');
    await writeFile(path.join(tempDir, 'registry.mjs'), REGISTRY_STUB, 'utf8');
    await writeFile(path.join(tempDir, 'tool-executor.mjs'), TOOL_EXECUTOR_STUB, 'utf8');
    await writeFile(path.join(tempDir, 'service.mjs'), SERVICE_STUB, 'utf8');
    await writeFile(path.join(tempDir, 'store.mjs'), STORE_STUB, 'utf8');
    await writeFile(path.join(tempDir, 'useAiAgentChat.mjs'), output, 'utf8');

    try {
        const composableModule = await import(
            pathToFileURL(path.join(tempDir, 'useAiAgentChat.mjs')).href
        );
        const serviceModule = await import(
            pathToFileURL(path.join(tempDir, 'service.mjs')).href
        );
        const storeModule = await import(
            pathToFileURL(path.join(tempDir, 'store.mjs')).href
        );

        return {
            useAiAgentChat: composableModule.useAiAgentChat,
            serviceState: serviceModule.serviceState,
            storeState: storeModule.storeState,
        };
    } finally {
        await rm(tempDir, {recursive: true, force: true});
    }
}

/* ------------------------------ Фикстуры ------------------------------ */

function session(overrides = {}) {
    return {
        id: 'srv-1',
        title: 'Диалог',
        provider: 'openai',
        model: 'gpt-4o-mini',
        archived: false,
        archiveReason: null,
        credentialDeleted: false,
        preview: 'hi',
        createdAt: 1,
        updatedAt: 1,
        // Далеко в будущем: тест не должен зависеть от текущей даты.
        expiresAt: 2000000000,
        messageCount: 1,
        ...overrides,
    };
}

function turnResult({content = null, toolCalls = [], archived = false} = {}) {
    return {
        ok: true,
        status: 200,
        data: {
            assistant: {content, toolCalls},
            session: {
                id: 'srv-1',
                providerSessionExpiresAt: 100,
                archived,
                updatedAt: 2,
                title: 'Диалог',
            },
        },
        errorKey: null,
        errorDetails: null,
    };
}

const {useAiAgentChat, serviceState, storeState} = await loadComposable();

function resetState() {
    serviceState.calls.length = 0;
    serviceState.queue.length = 0;
    storeState.session = null;
    storeState.messages = [];
    storeState.createResponse = session();
    storeState.createError = null;
    storeState.openResponse = null;
    storeState.openError = null;
    storeState.createdPayloads.length = 0;
    storeState.openedIds.length = 0;
    storeState.applyCalls.length = 0;
}

/* ------------------------------- Тесты -------------------------------- */

const cases = [];

function test(name, fn) {
    cases.push({name, fn});
}

test('send создаёт серверную сессию и отправляет message', async () => {
    resetState();
    serviceState.queue.push(turnResult({content: 'Привет'}));

    const chat = useAiAgentChat({credentialId: 'cred-1', model: 'm'});
    await chat.send('  hi  ');

    assert.deepEqual(storeState.createdPayloads[0], {credentialId: 'cred-1', model: 'm'});
    assert.equal(serviceState.calls.length, 1);
    assert.equal(serviceState.calls[0].id, 'srv-1');
    assert.equal(serviceState.calls[0].payload.message, 'hi');
    assert.equal('toolResults' in serviceState.calls[0].payload, false);
    assert.deepEqual(chat.messages.value.map((entry) => entry.kind), ['user', 'assistant']);
    assert.equal(storeState.applyCalls[0].dopolnenie.userMessage, 'hi');
    assert.equal(chat.sessionId.value, 'srv-1');
});

test('после инструментов отправляется turn с toolResults', async () => {
    resetState();
    storeState.session = session();
    serviceState.queue.push(turnResult({
        toolCalls: [{id: 'call_1', name: 'search_api_endpoints', arguments: '{}'}],
    }));
    serviceState.queue.push(turnResult({content: 'Готово'}));

    const chat = useAiAgentChat();
    await chat.send('go');

    assert.equal(serviceState.calls.length, 2);
    assert.equal('message' in serviceState.calls[1].payload, false);
    assert.equal(serviceState.calls[1].payload.toolResults[0].toolCallId, 'call_1');
    assert.equal(storeState.applyCalls.length, 2);
    assert.equal(storeState.applyCalls[1].dopolnenie.toolResults[0].toolCallId, 'call_1');
    assert.equal(chat.messages.value.find((entry) => entry.kind === 'tool').status, 'success');
    assert.equal(chat.messages.value.at(-1).kind, 'assistant');
});

test('loadSession заполняет ленту и LLM-историю', () => {
    resetState();

    const chat = useAiAgentChat();
    chat.loadSession([
        {id: 'm1', seq: 0, role: 'user', content: 'hi', toolCalls: [], toolCallId: null, name: null, createdAt: 1},
        {
            id: 'm2',
            seq: 1,
            role: 'assistant',
            content: null,
            toolCalls: [{id: 'c1', name: 'search_api_endpoints', arguments: '{}'}],
            toolCallId: null,
            name: null,
            createdAt: 2,
        },
        {
            id: 'm3',
            seq: 2,
            role: 'tool',
            content: JSON.stringify({ok: true}),
            toolCalls: [],
            toolCallId: 'c1',
            name: 'search_api_endpoints',
            createdAt: 3,
        },
        {id: 'm4', seq: 3, role: 'assistant', content: 'done', toolCalls: [], toolCallId: null, name: null, createdAt: 4},
    ]);

    assert.deepEqual(chat.messages.value.map((entry) => entry.kind), ['user', 'tool', 'assistant']);
    assert.equal(chat.messages.value[1].status, 'success');
    assert.deepEqual(chat.llmMessages.value.map((message) => message.role), [
        'user',
        'assistant',
        'tool',
        'assistant',
    ]);
});

test('архивная сессия read-only: send не вызывает сервис', async () => {
    resetState();
    storeState.session = session({archived: true});

    const chat = useAiAgentChat();
    await chat.send('нельзя');

    assert.equal(serviceState.calls.length, 0);
    assert.equal(chat.isReadOnly.value, true);
    assert.equal(chat.messages.value.at(-1).kind, 'error');
    assert.equal(chat.messages.value.at(-1).errorKey, 'ai.chat.session_archived');
});

test('лимит 10 шагов не отправляет 11-й запрос', async () => {
    resetState();
    storeState.session = session();

    for (let index = 0; index < 10; index += 1) {
        serviceState.queue.push(turnResult({
            toolCalls: [{id: `call_${index}`, name: 'search_api_endpoints', arguments: '{}'}],
        }));
    }

    serviceState.queue.push(turnResult({content: 'лишний'}));

    const chat = useAiAgentChat();
    await chat.send('go');

    assert.equal(serviceState.calls.length, 10);
    assert.equal(chat.stepLimitReached.value, true);
    assert.equal(serviceState.queue.length, 1);
});

let failed = 0;

for (const {name, fn} of cases) {
    try {
        await fn();
        console.log(`ok - ${name}`);
    } catch (error) {
        failed += 1;
        console.error(`not ok - ${name}`);
        console.error(error instanceof Error ? error.stack : String(error));
    }
}

if (failed > 0) {
    console.error(`\n${failed} of ${cases.length} checks failed.`);
    process.exit(1);
}

console.log(`\nAll ${cases.length} AI chat agent-loop checks passed.`);
