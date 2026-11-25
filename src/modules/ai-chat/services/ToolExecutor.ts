/**
 * Исполнитель AI-инструментов, сгенерированных из OpenAPI.
 *
 * Задачи класса:
 * 1. Обработать мета-инструмент `search_api_endpoints` через реестр.
 * 2. Разложить аргументы LLM по `ArgMapping.location` (`path`/`query`/`body`),
 *    учитывая исходные имена (`sourceName`).
 * 3. Выполнить HTTP-вызов через стандартный авторизованный клиент
 *    (`apiClient.requestRaw`), чтобы JWT подставлялся так же, как в остальном
 *    приложении, а статус и тело ответа сохранялись.
 * 4. Обрезать результат до безопасного размера перед возвратом в LLM.
 *
 * Класс НЕ содержит списков эндпоинтов, ролей или специальных случаев для
 * конкретных операций: единственный источник истины — метаданные реестра.
 * Класс также НЕ запрашивает подтверждение у пользователя: он лишь сообщает
 * (через результат `confirmation_required` и метод `requiresConfirmation`),
 * что подтверждение требуется, а сам диалог с пользователем ведёт composable.
 */

import apiClient from '@/bootstrap/apiClient';
import {isPlainObject, openApiToolRegistry} from '@/modules/ai-chat/services/OpenApiToolRegistry';
import type {
    ArgMapping,
    OpenApiToolMeta,
    ToolExecutionErrorKind,
    ToolExecutionResult,
} from '@/modules/ai-chat/model/types';

/* -------------------------------------------------------------------------- */
/* Константы                                                                  */
/* -------------------------------------------------------------------------- */

/** Имя мета-инструмента поиска (совпадает с `META_SEARCH_TOOL`). */
export const SEARCH_TOOL_NAME = 'search_api_endpoints';

/**
 * Максимальная длина содержимого tool-сообщения в символах (~20 КБ).
 *
 * Это верхняя граница того, что вообще попадает в диалог: даже если операция
 * вернула мегабайт JSON, модель увидит не больше этого объёма плюс короткое
 * уведомление об обрезке. Значение соответствует плану (~20 КБ) и не даёт
 * одному шагу переполнить контекст модели.
 */
export const MAX_TOOL_RESULT_CHARS = 20_000;

/** Сколько элементов массива сохраняется перед сворачиванием остальных. */
export const MAX_TOOL_RESULT_ARRAY_ITEMS = 50;

/** Максимальная глубина рекурсивного сворачивания массивов. */
const MAX_FOLD_DEPTH = 6;

/** Маркер в теле ответа, по которому модель понимает, что данные обрезаны. */
const TRUNCATION_NOTICE =
    'Tool result truncated: the payload exceeded the size limit. '
    + 'Only part of the data is shown. Narrow the request if you need the rest.';

/** Запас символов под служебный конверт при обрезке. */
const TRUNCATION_ENVELOPE_RESERVE = 512;

/* -------------------------------------------------------------------------- */
/* Обрезка и сериализация                                                     */
/* -------------------------------------------------------------------------- */

/** Безопасная JSON-сериализация: никогда не выбрасывает исключение. */
function safeJsonStringify(value: unknown): string {
    try {
        const serialized = JSON.stringify(value);

        return serialized === undefined ? 'null' : serialized;
    } catch {
        return JSON.stringify(String(value));
    }
}

/**
 * Рекурсивно сворачивает массивы длиннее лимита в объект-конверт.
 *
 * Возвращает признак того, что хотя бы один массив был свёрнут, чтобы
 * уведомление об обрезке попало в итоговое содержимое.
 */
function foldLargeArrays(
    value: unknown,
    depth: number,
): {value: unknown; folded: boolean} {
    if (Array.isArray(value)) {
        let folded = false;
        const items: unknown[] = [];

        for (const item of value.slice(0, MAX_TOOL_RESULT_ARRAY_ITEMS)) {
            const processed = depth < MAX_FOLD_DEPTH
                ? foldLargeArrays(item, depth + 1)
                : {value: item, folded: false};

            items.push(processed.value);
            folded = folded || processed.folded;
        }

        if (value.length > MAX_TOOL_RESULT_ARRAY_ITEMS) {
            folded = true;

            return {
                value: {
                    truncated: true,
                    notice: TRUNCATION_NOTICE,
                    totalItems: value.length,
                    items,
                },
                folded: true,
            };
        }

        return {value: items, folded};
    }

    if (isPlainObject(value) && depth < MAX_FOLD_DEPTH) {
        let folded = false;
        const result: Record<string, unknown> = {};

        for (const [key, item] of Object.entries(value)) {
            const processed = foldLargeArrays(item, depth + 1);

            result[key] = processed.value;
            folded = folded || processed.folded;
        }

        return {value: result, folded};
    }

    return {value, folded: false};
}

interface BoundedPayload {
    /** Значение после сворачивания массивов и, при необходимости, обрезки. */
    value: unknown;
    /** Готовая строка для tool-сообщения, ограниченная по длине. */
    content: string;
    /** `true`, если применялась обрезка (размер или число элементов). */
    truncated: boolean;
}

/**
 * Приводит произвольный результат к безопасному виду.
 *
 * Сначала сворачиваются слишком длинные массивы (структура сохраняется),
 * затем проверяется длина сериализованного JSON. Если она превышает лимит,
 * вместо структуры возвращается валидный JSON-конверт с уведомлением и
 * превью, чтобы модель понимала причину неполноты.
 */
function boundPayload(value: unknown): BoundedPayload {
    const folded = foldLargeArrays(value, 0);
    const serialized = safeJsonStringify(folded.value);

    if (serialized.length <= MAX_TOOL_RESULT_CHARS) {
        return {
            value: folded.value,
            content: serialized,
            truncated: folded.folded,
        };
    }

    const previewLength = Math.max(0, MAX_TOOL_RESULT_CHARS - TRUNCATION_ENVELOPE_RESERVE);
    const envelope = {
        truncated: true,
        notice: TRUNCATION_NOTICE,
        originalLength: serialized.length,
        preview: serialized.slice(0, previewLength),
    };

    return {
        value: envelope,
        content: safeJsonStringify(envelope),
        truncated: true,
    };
}

/* -------------------------------------------------------------------------- */
/* Сборка результата                                                          */
/* -------------------------------------------------------------------------- */

function makeSuccess(status: number, data: unknown): ToolExecutionResult {
    const bounded = boundPayload(data);

    return {
        ok: true,
        status,
        data: bounded.value,
        truncated: bounded.truncated,
        content: bounded.content,
        error: null,
        errorKind: null,
    };
}

function makeFailure(
    errorKind: ToolExecutionErrorKind,
    status: number,
    error: string,
    data: unknown = null,
): ToolExecutionResult {
    const bounded = boundPayload(data);
    const envelope = {
        ok: false,
        status,
        errorKind,
        error,
        data: bounded.value,
    };

    return {
        ok: false,
        status,
        data: bounded.value,
        truncated: bounded.truncated,
        content: boundPayload(envelope).content,
        error,
        errorKind,
    };
}

/* -------------------------------------------------------------------------- */
/* Разбор аргументов                                                          */
/* -------------------------------------------------------------------------- */

/** `true`, если аргумент не передан или передан как `null`. */
function isMissingValue(value: unknown): boolean {
    return value === undefined || value === null;
}

/**
 * Значение для подстановки в путь.
 *
 * Массив склеивается через запятую (детерминированно), объект сериализуется
 * в JSON, чтобы в URL не попало `[object Object]`.
 */
function formatPathValue(value: unknown): string {
    if (Array.isArray(value)) {
        return value.map((item) => formatPathValue(item)).join(',');
    }

    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
        return String(value);
    }

    return safeJsonStringify(value);
}

/**
 * Подставляет `path`-аргументы в шаблон.
 *
 * Все вхождения `{sourceName}` заменяются (важно для повторяющихся
 * плейсхолдеров). Отсутствующий необязательный параметр даёт пустую строку,
 * а оставшиеся неразвёрнутые плейсхолдеры удаляются — путь никогда не
 * содержит литеральных фигурных скобок.
 */
function interpolatePath(
    template: string,
    mappings: readonly ArgMapping[],
    args: Record<string, unknown>,
): string {
    let path = template;

    for (const mapping of mappings) {
        if (mapping.location !== 'path' || mapping.sourceName === '') {
            continue;
        }

        const value = args[mapping.argName];
        const replacement = isMissingValue(value)
            ? ''
            : encodeURIComponent(formatPathValue(value));

        path = path.split(`{${mapping.sourceName}}`).join(replacement);
    }

    return path.replace(/\{[^}]+\}/g, '');
}

/** Значение query-параметра: массивы разворачиваются в повторяющиеся ключи. */
function formatQueryValue(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
        return String(value);
    }

    return safeJsonStringify(value);
}

/** Собирает query-аргументы в готовую строку запроса. */
function appendQuery(
    path: string,
    mappings: readonly ArgMapping[],
    args: Record<string, unknown>,
): string {
    const params = new URLSearchParams();

    for (const mapping of mappings) {
        if (mapping.location !== 'query' || mapping.sourceName === '') {
            continue;
        }

        const value = args[mapping.argName];

        if (isMissingValue(value)) {
            continue;
        }

        if (Array.isArray(value)) {
            for (const item of value) {
                if (!isMissingValue(item)) {
                    params.append(mapping.sourceName, formatQueryValue(item));
                }
            }
        } else {
            params.append(mapping.sourceName, formatQueryValue(value));
        }
    }

    const queryString = params.toString();

    if (queryString === '') {
        return path;
    }

    return path + (path.includes('?') ? '&' : '?') + queryString;
}

/**
 * Собирает тело запроса из `body`-аргументов.
 *
 * Если у операции есть единственный аргумент с пустым `sourceName`, это
 * «целое тело» — оно передаётся как есть. Иначе формируется объект, ключами
 * которого служат исходные имена (`sourceName`), а не имена аргументов LLM.
 */
function buildBody(
    mappings: readonly ArgMapping[],
    args: Record<string, unknown>,
): unknown {
    const bodyMappings = mappings.filter((mapping) => mapping.location === 'body');

    if (bodyMappings.length === 0) {
        return undefined;
    }

    const wholeBody = bodyMappings.find((mapping) => mapping.sourceName === '');

    if (wholeBody !== undefined) {
        const value = args[wholeBody.argName];

        return isMissingValue(value) ? undefined : value;
    }

    const body: Record<string, unknown> = {};
    let hasValue = false;

    for (const mapping of bodyMappings) {
        const value = args[mapping.argName];

        if (isMissingValue(value)) {
            continue;
        }

        body[mapping.sourceName] = value;
        hasValue = true;
    }

    return hasValue ? body : undefined;
}

/** Имена обязательных аргументов, которые не были переданы. */
function findMissingRequired(
    mappings: readonly ArgMapping[],
    args: Record<string, unknown>,
): string[] {
    return mappings
        .filter((mapping) => mapping.required && isMissingValue(args[mapping.argName]))
        .map((mapping) => mapping.argName);
}

/**
 * Убирает ведущий `/api` из пути снимка.
 *
 * `VITE_API_HOST` уже содержит `/api` (см. `.env.dist`), а `requestRaw`
 * добавляет путь к этому базовому адресу, поэтому `/api/project/add` должен
 * превратиться в `/project/add`, иначе получится `/api/api/project/add`.
 */
function toClientPath(snapshotPath: string): string {
    const stripped = snapshotPath.replace(/^\/api(?=\/|$)/, '');

    return stripped === '' ? '/' : stripped;
}

function describeError(error: unknown): string {
    if (error instanceof Error && error.message !== '') {
        return error.message;
    }

    return String(error);
}

/* -------------------------------------------------------------------------- */
/* Исполнитель                                                                */
/* -------------------------------------------------------------------------- */

export interface ToolExecuteOptions {
    /**
     * `true`, если пользователь уже подтвердил действие.
     *
     * Проверяется только вместе с `meta.confirm`; исполнитель сам никогда не
     * показывает диалог подтверждения.
     */
    confirmed?: boolean;
}

export class ToolExecutor {
    /**
     * Выполняет вызов инструмента.
     *
     * Никогда не выбрасывает исключения на уровне инструмента: любая проблема
     * (неизвестный инструмент, отсутствующие аргументы, HTTP- или
     * транспортная ошибка) возвращается как типизированный результат, чтобы
     * цикл агента мог передать его модели для самокоррекции.
     */
    async execute(
        toolName: string,
        args: Record<string, unknown>,
        options: ToolExecuteOptions = {},
    ): Promise<ToolExecutionResult> {
        const safeArgs = isPlainObject(args) ? args : {};

        if (toolName === SEARCH_TOOL_NAME) {
            return this.executeSearch(safeArgs);
        }

        try {
            await openApiToolRegistry.initialize();
        } catch (error) {
            return makeFailure(
                'unknown_tool',
                0,
                `The tool registry is unavailable: ${describeError(error)}`,
            );
        }

        const meta = openApiToolRegistry.resolveTool(toolName);

        if (meta === null) {
            return makeFailure(
                'unknown_tool',
                0,
                `Unknown tool "${toolName}". Call ${SEARCH_TOOL_NAME} first and use one of the returned tool names.`,
            );
        }

        if (meta.confirm && options.confirmed !== true) {
            return makeFailure(
                'confirmation_required',
                0,
                'This tool changes data and requires explicit user confirmation before execution.',
            );
        }

        const missing = findMissingRequired(meta.args, safeArgs);

        if (missing.length > 0) {
            return makeFailure(
                'invalid_arguments',
                0,
                `Missing required argument(s): ${missing.join(', ')}. Provide them and try again.`,
            );
        }

        return this.performRequest(meta, safeArgs);
    }

    /**
     * Сообщает, требует ли инструмент подтверждения пользователя.
     *
     * Используется composable, чтобы показать карточку подтверждения до
     * вызова `execute`. Мета-инструмент поиска подтверждения не требует.
     */
    requiresConfirmation(toolName: string): boolean {
        if (toolName === SEARCH_TOOL_NAME) {
            return false;
        }

        return openApiToolRegistry.resolveTool(toolName)?.confirm === true;
    }

    /** Реализация мета-инструмента поиска. */
    private async executeSearch(args: Record<string, unknown>): Promise<ToolExecutionResult> {
        const query = args.query;

        if (typeof query !== 'string' || query.trim() === '') {
            return makeFailure(
                'invalid_arguments',
                0,
                'The "query" argument must be a non-empty string.',
            );
        }

        try {
            await openApiToolRegistry.initialize();
        } catch (error) {
            return makeFailure(
                'unknown_tool',
                0,
                `The tool registry is unavailable: ${describeError(error)}`,
            );
        }

        const result = openApiToolRegistry.searchAndActivate(query.trim());

        return makeSuccess(200, result);
    }

    /** Собирает HTTP-запрос по метаданным операции и выполняет его. */
    private async performRequest(
        meta: OpenApiToolMeta,
        args: Record<string, unknown>,
    ): Promise<ToolExecutionResult> {
        const pathWithParams = interpolatePath(meta.path, meta.args, args);
        const clientPath = appendQuery(toClientPath(pathWithParams), meta.args, args);
        const body = meta.method === 'get' ? undefined : buildBody(meta.args, args);

        const raw = await apiClient.requestRaw(meta.method, clientPath, body);

        if (raw.ok) {
            return makeSuccess(raw.status, raw.data);
        }

        if (raw.status === 0) {
            return makeFailure(
                'transport_error',
                0,
                raw.error ?? 'The request did not reach the server.',
            );
        }

        return makeFailure('http_error', raw.status, raw.error ?? `HTTP ${raw.status}`);
    }
}

/** Общий экземпляр исполнителя. */
export const toolExecutor = new ToolExecutor();

export default toolExecutor;
