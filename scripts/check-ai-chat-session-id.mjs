/**
 * Проверка `sessionId` в AI-чате без тестового раннера.
 *
 * В проекте нет vitest/jest, а установленный Node не исполняет TypeScript
 * напрямую. Поэтому `useAiAgentChat.ts` транспилируется уже установленным
 * `typescript` в ESM, а его зависимости (Vue и сервисы) подменяются
 * минимальными заглушками в том же временном каталоге. Никаких новых
 * зависимостей не добавляется.
 *
 * Запуск: `yarn test:ai-chat-session`.
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

/** Формат `sessionId`, который принимает бэкенд. */
const BACKEND_SAFE_SESSION_ID = /^[A-Za-z0-9._:-]{1,128}$/;

const VUE_STUB = `
export function ref(value) {
    return {value};
}

export function shallowRef(value) {
    return {value};
}

export function reactive(value) {
    return value;
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

const EXECUTOR_STUB = `
export const SEARCH_TOOL_NAME = 'search_api_endpoints';

export const toolExecutor = {
    requiresConfirmation() {
        return false;
    },
    async execute() {
        return {
            ok: true,
            status: 200,
            data: null,
            truncated: false,
            content: '{}',
            error: null,
            errorKind: null,
        };
    },
};
`;

const SERVICE_STUB = `
export const chatCalls = [];

export const aiChatService = {
    async chat(payload) {
        chatCalls.push(payload);

        return {
            ok: true,
            status: 200,
            finishReason: 'stop',
            message: {role: 'assistant', content: 'ok', toolCalls: []},
            usage: null,
            errorKey: null,
            errorDetails: null,
        };
    },
};
`;

/** Компилирует композабл и его зависимости во временный ESM-каталог. */
async function loadComposable() {
    const source = await readFile(composablePath, 'utf8');
    let transpiled = ts.transpileModule(source, {
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
            "from './executor.mjs'",
        ],
        [
            /from\s+['"]@\/modules\/ai-chat\/services\/AiChatService['"]/g,
            "from './service.mjs'",
        ],
    ];

    for (const [pattern, replacement] of replacements) {
        transpiled = transpiled.replace(pattern, replacement);
    }

    const tempDir = await mkdtemp(path.join(tmpdir(), 'ai-chat-session-'));

    await writeFile(path.join(tempDir, 'vue.mjs'), VUE_STUB, 'utf8');
    await writeFile(path.join(tempDir, 'registry.mjs'), REGISTRY_STUB, 'utf8');
    await writeFile(path.join(tempDir, 'executor.mjs'), EXECUTOR_STUB, 'utf8');
    await writeFile(path.join(tempDir, 'service.mjs'), SERVICE_STUB, 'utf8');
    await writeFile(path.join(tempDir, 'useAiAgentChat.mjs'), transpiled, 'utf8');

    const composableUrl = pathToFileURL(path.join(tempDir, 'useAiAgentChat.mjs')).href;
    const serviceUrl = pathToFileURL(path.join(tempDir, 'service.mjs')).href;

    try {
        const composable = await import(composableUrl);
        const service = await import(serviceUrl);

        return {
            useAiAgentChat: composable.useAiAgentChat,
            chatCalls: service.chatCalls,
        };
    } finally {
        await rm(tempDir, {recursive: true, force: true});
    }
}

const {useAiAgentChat, chatCalls} = await loadComposable();

const cases = [];

function test(name, fn) {
    cases.push({name, fn});
}

test('обычная отправка передаёт sessionId, совместимый с бэкендом', async () => {
    const chat = useAiAgentChat();

    await chat.send('hello');

    assert.equal(chatCalls.length, 1);
    const sessionId = chatCalls[0].sessionId;

    assert.equal(typeof sessionId, 'string');
    assert.match(sessionId, BACKEND_SAFE_SESSION_ID);
    assert.ok(sessionId.length <= 128);
});

test('reset() меняет sessionId на новый, тоже безопасный', async () => {
    const chat = useAiAgentChat();

    await chat.send('first');
    const before = chatCalls.at(-1).sessionId;

    chat.reset();

    await chat.send('second');
    const after = chatCalls.at(-1).sessionId;

    assert.notEqual(after, before);
    assert.match(after, BACKEND_SAFE_SESSION_ID);
});

test('несколько сообщений одного диалога используют один sessionId', async () => {
    const chat = useAiAgentChat();

    await chat.send('one');
    const first = chatCalls.at(-1).sessionId;

    await chat.send('two');
    const second = chatCalls.at(-1).sessionId;

    assert.equal(second, first);
});

test('без crypto.randomUUID используется fallback ai-<timestamp>-<random>', async () => {
    const originalRandomUUID = globalThis.crypto.randomUUID;
    let chat;

    try {
        globalThis.crypto.randomUUID = undefined;
        chat = useAiAgentChat();
        await chat.send('fallback');
    } finally {
        globalThis.crypto.randomUUID = originalRandomUUID;
    }

    const sessionId = chatCalls.at(-1).sessionId;

    assert.match(sessionId, BACKEND_SAFE_SESSION_ID);
    assert.ok(sessionId.startsWith('ai-'));
    assert.ok(sessionId.length <= 128);
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

console.log(`\nAll ${cases.length} AI chat session-id checks passed.`);
