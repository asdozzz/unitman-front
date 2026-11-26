#!/usr/bin/env node
/**
 * Генерирует компактный манифест AI-инструментов из снимка OpenAPI.
 *
 * Зачем это нужно: `@apidevtools/swagger-parser` (и его `json-schema-ref-parser`)
 * рассчитаны на Node и обращаются к глобальному `Buffer`, которого в браузере
 * нет. Поэтому вызов `SwaggerParser.dereference()` в рантайме падал с
 * «Buffer is not defined» ещё до HTTP-запроса к `/api/ai/chat`.
 *
 * Решение: разворачиваем `$ref` здесь, на этапе сборки в Node, оставляем в
 * манифесте только операции с `x-ai-enabled: true` и пишем JSON, который
 * браузерный реестр импортирует как обычный модуль.
 *
 * Использование:
 *   node scripts/gen-ai-tools.mjs           # записать манифест
 *   node scripts/gen-ai-tools.mjs --check   # проверить актуальность, ничего не писать
 */

import {mkdir, readFile, writeFile} from 'node:fs/promises';
import Module, {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);

const SWAGGER_PARSER_ID = '@apidevtools/swagger-parser';
const REF_PARSER_ID = '@apidevtools/json-schema-ref-parser';

/**
 * Загружает `@apidevtools/swagger-parser`.
 *
 * `swagger-parser` 13.x — CommonJS-пакет, который синхронно вызывает
 * `require('@apidevtools/json-schema-ref-parser')`, а установленная версия
 * последнего (16.x) — ESM-only. Node 20 ещё не умеет `require()` ESM, поэтому
 * прямой импорт падает с `ERR_REQUIRE_ESM`.
 *
 * Чтобы не менять версии зависимостей, предзагружаем ESM-модуль через
 * `import()` и подставляем его в `Module._load` только на время загрузки
 * `swagger-parser`. На Node 22+ тот же код работает без изменений.
 */
async function loadSwaggerParser() {
    const refParser = await import(REF_PARSER_ID);
    const originalLoad = Module._load;

    if (typeof originalLoad !== 'function') {
        return require(SWAGGER_PARSER_ID);
    }

    Module._load = function patchedLoad(request, parent, isMain) {
        if (request === REF_PARSER_ID) {
            return refParser;
        }

        return originalLoad.call(this, request, parent, isMain);
    };

    try {
        return require(SWAGGER_PARSER_ID);
    } finally {
        Module._load = originalLoad;
    }
}

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(SCRIPT_DIR, '..');
const SOURCE_PATH = path.resolve(FRONTEND_DIR, 'openapi/unitman.json');
const OUTPUT_PATH = path.resolve(
    FRONTEND_DIR,
    'src/modules/ai-chat/generated/openapi.tools.json',
);
const RELATIVE_OUTPUT_PATH = path.relative(FRONTEND_DIR, OUTPUT_PATH);
const RELATIVE_SOURCE_PATH = path.relative(FRONTEND_DIR, SOURCE_PATH);

/** HTTP-методы OpenAPI в фиксированном порядке — для детерминированного вывода. */
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

/**
 * Внутренние эндпоинты бэкенда (`/api/internal/**`) никогда не должны попадать
 * в манифест AI-инструментов: они предназначены для раннера/служебных
 * компонентов и обходят публичную авторизацию. Даже если на такой операции
 * случайно окажется `x-ai-enabled: true`, путь исключается безусловно.
 */
function isInternalPath(pathKey) {
    return pathKey === '/api/internal' || pathKey.startsWith('/api/internal/');
}

/**
 * Ключи операции, которые нужны браузерному реестру и описанию инструмента.
 * Всё остальное (`responses`, `security`, `deprecated` и т.п.) отбрасывается,
 * чтобы манифест оставался компактным. Расширения `x-ai-*` копируются
 * отдельно и всегда.
 */
const OPERATION_KEYS = [
    'tags',
    'summary',
    'description',
    'operationId',
    'parameters',
    'requestBody',
];

const isPlainObject = (value) =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Replacer для `JSON.stringify`, который не падает на циклических ссылках.
 * Стек предков ведётся через `this` (holder), поэтому общие, но не циклические
 * подобъекты сериализуются повторно, а не превращаются в `"[Circular]"`.
 */
function createCircularReplacer() {
    const ancestors = [];

    return function replacer(key, value) {
        if (typeof value !== 'object' || value === null) {
            return value;
        }

        while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) {
            ancestors.pop();
        }

        if (ancestors.includes(value)) {
            return '[Circular]';
        }

        ancestors.push(value);

        return value;
    };
}

/**
 * Пересобирает операцию в стабильном порядке ключей, сохраняя нужные поля и
 * все расширения `x-ai-*`.
 */
function filterOperation(operation) {
    const result = {};

    for (const key of OPERATION_KEYS) {
        if (operation[key] !== undefined) {
            result[key] = operation[key];
        }
    }

    const extensionKeys = Object.keys(operation)
        .filter((key) => key.startsWith('x-ai-'))
        .sort();

    for (const key of extensionKeys) {
        result[key] = operation[key];
    }

    return result;
}

/** Возвращает true, если в операции есть хотя бы одно расширение `x-ai-*`. */
function hasAiExtensions(operation) {
    return Object.keys(operation).some((key) => key.startsWith('x-ai-'));
}

/**
 * Оставляет в `paths` только AI-операции. Path item сохраняется вместе с
 * шаблонными `parameters`, пустые path item'ы отбрасываются.
 */
function filterPaths(document, stats) {
    const filteredPaths = {};

    if (!isPlainObject(document.paths)) {
        return filteredPaths;
    }

    for (const pathKey of Object.keys(document.paths).sort()) {
        const pathItem = document.paths[pathKey];

        if (!isPlainObject(pathItem)) {
            continue;
        }

        // Внутренние/служебные операции не экспортируются как инструменты ни
        // при каких расширениях. Это защита в глубину к `x-ai-enabled: false`.
        if (isInternalPath(pathKey)) {
            continue;
        }

        const filteredPathItem = {};

        for (const method of HTTP_METHODS) {
            const operation = pathItem[method];

            // Явно включаем только `x-ai-enabled: true`: отсутствие флага или
            // `false` исключает операцию из манифеста.
            if (!isPlainObject(operation) || operation['x-ai-enabled'] !== true) {
                continue;
            }

            if (!hasAiExtensions(operation)) {
                continue;
            }

            filteredPathItem[method] = filterOperation(operation);
            stats.operations += 1;
        }

        if (Object.keys(filteredPathItem).length === 0) {
            continue;
        }

        if (Array.isArray(pathItem.parameters) && pathItem.parameters.length > 0) {
            filteredPathItem.parameters = pathItem.parameters;
        }

        filteredPaths[pathKey] = filteredPathItem;
        stats.paths += 1;
    }

    return filteredPaths;
}

async function readSourceDocument() {
    let raw;

    try {
        raw = await readFile(SOURCE_PATH, 'utf8');
    } catch (error) {
        if (error && error.code === 'ENOENT') {
            throw new Error(
                `Не найден исходный снимок OpenAPI: ${path.relative(FRONTEND_DIR, SOURCE_PATH)}. `
                + 'Скопируйте docs/openapi.json из бэкенда в openapi/unitman.json.',
            );
        }

        throw error;
    }

    try {
        return JSON.parse(raw);
    } catch (error) {
        throw new Error(
            `Не удалось разобрать ${path.relative(FRONTEND_DIR, SOURCE_PATH)} как JSON: ${error.message}`,
        );
    }
}

async function buildManifest() {
    const SwaggerParser = await loadSwaggerParser();
    const sourceDocument = await readSourceDocument();

    // Парсим JSON сами, поэтому file/http-резолвинг заведомо не понадобится и
    // не сможет сходить в сеть или на диск.
    const dereferenced = await SwaggerParser.dereference(sourceDocument, {
        resolve: {file: false, http: false},
        dereference: {circular: 'ignore'},
    });

    if (!isPlainObject(dereferenced)) {
        throw new Error(
            `SwaggerParser.dereference() вернул не объект для ${RELATIVE_SOURCE_PATH}. `
            + 'Проверьте корректность снимка OpenAPI и повторите запуск.',
        );
    }

    const document = dereferenced;
    const stats = {paths: 0, operations: 0};
    const paths = filterPaths(document, stats);
    const manifest = {
        openapi: document.openapi ?? sourceDocument.openapi,
        paths,
    };

    if (stats.operations === 0 || Object.keys(paths).length === 0) {
        throw new Error(
            `В снимке ${RELATIVE_SOURCE_PATH} не найдено ни одной операции с x-ai-enabled: true. `
            + 'AI-чат остался бы без инструментов и стал бы неработоспособным. '
            + 'Восстановите флаги x-ai-enabled на нужных эндпоинтах и повторите запуск.',
        );
    }

    const serialized = `${JSON.stringify(manifest, createCircularReplacer(), 2)}\n`;

    if (serialized.includes('"$ref"')) {
        throw new Error(
            `После разворота $ref в ${RELATIVE_SOURCE_PATH} остались неразрешённые ссылки. `
            + 'Компоненты отбрасываются из манифеста, поэтому висячий $ref сломал бы сборку инструментов.',
        );
    }

    return {serialized, stats};
}

async function main() {
    const checkOnly = process.argv.includes('--check');

    let manifest;

    try {
        manifest = await buildManifest();
    } catch (error) {
        console.error(`[gen-ai-tools] ${error.message}`);
        process.exit(1);
    }

    const {serialized, stats} = manifest;

    if (checkOnly) {
        let existing = null;

        try {
            existing = await readFile(OUTPUT_PATH, 'utf8');
        } catch (error) {
            if (!error || error.code !== 'ENOENT') {
                console.error(`[gen-ai-tools] Не удалось прочитать ${RELATIVE_OUTPUT_PATH}: ${error.message}`);
                process.exit(1);
            }
        }

        if (existing === null) {
            console.error(
                `[gen-ai-tools] Файл ${RELATIVE_OUTPUT_PATH} отсутствует. `
                + 'Выполните `yarn gen:ai-tools` и закоммитьте результат.',
            );
            process.exit(1);
        }

        if (existing !== serialized) {
            console.error(
                `[gen-ai-tools] ${RELATIVE_OUTPUT_PATH} устарел. `
                + 'Выполните `yarn gen:ai-tools` и закоммитьте обновлённый манифест.',
            );
            process.exit(1);
        }

        console.log(
            `[gen-ai-tools] ${RELATIVE_OUTPUT_PATH} актуален: `
            + `${stats.paths} путей, ${stats.operations} операций.`,
        );
        process.exit(0);
    }

    await mkdir(path.dirname(OUTPUT_PATH), {recursive: true});
    await writeFile(OUTPUT_PATH, serialized, 'utf8');

    console.log(
        `[gen-ai-tools] Записано ${RELATIVE_OUTPUT_PATH}: `
        + `${stats.paths} путей, ${stats.operations} операций.`,
    );
}

await main();
