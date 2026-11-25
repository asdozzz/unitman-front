/**
 * Проверка извлечения `errorDetails` в AI-чате без тестового раннера.
 *
 * В проекте нет vitest/jest, а установленный Node не умеет исполнять
 * TypeScript напрямую. Поэтому чистый модуль
 * `src/modules/ai-chat/services/AiChatErrorNormalizer.ts` транспилируется
 * уже установленным `typescript` во временный `.mjs` и проверяется
 * встроенными средствами Node (`node:assert`). Новых зависимостей нет.
 *
 * Запуск: `yarn test:ai-chat`.
 */

import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

import ts from 'typescript';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptsDir, '..');
const sourcePath = path.join(
    projectDir,
    'src',
    'modules',
    'ai-chat',
    'services',
    'AiChatErrorNormalizer.ts',
);

/** Компилирует модуль в ESM и импортирует его. */
async function loadNormalizer() {
    const source = await readFile(sourcePath, 'utf8');
    const transpiled = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            isolatedModules: true,
        },
        fileName: sourcePath,
    }).outputText;

    const tempDir = await mkdtemp(path.join(tmpdir(), 'ai-chat-error-details-'));
    const modulePath = path.join(tempDir, 'AiChatErrorNormalizer.mjs');

    await writeFile(modulePath, transpiled, 'utf8');

    try {
        return await import(pathToFileURL(modulePath).href);
    } finally {
        await rm(tempDir, {recursive: true, force: true});
    }
}

const {izvlechDetaliOshibki, normalizovatOshibkuChat} = await loadNormalizer();

const cases = [];

function test(name, fn) {
    cases.push({name, fn});
}

test('error.message имеет высший приоритет', () => {
    const data = {
        error: {message: 'model does not support tools'},
        message: 'top level',
        data: {message: 'envelope'},
    };

    assert.equal(izvlechDetaliOshibki(data), 'model does not support tools');
});

test('top-level message используется, если нет error.message', () => {
    assert.equal(izvlechDetaliOshibki({message: 'Bad request from provider'}), 'Bad request from provider');
});

test('data.message используется, если нет верхних полей', () => {
    assert.equal(
        izvlechDetaliOshibki({data: {message: 'Credential rejected'}}),
        'Credential rejected',
    );
});

test('data.error.message используется как последний приоритет', () => {
    assert.equal(
        izvlechDetaliOshibki({data: {error: {message: 'Upstream said no'}}}),
        'Upstream said no',
    );
});

test('нет пригодного текста → null', () => {
    assert.equal(izvlechDetaliOshibki({}), null);
    assert.equal(izvlechDetaliOshibki({error: {code: 'bad_request'}}), null);
    assert.equal(izvlechDetaliOshibki(null), null);
    assert.equal(izvlechDetaliOshibki('plain string body'), null);
    assert.equal(izvlechDetaliOshibki([{message: 'array'}]), null);
});

test('нестроковые и пустые значения игнорируются, строки обрезаются', () => {
    assert.equal(izvlechDetaliOshibki({error: {message: 42}}), null);
    assert.equal(izvlechDetaliOshibki({error: {message: '   '}}), null);
    assert.equal(izvlechDetaliOshibki({message: '  spaced text  '}), 'spaced text');
    assert.equal(
        izvlechDetaliOshibki({error: {message: 42}, message: 'fallback text'}),
        'fallback text',
    );
});

test('неизвестный 4xx получает ai.chat.upstream_error и текст провайдера', () => {
    const result = normalizovatOshibkuChat(400, {error: {message: 'MissingSessionID'}});

    assert.equal(result.errorKey, 'ai.chat.upstream_error');
    assert.equal(result.errorDetails, 'MissingSessionID');
});

test('неизвестный 5xx получает ai.chat.upstream_error', () => {
    const result = normalizovatOshibkuChat(500, {message: 'Internal upstream failure'});

    assert.equal(result.errorKey, 'ai.chat.upstream_error');
    assert.equal(result.errorDetails, 'Internal upstream failure');
});

test('известные статусы сохраняют прежний маппинг', () => {
    assert.equal(normalizovatOshibkuChat(401, {}).errorKey, 'account.not_authenticated');
    assert.equal(normalizovatOshibkuChat(422, {}).errorKey, 'ai.chat.invalid_payload');
    assert.equal(normalizovatOshibkuChat(502, {}).errorKey, 'ai.chat.upstream_unavailable');
});

test('code из тела важнее статуса', () => {
    const result = normalizovatOshibkuChat(422, {
        data: {code: 'account.opencode_credential.model_not_available'},
    });

    assert.equal(result.errorKey, 'account.opencode_credential.model_not_available');
});

test('пустой текст не попадает в errorDetails', () => {
    const result = normalizovatOshibkuChat(400, {error: {message: '   '}});

    assert.equal(result.errorKey, 'ai.chat.upstream_error');
    assert.equal(result.errorDetails, null);
});

test('коды session-эндпоинтов берутся из data.code конверта', () => {
    const archived = normalizovatOshibkuChat(409, {
        status: 'fail',
        data: {code: 'ai.chat.session_archived', message: 'Session is archived'},
    });

    assert.equal(archived.errorKey, 'ai.chat.session_archived');
    assert.equal(archived.errorDetails, 'Session is archived');

    const notFound = normalizovatOshibkuChat(404, {
        status: 'fail',
        data: {code: 'ai.chat.session_not_found', message: 'Session not found'},
    });

    assert.equal(notFound.errorKey, 'ai.chat.session_not_found');
    assert.equal(notFound.errorDetails, 'Session not found');
});

test('остальные session-коды и сообщение доходят без потерь', () => {
    const cases = [
        [409, 'ai.chat.session_expired'],
        [409, 'ai.chat.session_not_archived'],
        [409, 'ai.chat.credential_deleted'],
        [409, 'ai.chat.session_message_limit'],
        [422, 'ai.chat.invalid_limit'],
        [422, 'ai.chat.invalid_offset'],
        [422, 'ai.chat.credential_required'],
        [422, 'ai.chat.provider_not_supported'],
        [422, 'ai.chat.provider_session_transport_unknown'],
    ];

    for (const [status, code] of cases) {
        const result = normalizovatOshibkuChat(status, {
            status: 'fail',
            data: {code, message: `msg:${code}`},
        });

        assert.equal(result.errorKey, code);
        assert.equal(result.errorDetails, `msg:${code}`);
    }
});

let failed = 0;

for (const {name, fn} of cases) {
    try {
        fn();
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

console.log(`\nAll ${cases.length} AI chat error-details checks passed.`);
