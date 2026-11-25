/**
 * Проверка контракта сессий AI-чата без тестового раннера.
 *
 * В проекте нет vitest/jest, а установленный Node не исполняет TypeScript
 * напрямую. Поэтому `AiChatService.ts`, `AiChatErrorNormalizer.ts` и
 * `StorSessiyAiChata.ts` транспилируются уже установленным `typescript` во
 * временный ESM-каталог. Зависимости (apiClient, Pinia, сервис) подменяются
 * минимальными заглушками. Новых зависимостей нет.
 *
 * Проверяется именно A4-контракт:
 * - точные пути/глаголы session-эндпоинтов;
 * - `data.code`/`data.message` ошибок доходят до нормализатора;
 * - идентификатор сессии приходит с сервера, клиент его не генерирует;
 * - в списке используется серверное превью, пустые сессии не синтезируются;
 * - удаление разрешено только для архивной сессии.
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
const moduleDir = path.join(projectDir, 'src', 'modules', 'ai-chat');

const servicePath = path.join(moduleDir, 'services', 'AiChatService.ts');
const normalizerPath = path.join(moduleDir, 'services', 'AiChatErrorNormalizer.ts');
const storePath = path.join(moduleDir, 'store', 'StorSessiyAiChata.ts');

/** Транспилирует TypeScript-модуль в ESM. */
async function transpile(filePath, replacements = []) {
    const source = await readFile(filePath, 'utf8');
    let output = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            isolatedModules: true,
        },
        fileName: filePath,
    }).outputText;

    for (const [pattern, replacement] of replacements) {
        output = output.replace(pattern, replacement);
    }

    return output;
}

const API_CLIENT_STUB = `
export const state = { calls: [], queue: [] };

const apiClient = {
    async requestRaw(method, url, data, params) {
        state.calls.push({ method, url, data, params });

        if (state.queue.length === 0) {
            throw new Error('No queued response');
        }

        return state.queue.shift();
    },
};

export default apiClient;
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

/** Компилирует сервис с заглушками apiClient/registry и настоящим нормализатором. */
async function loadService() {
    const tempDir = await mkdtemp(path.join(tmpdir(), 'ai-chat-service-'));

    const normalizer = await transpile(normalizerPath);
    const service = await transpile(servicePath, [
        [/from\s+['"]@\/bootstrap\/apiClient['"]/g, "from './apiClient.mjs'"],
        [
            /from\s+['"]@\/modules\/ai-chat\/services\/OpenApiToolRegistry['"]/g,
            "from './registry.mjs'",
        ],
        [
            /from\s+['"]@\/modules\/ai-chat\/services\/AiChatErrorNormalizer['"]/g,
            "from './normalizer.mjs'",
        ],
    ]);

    await writeFile(path.join(tempDir, 'apiClient.mjs'), API_CLIENT_STUB, 'utf8');
    await writeFile(path.join(tempDir, 'registry.mjs'), REGISTRY_STUB, 'utf8');
    await writeFile(path.join(tempDir, 'normalizer.mjs'), normalizer, 'utf8');
    await writeFile(path.join(tempDir, 'AiChatService.mjs'), service, 'utf8');

    try {
        const serviceModule = await import(
            pathToFileURL(path.join(tempDir, 'AiChatService.mjs')).href
        );
        const apiClientModule = await import(
            pathToFileURL(path.join(tempDir, 'apiClient.mjs')).href
        );

        return {
            service: new serviceModule.AiChatService(),
            state: apiClientModule.state,
        };
    } finally {
        await rm(tempDir, {recursive: true, force: true});
    }
}

const PINIA_STUB = `
export function defineStore(id, options) {
    return function useStore() {
        const state = options.state ? options.state() : {};

        for (const [name, getter] of Object.entries(options.getters ?? {})) {
            Object.defineProperty(state, name, {
                enumerable: true,
                get() {
                    return getter.call(state);
                },
            });
        }

        for (const [name, action] of Object.entries(options.actions ?? {})) {
            state[name] = action.bind(state);
        }

        return state;
    };
}
`;

const SERVICE_STUB = `
export const state = { calls: [], responses: {} };

const aiChatService = {
    async listSessions(query) {
        state.calls.push({ name: 'listSessions', query });
        return state.responses.listSessions;
    },
    async getSession(id) {
        state.calls.push({ name: 'getSession', id });
        return state.responses.getSession;
    },
    async createSession(payload) {
        state.calls.push({ name: 'createSession', payload });
        return state.responses.createSession;
    },
    async archiveSession(id) {
        state.calls.push({ name: 'archiveSession', id });
        return state.responses.archiveSession;
    },
    async deleteSession(id) {
        state.calls.push({ name: 'deleteSession', id });
        return state.responses.deleteSession;
    },
    async startTurn(id, payload) {
        state.calls.push({ name: 'startTurn', id, payload });
        return state.responses.startTurn;
    },
};

export default aiChatService;
`;

/** Компилирует стор с заглушками Pinia и сервиса. */
async function loadStore() {
    const tempDir = await mkdtemp(path.join(tmpdir(), 'ai-chat-store-'));

    const store = await transpile(storePath, [
        [/from\s+['"]pinia['"]/g, "from './pinia.mjs'"],
        [
            /from\s+['"]@\/modules\/ai-chat\/services\/AiChatService['"]/g,
            "from './service.mjs'",
        ],
    ]);

    await writeFile(path.join(tempDir, 'pinia.mjs'), PINIA_STUB, 'utf8');
    await writeFile(path.join(tempDir, 'service.mjs'), SERVICE_STUB, 'utf8');
    await writeFile(path.join(tempDir, 'StorSessiyAiChata.mjs'), store, 'utf8');

    try {
        const storeModule = await import(
            pathToFileURL(path.join(tempDir, 'StorSessiyAiChata.mjs')).href
        );
        const serviceModule = await import(
            pathToFileURL(path.join(tempDir, 'service.mjs')).href
        );

        return {
            useStore: storeModule.useStorSessiyAiChata,
            serviceState: serviceModule.state,
        };
    } finally {
        await rm(tempDir, {recursive: true, force: true});
    }
}

/* ------------------------------ Фикстуры ------------------------------ */

function session(overrides = {}) {
    return {
        id: 'srv-session-1',
        title: 'Первый диалог',
        provider: 'openai',
        model: 'gpt-4o-mini',
        archived: false,
        archiveReason: null,
        credentialDeleted: false,
        preview: 'Создай проект...',
        createdAt: 1764000000,
        updatedAt: 1764000300,
        expiresAt: 1764086400,
        messageCount: 2,
        ...overrides,
    };
}

function uspeh(data, status = 200) {
    return {
        ok: true,
        status,
        data: {status: 'success', data},
        error: null,
    };
}

function oshibka(status, code, message) {
    return {
        ok: false,
        status,
        data: {status: 'fail', data: {code, message}},
        error: message,
    };
}

function uspehServisa(data) {
    return {ok: true, status: 200, data, errorKey: null, errorDetails: null};
}

function otvetSpiska(items, overrides = {}) {
    return {
        items,
        limit: 50,
        offset: 0,
        total: items.length,
        hasMore: false,
        ...overrides,
    };
}

/* ------------------------------- Тесты -------------------------------- */

const cases = [];

function test(name, fn) {
    cases.push({name, fn});
}

const {service, state: apiState} = await loadService();
const {useStore, serviceState} = await loadStore();

test('listSessions: GET /ai/chat/sessions с точными query-параметрами', async () => {
    apiState.queue.push(uspeh(otvetSpiska([session()])));

    const result = await service.listSessions({
        includeArchived: true,
        search: '  проект  ',
        limit: 10,
        offset: 20,
    });

    const call = apiState.calls.at(-1);

    assert.equal(call.method, 'get');
    assert.equal(call.url, '/ai/chat/sessions');
    assert.equal(call.params.includeArchived, true);
    assert.equal(call.params.search, 'проект');
    assert.equal(call.params.limit, 10);
    assert.equal(call.params.offset, 20);

    assert.equal(result.ok, true);
    assert.equal(result.data.items[0].preview, 'Создай проект...');
});

test('listSessions: значения по умолчанию limit=50, offset=0, без search', async () => {
    apiState.queue.push(uspeh(otvetSpiska([])));

    await service.listSessions();

    const call = apiState.calls.at(-1);

    assert.equal(call.params.includeArchived, false);
    assert.equal(call.params.limit, 50);
    assert.equal(call.params.offset, 0);
    assert.equal('search' in call.params, false);
});

test('getSession: GET /ai/chat/sessions/{id} с кодированием id', async () => {
    apiState.queue.push(uspeh({session: session(), messages: []}));

    const result = await service.getSession('id with space');

    const call = apiState.calls.at(-1);

    assert.equal(call.method, 'get');
    assert.equal(call.url, '/ai/chat/sessions/id%20with%20space');
    assert.equal(result.data.session.id, 'srv-session-1');
});

test('createSession: POST с непустыми полями; id приходит с сервера', async () => {
    apiState.queue.push(uspeh(session({id: 'server-generated-id', preview: ''}), 201));

    const result = await service.createSession({
        credentialId: 'cred-1',
        model: '',
        title: '  Новая  ',
    });

    const call = apiState.calls.at(-1);

    assert.equal(call.method, 'post');
    assert.equal(call.url, '/ai/chat/sessions');
    assert.deepEqual(call.data, {credentialId: 'cred-1', title: 'Новая'});

    assert.equal(result.data.id, 'server-generated-id');
});

test('archiveSession: POST /ai/chat/sessions/{id}/archive', async () => {
    apiState.queue.push(uspeh(session({archived: true, archiveReason: 'manual'})));

    const result = await service.archiveSession('abc');

    const call = apiState.calls.at(-1);

    assert.equal(call.method, 'post');
    assert.equal(call.url, '/ai/chat/sessions/abc/archive');
    assert.equal(result.data.archived, true);
});

test('deleteSession: DELETE /ai/chat/sessions/{id}, data=null', async () => {
    apiState.queue.push(uspeh(null));

    const result = await service.deleteSession('abc');

    const call = apiState.calls.at(-1);

    assert.equal(call.method, 'delete');
    assert.equal(call.url, '/ai/chat/sessions/abc');
    assert.equal(result.ok, true);
    assert.equal(result.data, null);
});

test('startTurn: ровно message в теле хода', async () => {
    apiState.queue.push(uspeh({
        assistant: {content: 'ok', toolCalls: []},
        session: {
            id: 'abc',
            providerSessionExpiresAt: 100,
            archived: false,
            updatedAt: 200,
            title: 'T',
        },
    }));

    const result = await service.startTurn('abc', {message: 'hello'});

    const call = apiState.calls.at(-1);

    assert.equal(call.method, 'post');
    assert.equal(call.url, '/ai/chat/sessions/abc/turns');
    assert.deepEqual(call.data, {message: 'hello'});
    assert.equal('toolResults' in call.data, false);
    assert.equal(result.data.session.id, 'abc');
});

test('startTurn: ровно toolResults в теле хода', async () => {
    apiState.queue.push(uspeh({
        assistant: {content: null, toolCalls: []},
        session: {
            id: 'abc',
            providerSessionExpiresAt: null,
            archived: false,
            updatedAt: 200,
            title: 'T',
        },
    }));

    const toolResults = [{toolCallId: 'call_1', content: '{}', name: 'search'}];

    await service.startTurn('abc', {toolResults});

    const call = apiState.calls.at(-1);

    assert.deepEqual(call.data, {toolResults});
    assert.equal('message' in call.data, false);
});

test('startTurn: code/message ошибки из data.code доходят до результата', async () => {
    apiState.queue.push(oshibka(409, 'ai.chat.session_archived', 'Session is archived'));

    const result = await service.startTurn('abc', {message: 'hello'});

    assert.equal(result.ok, false);
    assert.equal(result.status, 409);
    assert.equal(result.errorKey, 'ai.chat.session_archived');
    assert.equal(result.errorDetails, 'Session is archived');
});

test('store: список использует серверное превью', async () => {
    serviceState.responses.listSessions = uspehServisa(otvetSpiska([session()]));

    const store = useStore();
    await store.zagruzitSpisok();

    assert.equal(store.items.length, 1);
    assert.equal(store.items[0].preview, 'Создай проект...');
    assert.equal(store.total, 1);
    assert.equal(store.hasMore, false);
});

test('store: создание не добавляет пустую сессию в список', async () => {
    serviceState.responses.listSessions = uspehServisa(otvetSpiska([session()]));
    serviceState.responses.createSession = uspehServisa(
        session({id: 'server-generated-id', preview: '', messageCount: 0}),
    );

    const store = useStore();
    await store.zagruzitSpisok();
    const before = store.items.length;

    const result = await store.sozdatSessiyu({});

    assert.equal(result.ok, true);
    assert.equal(store.session.id, 'server-generated-id');
    assert.equal(store.items.length, before);
});

test('store: удаление активной сессии блокируется на клиенте', async () => {
    serviceState.calls.length = 0;
    serviceState.responses.listSessions = uspehServisa(otvetSpiska([session({archived: false})]));

    const store = useStore();
    await store.zagruzitSpisok();

    const result = await store.udalitSessiyu('srv-session-1');

    assert.equal(result.ok, false);
    assert.equal(result.errorKey, 'ai.chat.session_not_archived');
    assert.equal(serviceState.calls.some((call) => call.name === 'deleteSession'), false);
});

test('store: удаление архивной сессии вызывает DELETE и убирает карточку', async () => {
    serviceState.calls.length = 0;
    serviceState.responses.listSessions = uspehServisa(
        otvetSpiska([session({id: 'archived-1', archived: true})]),
    );
    serviceState.responses.deleteSession = uspehServisa(null);

    const store = useStore();
    await store.zagruzitSpisok();

    const result = await store.udalitSessiyu('archived-1');

    assert.equal(result.ok, true);
    assert.equal(store.items.length, 0);
    assert.equal(serviceState.calls.some((call) => call.name === 'deleteSession'), true);
});

test('store: архивация обновляет карточку, сохраняя превью', async () => {
    serviceState.responses.listSessions = uspehServisa(otvetSpiska([session()]));
    serviceState.responses.archiveSession = uspehServisa(
        session({archived: true, archiveReason: 'manual', updatedAt: 1764000900}),
    );

    const store = useStore();
    await store.zagruzitSpisok();

    const result = await store.arhivirovatSessiyu('srv-session-1');

    assert.equal(result.ok, true);
    assert.equal(store.items[0].archived, true);
    assert.equal(store.items[0].preview, 'Создай проект...');
});

test('store: applyTurnResult обновляет сводку и добавляет сообщения', () => {
    const store = useStore();
    store.session = session();
    store.items = [session()];

    store.applyTurnResult(
        {
            assistant: {
                content: 'Готово',
                toolCalls: [{id: 'call_1', name: 'search', arguments: '{}'}],
            },
            session: {
                id: 'srv-session-1',
                providerSessionExpiresAt: 1764000600,
                archived: false,
                updatedAt: 1764000900,
                title: 'Новый заголовок',
            },
        },
        {userMessage: 'Привет'},
    );

    assert.equal(store.session.title, 'Новый заголовок');
    assert.equal(store.items[0].title, 'Новый заголовок');
    assert.equal(store.items[0].preview, 'Создай проект...');
    assert.equal(store.providerSessionExpiresAt, 1764000600);
    assert.deepEqual(store.messages.map((message) => message.role), ['user', 'assistant']);
    assert.equal(store.messages[1].toolCalls[0].name, 'search');
});

test('store: tool-сообщения с тем же toolCallId не дублируются', () => {
    const store = useStore();

    store.dobavitSoobshenie({
        role: 'tool',
        content: 'first',
        toolCallId: 'call_1',
        name: 'search',
    });
    store.dobavitSoobshenie({
        role: 'tool',
        content: 'second',
        toolCallId: 'call_1',
        name: 'search',
    });

    assert.equal(store.messages.length, 1);
    assert.equal(store.messages[0].content, 'second');
});

test('store: sbrositVse очищает и список, и открытую сессию', () => {
    const store = useStore();
    store.items = [session()];
    store.session = session();
    store.messages = [{
        id: 'm1',
        seq: 0,
        role: 'user',
        content: 'x',
        toolCalls: [],
        toolCallId: null,
        name: null,
        createdAt: 1,
    }];

    store.sbrositVse();

    assert.equal(store.items.length, 0);
    assert.equal(store.session, null);
    assert.equal(store.messages.length, 0);
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

console.log(`\nAll ${cases.length} AI chat session-contract checks passed.`);
