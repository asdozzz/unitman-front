/**
 * Реестр AI-инструментов, построенный из снимка OpenAPI.
 *
 * Единственный источник истины — `openapi/unitman.json`. Ни список эндпоинтов,
 * ни роли, ни зависимости не задаются в TypeScript: операция попадает в реестр
 * только благодаря `x-ai-enabled: true`, а доступ и связи описываются
 * расширениями `x-ai-roles` / `x-ai-deps`.
 *
 * `$ref` разворачиваются на этапе сборки скриптом
 * [`scripts/gen-ai-tools.mjs`](../../../../scripts/gen-ai-tools.mjs); браузер
 * импортирует готовый манифест
 * [`generated/openapi.tools.json`](../generated/openapi.tools.json). Поэтому
 * Node-парсер спецификации (и его `Buffer`) в клиентский бандл не попадает.
 *
 * Все вспомогательные функции экспортированы отдельно, чтобы их можно было
 * проверять юнит-тестами без сети и без Pinia.
 */

import Fuse from 'fuse.js';
import toolsManifest from '../generated/openapi.tools.json';
import {useAuthStore} from '@/modules/account/store/auth';
import type {
    ArgMapping,
    HttpMethod,
    JsonSchema,
    LlmToolDefinition,
    OpenApiToolMeta,
    OpenApiToolSearchResult,
    SearchApiEndpointsResult,
} from '@/modules/ai-chat/model/types';

/* -------------------------------------------------------------------------- */
/* Внутренние типы OpenAPI-документа                                          */
/* -------------------------------------------------------------------------- */

interface OpenApiParameter {
    name?: string;
    in?: string;
    required?: boolean;
    description?: string;
    schema?: unknown;
}

interface OpenApiMediaType {
    schema?: unknown;
}

interface OpenApiRequestBody {
    required?: boolean;
    content?: Record<string, OpenApiMediaType>;
}

interface OpenApiOperation {
    operationId?: string;
    summary?: string;
    description?: string;
    tags?: unknown;
    parameters?: OpenApiParameter[];
    requestBody?: OpenApiRequestBody;
    [extension: string]: unknown;
}

interface OpenApiPathItem {
    parameters?: OpenApiParameter[];
    get?: OpenApiOperation;
    post?: OpenApiOperation;
    put?: OpenApiOperation;
    patch?: OpenApiOperation;
    delete?: OpenApiOperation;
}

export interface OpenApiDocument {
    openapi?: string;
    paths?: Record<string, OpenApiPathItem>;
}

interface CollectedOperation {
    operationId: string;
    method: HttpMethod;
    path: string;
    operation: OpenApiOperation;
    pathItem: OpenApiPathItem;
}

/* -------------------------------------------------------------------------- */
/* Константы                                                                  */
/* -------------------------------------------------------------------------- */

/** HTTP-методы OpenAPI, которые поддерживает исполнитель. */
const HTTP_METHODS: readonly HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete'];

/** Допустимый формат имени инструмента для LLM. */
export const TOOL_NAME_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** Максимальная длина имени, выведенного из `operationId` (с запасом под хеш). */
const MAX_DERIVED_TOOL_NAME_LENGTH = 55;

/** Максимальная глубина схемы, передаваемой LLM. */
const MAX_SCHEMA_DEPTH = 4;

/** Мета-инструмент поиска, всегда доступный модели. */
export const META_SEARCH_TOOL: LlmToolDefinition = {
    type: 'function',
    function: {
        name: 'search_api_endpoints',
        description: 'Find API endpoints that can perform an operation. Use short business terms.',
        parameters: {
            type: 'object',
            properties: {
                query: {type: 'string'},
            },
            required: ['query'],
            additionalProperties: false,
        },
    },
};

/* -------------------------------------------------------------------------- */
/* Загрузка манифеста                                                        */
/* -------------------------------------------------------------------------- */

let documentPromise: Promise<OpenApiDocument> | null = null;

/**
 * Отдаёт манифест AI-инструментов, сгенерированный на этапе сборки.
 *
 * В манифесте уже развёрнуты `$ref` и оставлены только операции с
 * `x-ai-enabled: true`, поэтому в браузере не нужен ни Node-парсер, ни его
 * зависимости. Документ импортируется как JSON-модуль и разделяется между
 * всеми потребителями, поэтому отдаём его клон: вызывающий код не должен
 * случайно мутировать общий модуль.
 *
 * Промис кешируется на процесс — ровно как раньше, чтобы сигнатура и поведение
 * `loadOpenApiDocument()` не менялись.
 */
export function loadOpenApiDocument(): Promise<OpenApiDocument> {
    if (!documentPromise) {
        const clone = JSON.parse(JSON.stringify(toolsManifest)) as unknown;

        documentPromise = Promise.resolve(clone as OpenApiDocument);
    }

    return documentPromise;
}

/* -------------------------------------------------------------------------- */
/* Чистые вспомогательные функции                                             */
/* -------------------------------------------------------------------------- */

export function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
    return typeof value === 'string';
}

/** Читает массив строк, игнорируя любые некорректные элементы. */
export function readStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter(isString);
}

/** Детерминированный 32-битный FNV-1a хеш в виде 8 hex-символов. */
export function stableHash(value: string): string {
    let hash = 0x811c9dc5;

    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }

    return hash.toString(16).padStart(8, '0');
}

/**
 * Выводит имя инструмента.
 *
 * Приоритет у `x-ai-name`; если он отсутствует или невалиден, `operationId`
 * нормализуется до `[A-Za-z0-9_]`, а при превышении лимита обрезается с
 * добавлением стабильного хеша. Итог всегда соответствует
 * `^[A-Za-z0-9_-]{1,64}$`, иначе возвращается `null` (операция пропускается).
 */
export function deriveToolName(operationId: string, preferredName?: unknown): string | null {
    if (typeof preferredName === 'string') {
        const trimmed = preferredName.trim();

        if (TOOL_NAME_PATTERN.test(trimmed)) {
            return trimmed;
        }
    }

    const sanitized = operationId
        .replace(/[^A-Za-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');

    if (sanitized === '') {
        return null;
    }

    if (sanitized.length <= MAX_DERIVED_TOOL_NAME_LENGTH) {
        return sanitized;
    }

    const hash = stableHash(operationId);
    const prefixLength = MAX_DERIVED_TOOL_NAME_LENGTH - hash.length - 1;

    return `${sanitized.slice(0, prefixLength)}_${hash}`;
}

/** Нормализует роль для сравнения: пробелы и регистр не должны влиять. */
export function normalizeRole(role: string): string {
    return role.trim().toUpperCase();
}

/**
 * Проверка доступа по ролям с семантикой any-of.
 *
 * Пустой список требуемых ролей означает «доступно любому авторизованному
 * пользователю». `ROLE_ADMIN` сравнивается с ролями из `auth.ts` без
 * специальных исключений.
 */
export function hasRoleAccess(
    requiredRoles: readonly string[],
    userRoles: readonly string[],
): boolean {
    if (requiredRoles.length === 0) {
        return true;
    }

    const available = new Set(userRoles.map(normalizeRole));

    return requiredRoles.some((role) => available.has(normalizeRole(role)));
}

function normalizeSchemaType(value: unknown): string | undefined {
    if (typeof value === 'string') {
        return value === 'null' ? undefined : value;
    }

    if (Array.isArray(value)) {
        const first = value.find((item): item is string => typeof item === 'string' && item !== 'null');

        return first;
    }

    return undefined;
}

function mergeSchemaFragments(base: JsonSchema, extra: JsonSchema): JsonSchema {
    const result: JsonSchema = {...base};

    if (typeof extra.type === 'string') {
        result.type = extra.type;
    }

    if (typeof extra.description === 'string') {
        result.description = extra.description;
    }

    if (Array.isArray(extra.enum)) {
        result.enum = [...extra.enum];
    }

    if (isPlainObject(extra.properties)) {
        const baseProperties = isPlainObject(result.properties) ? result.properties : {};

        result.properties = {...baseProperties, ...extra.properties};
    }

    if (extra.items !== undefined) {
        result.items = extra.items;
    }

    if (Array.isArray(extra.required)) {
        const merged = new Set<string>([
            ...(Array.isArray(result.required) ? result.required.filter(isString) : []),
            ...extra.required.filter(isString),
        ]);

        if (merged.size > 0) {
            result.required = [...merged];
        }
    }

    if (!result.type && isPlainObject(result.properties)) {
        result.type = 'object';
    } else if (!result.type && result.items !== undefined) {
        result.type = 'array';
    }

    if (Array.isArray(result.required) && isPlainObject(result.properties)) {
        const properties = result.properties;
        const filtered = result.required
            .filter(isString)
            .filter((name) => Object.prototype.hasOwnProperty.call(properties, name));

        if (filtered.length > 0) {
            result.required = filtered;
        } else {
            delete result.required;
        }
    }

    return enforceSchemaConsistency(result);
}

/**
 * Убирает ключи, несовместимые с итоговым `type`: strict-схемы инструментов
 * не должны получать `properties`/`required` у строки или `items` у объекта.
 */
function enforceSchemaConsistency(schema: JsonSchema): JsonSchema {
    if (typeof schema.type === 'string' && schema.type !== 'object') {
        delete schema.properties;
        delete schema.required;
    }

    if (typeof schema.type === 'string' && schema.type !== 'array') {
        delete schema.items;
    }

    return schema;
}

function sanitizeOwnSchema(
    source: JsonSchema,
    depth: number,
    seen: WeakSet<object>,
): JsonSchema {
    const result: JsonSchema = {};
    const type = normalizeSchemaType(source.type);

    if (type) {
        result.type = type;
    }

    if (typeof source.description === 'string') {
        result.description = source.description;
    }

    if (Array.isArray(source.enum)) {
        result.enum = [...source.enum];
    }

    if (isPlainObject(source.properties)) {
        const properties: JsonSchema = {};

        for (const [name, propertySchema] of Object.entries(source.properties)) {
            properties[name] = sanitizeJsonSchema(propertySchema, depth + 1, seen);
        }

        if (Object.keys(properties).length > 0) {
            result.properties = properties;
        }
    }

    if (source.items !== undefined && !Array.isArray(source.items)) {
        result.items = sanitizeJsonSchema(source.items, depth + 1, seen);
    }

    if (!result.type) {
        if (isPlainObject(result.properties)) {
            result.type = 'object';
        } else if (result.items !== undefined) {
            result.type = 'array';
        }
    }

    if (Array.isArray(source.required)) {
        const required = source.required.filter(isString);
        const filtered = isPlainObject(result.properties)
            ? required.filter((name) => Object.prototype.hasOwnProperty.call(result.properties, name))
            : required;

        if (filtered.length > 0) {
            result.required = filtered;
        }
    }

    return enforceSchemaConsistency(result);
}

/**
 * Приводит JSON Schema из OpenAPI к виду, пригодному для strict-инструментов
 * LLM.
 *
 * Разрешён только безопасный набор ключей: `type`, `description`, `enum`,
 * `properties`, `items`, `required`. `nullable`, `example`, `x-*`, `$ref`
 * и прочие расширения отбрасываются. `oneOf`/`anyOf` сворачиваются в первый
 * непустой вариант, `allOf` — объединяется. Глубина ограничена, циклы
 * отслеживаются через `WeakSet` (с удалением после выхода, чтобы общие
 * подсхемы не превращались в пустые).
 */
export function sanitizeJsonSchema(
    input: unknown,
    depth = 0,
    seen = new WeakSet<object>(),
): JsonSchema {
    if (depth > MAX_SCHEMA_DEPTH || !isPlainObject(input)) {
        return {};
    }

    const source = input as JsonSchema;

    if (seen.has(source)) {
        return {};
    }

    seen.add(source);

    try {
        const branches = Array.isArray(source.oneOf)
            ? source.oneOf
            : (Array.isArray(source.anyOf) ? source.anyOf : null);

        if (branches && branches.length > 0) {
            const own = sanitizeOwnSchema(source, depth, seen);

            for (const branch of branches) {
                const sanitizedBranch = sanitizeJsonSchema(branch, depth, seen);

                if (Object.keys(sanitizedBranch).length > 0) {
                    return mergeSchemaFragments(own, sanitizedBranch);
                }
            }

            return own;
        }

        if (Array.isArray(source.allOf) && source.allOf.length > 0) {
            let merged: JsonSchema = {};

            for (const branch of source.allOf) {
                merged = mergeSchemaFragments(merged, sanitizeJsonSchema(branch, depth, seen));
            }

            return mergeSchemaFragments(merged, sanitizeOwnSchema(source, depth, seen));
        }

        return sanitizeOwnSchema(source, depth, seen);
    } finally {
        seen.delete(source);
    }
}

/**
 * Описание инструмента для LLM: краткое summary, уточняющее description,
 * теги и HTTP-подпись.
 */
export function formatToolDescription(
    meta: Pick<OpenApiToolMeta, 'summary' | 'description' | 'tags' | 'method' | 'path'>,
): string {
    const parts: string[] = [];

    if (meta.summary !== '') {
        parts.push(meta.summary);
    }

    if (meta.description !== '' && meta.description !== meta.summary) {
        parts.push(meta.description);
    }

    if (meta.tags.length > 0) {
        parts.push(`Tags: ${meta.tags.join(', ')}.`);
    }

    parts.push(`HTTP ${meta.method.toUpperCase()} ${meta.path}.`);

    return parts.join(' ').trim();
}

/** Собирает LLM-определение инструмента из метаданных операции. */
export function toLlmToolDefinition(meta: OpenApiToolMeta): LlmToolDefinition {
    return {
        type: 'function',
        function: {
            name: meta.toolName,
            description: formatToolDescription(meta),
            parameters: meta.inputSchema,
        },
    };
}

function uniqueArgName(base: string, existing: readonly ArgMapping[]): string {
    const used = new Set(existing.map((arg) => arg.argName));
    let candidate = base;
    let suffix = 2;

    while (used.has(candidate)) {
        candidate = `${base}_${suffix}`;
        suffix += 1;
    }

    return candidate;
}

function uniqueBodyArgName(base: string, existing: readonly ArgMapping[]): string {
    const used = new Set(existing.map((arg) => arg.argName));

    if (!used.has(base)) {
        return base;
    }

    let candidate = `${base}_body`;
    let suffix = 2;

    while (used.has(candidate)) {
        candidate = `${base}_body${suffix}`;
        suffix += 1;
    }

    return candidate;
}

function withDescription(schema: JsonSchema, description: unknown): JsonSchema {
    if (typeof description !== 'string' || description === '' || typeof schema.description === 'string') {
        return schema;
    }

    return {...schema, description};
}

function mergeParameters(
    pathParameters: OpenApiParameter[] | undefined,
    operationParameters: OpenApiParameter[] | undefined,
): OpenApiParameter[] {
    const merged = new Map<string, OpenApiParameter>();

    for (const parameter of [...(pathParameters ?? []), ...(operationParameters ?? [])]) {
        if (!isPlainObject(parameter) || typeof parameter.name !== 'string') {
            continue;
        }

        merged.set(`${parameter.in ?? ''}:${parameter.name}`, parameter);
    }

    return [...merged.values()];
}

function readJsonBodySchema(requestBody: unknown): unknown {
    if (!isPlainObject(requestBody)) {
        return null;
    }

    const content = requestBody.content;

    if (!isPlainObject(content)) {
        return null;
    }

    const preferred = content['application/json'];
    const media = isPlainObject(preferred) ? preferred : Object.values(content).find(isPlainObject);

    if (!isPlainObject(media)) {
        return null;
    }

    return media.schema ?? null;
}

function buildOperationMeta(collected: CollectedOperation): OpenApiToolMeta | null {
    const {operation, method, path, operationId} = collected;
    const toolName = deriveToolName(operationId, operation['x-ai-name']);

    if (toolName === null) {
        return null;
    }

    const summary = typeof operation.summary === 'string' ? operation.summary : '';
    const description = typeof operation.description === 'string' ? operation.description : '';
    const tags = readStringArray(operation.tags);
    const roles = readStringArray(operation['x-ai-roles']);
    const deps = readStringArray(operation['x-ai-deps']);
    const confirm = operation['x-ai-confirm'] === true;

    const args: ArgMapping[] = [];
    const properties: JsonSchema = {};
    const required = new Set<string>();

    for (const parameter of mergeParameters(collected.pathItem.parameters, operation.parameters)) {
        const location = parameter.in;

        if (location !== 'path' && location !== 'query') {
            continue;
        }

        if (typeof parameter.name !== 'string' || parameter.name === '') {
            continue;
        }

        const argName = uniqueArgName(parameter.name, args);
        const schema = withDescription(
            sanitizeJsonSchema(parameter.schema),
            parameter.description,
        );
        const isRequired = parameter.required === true;

        properties[argName] = schema;
        args.push({
            argName,
            sourceName: parameter.name,
            location,
            required: isRequired,
        });

        if (isRequired) {
            required.add(argName);
        }
    }

    const bodySchema = readJsonBodySchema(operation.requestBody);

    if (bodySchema !== null) {
        const sanitizedBody = sanitizeJsonSchema(bodySchema);
        const isFlattenable = sanitizedBody.type === 'object'
            && isPlainObject(sanitizedBody.properties)
            && Object.keys(sanitizedBody.properties).length > 0;

        if (isFlattenable && isPlainObject(sanitizedBody.properties)) {
            const bodyRequired = new Set(
                Array.isArray(sanitizedBody.required) ? sanitizedBody.required.filter(isString) : [],
            );

            for (const [propertyName, propertySchema] of Object.entries(sanitizedBody.properties)) {
                const argName = uniqueBodyArgName(propertyName, args);
                const isRequired = bodyRequired.has(propertyName);

                properties[argName] = propertySchema;
                args.push({
                    argName,
                    sourceName: propertyName,
                    location: 'body',
                    required: isRequired,
                });

                if (isRequired) {
                    required.add(argName);
                }
            }
        } else {
            const argName = uniqueBodyArgName('body', args);
            const isRequired = isPlainObject(operation.requestBody)
                && operation.requestBody.required === true;

            properties[argName] = sanitizedBody;
            args.push({
                argName,
                sourceName: '',
                location: 'body',
                required: isRequired,
            });

            if (isRequired) {
                required.add(argName);
            }
        }
    }

    const inputSchema: JsonSchema = {
        type: 'object',
        properties,
    };

    if (required.size > 0) {
        inputSchema.required = [...required];
    }

    return {
        operationId,
        toolName,
        method,
        path,
        summary,
        description,
        tags,
        confirm,
        roles,
        deps,
        args,
        inputSchema,
    };
}

function collectAiOperations(document: OpenApiDocument): CollectedOperation[] {
    const collected: CollectedOperation[] = [];

    if (!isPlainObject(document.paths)) {
        return collected;
    }

    for (const [path, rawPathItem] of Object.entries(document.paths)) {
        if (!isPlainObject(rawPathItem)) {
            continue;
        }

        const pathItem = rawPathItem as OpenApiPathItem;

        for (const method of HTTP_METHODS) {
            const rawOperation = pathItem[method];

            if (!isPlainObject(rawOperation)) {
                continue;
            }

            const operation = rawOperation as OpenApiOperation;

            if (operation['x-ai-enabled'] !== true) {
                continue;
            }

            if (typeof operation.operationId !== 'string' || operation.operationId === '') {
                continue;
            }

            collected.push({
                operationId: operation.operationId,
                method,
                path,
                operation,
                pathItem,
            });
        }
    }

    return collected;
}

function toSearchResult(meta: OpenApiToolMeta): OpenApiToolSearchResult {
    return {
        toolName: meta.toolName,
        operationId: meta.operationId,
        method: meta.method,
        path: meta.path,
        summary: meta.summary,
        description: meta.description,
        tags: [...meta.tags],
    };
}

/** Роли по умолчанию берутся из JWT текущего пользователя (`auth.ts`). */
function defaultRolesProvider(): string[] {
    try {
        return useAuthStore().getRoles;
    } catch {
        // Pinia ещё не инициализирована (например, ранний вызов в тестах).
        return [];
    }
}

/* -------------------------------------------------------------------------- */
/* Реестр                                                                     */
/* -------------------------------------------------------------------------- */

export class OpenApiToolRegistry {
    private readonly rolesProvider: () => string[];

    private readonly metaByOperationId = new Map<string, OpenApiToolMeta>();
    private readonly metaByToolName = new Map<string, OpenApiToolMeta>();
    private readonly activeOperationIds = new Set<string>();

    private visibleMetas: OpenApiToolMeta[] = [];
    private fuse: Fuse<OpenApiToolMeta> | null = null;
    private userRoles: string[] = [];
    private ready = false;
    private initialization: Promise<void> | null = null;

    constructor(rolesProvider: () => string[] = defaultRolesProvider) {
        this.rolesProvider = rolesProvider;
    }

    get isReady(): boolean {
        return this.ready;
    }

    /**
     * Загружает и разворачивает снимок, строит метаданные всех AI-операций.
     * Идемпотентно; параллельные вызовы используют один промис.
     */
    initialize(): Promise<void> {
        if (this.initialization === null) {
            this.initialization = this.doInitialize().catch((error: unknown) => {
                this.initialization = null;
                throw error;
            });
        }

        return this.initialization;
    }

    private async doInitialize(): Promise<void> {
        if (this.ready) {
            return;
        }

        const document = await loadOpenApiDocument();

        for (const collected of collectAiOperations(document)) {
            const meta = buildOperationMeta(collected);

            if (meta === null) {
                console.warn(
                    `[OpenApiToolRegistry] Пропущена операция ${collected.operationId}: `
                    + 'не удалось построить корректное имя инструмента.',
                );
                continue;
            }

            if (this.metaByOperationId.has(meta.operationId)) {
                continue;
            }

            if (this.metaByToolName.has(meta.toolName)) {
                console.warn(
                    `[OpenApiToolRegistry] Пропущена операция ${meta.operationId}: `
                    + `имя инструмента "${meta.toolName}" уже занято.`,
                );
                continue;
            }

            this.metaByOperationId.set(meta.operationId, meta);
            this.metaByToolName.set(meta.toolName, meta);
        }

        this.ready = true;
        // Индексы ролей и Fuse строятся только после заполнения карт операций.
        this.refreshRoles();
    }

    /**
     * Перечитывает роли пользователя и перестраивает Fuse-индекс.
     *
     * Вызывается после логина/смены пользователя, если реестр живёт дольше
     * одной сессии.
     */
    refreshRoles(): void {
        this.userRoles = this.readRoles();
        this.visibleMetas = [...this.metaByOperationId.values()]
            .filter((meta) => hasRoleAccess(meta.roles, this.userRoles))
            .sort((left, right) => left.toolName.localeCompare(right.toolName));

        this.fuse = new Fuse<OpenApiToolMeta>(this.visibleMetas, {
            keys: [
                {name: 'summary', weight: 0.5},
                {name: 'tags', weight: 0.3},
                {name: 'description', weight: 0.2},
            ],
            includeScore: true,
            threshold: 0.4,
            ignoreLocation: true,
            minMatchCharLength: 2,
        });

        // Инструменты, ставшие недоступными, не должны оставаться активными.
        for (const operationId of [...this.activeOperationIds]) {
            const meta = this.metaByOperationId.get(operationId);

            if (!meta || !hasRoleAccess(meta.roles, this.userRoles)) {
                this.activeOperationIds.delete(operationId);
            }
        }
    }

    private readRoles(): string[] {
        try {
            return this.rolesProvider();
        } catch {
            return [];
        }
    }

    /** Все операции, доступные текущему пользователю (без учёта активации). */
    getVisibleTools(): OpenApiToolMeta[] {
        return [...this.visibleMetas];
    }

    /** Активные операции текущей сессии диалога. */
    getActiveTools(): OpenApiToolMeta[] {
        return [...this.activeOperationIds]
            .map((operationId) => this.metaByOperationId.get(operationId))
            .filter((meta): meta is OpenApiToolMeta => meta !== undefined)
            .filter((meta) => hasRoleAccess(meta.roles, this.userRoles));
    }

    /**
     * Инструменты для отправки в LLM: мета-поиск плюс активные операции сессии.
     * Порядок детерминирован порядком активации.
     */
    getTools(): LlmToolDefinition[] {
        const tools: LlmToolDefinition[] = [META_SEARCH_TOOL];

        for (const meta of this.getActiveTools()) {
            tools.push(toLlmToolDefinition(meta));
        }

        return tools;
    }

    /** Поиск по доступным операциям (summary / tags / description). */
    search(query: string, limit = 5): OpenApiToolSearchResult[] {
        const trimmed = query.trim();

        if (!this.ready || trimmed === '' || this.fuse === null) {
            return [];
        }

        const normalizedLimit = Math.max(1, Math.floor(limit));

        return this.fuse.search(trimmed, {limit: normalizedLimit})
            .map((result) => toSearchResult(result.item));
    }

    /**
     * Реализация `search_api_endpoints`: ищет операции и активирует их вместе
     * со всеми рекурсивными зависимостями.
     */
    searchAndActivate(query: string, limit = 5): SearchApiEndpointsResult {
        const results = this.search(query, limit);

        for (const result of results) {
            this.activate(result.operationId);
        }

        return {
            ok: true,
            results,
        };
    }

    /**
     * Рекурсивно активирует операцию и её `x-ai-deps`.
     *
     * `visited` защищает от циклов. Отсутствующая, выключенная или запрещённая
     * по роли зависимость пропускается с предупреждением и не попадает в
     * список инструментов.
     */
    activate(operationId: string, visited: Set<string> = new Set<string>()): boolean {
        if (visited.has(operationId)) {
            return false;
        }

        visited.add(operationId);

        const meta = this.metaByOperationId.get(operationId);

        if (!meta) {
            console.warn(
                `[OpenApiToolRegistry] Зависимость ${operationId} отсутствует `
                + 'или не помечена x-ai-enabled.',
            );
            return false;
        }

        if (!hasRoleAccess(meta.roles, this.userRoles)) {
            console.warn(
                `[OpenApiToolRegistry] Операция ${operationId} недоступна текущим ролям.`,
            );
            return false;
        }

        this.activeOperationIds.add(operationId);

        for (const dependency of meta.deps) {
            this.activate(dependency, visited);
        }

        return true;
    }

    /** Метаданные по имени инструмента; недоступные ролям операции не отдаются. */
    resolveTool(toolName: string): OpenApiToolMeta | null {
        const meta = this.metaByToolName.get(toolName);

        if (!meta || !hasRoleAccess(meta.roles, this.userRoles)) {
            return null;
        }

        return meta;
    }

    /** LLM-определение по имени инструмента или `operationId`. */
    getToolDefinition(toolNameOrOperationId: string): LlmToolDefinition | null {
        const meta = this.metaByToolName.get(toolNameOrOperationId)
            ?? this.metaByOperationId.get(toolNameOrOperationId);

        if (!meta || !hasRoleAccess(meta.roles, this.userRoles)) {
            return null;
        }

        return toLlmToolDefinition(meta);
    }

    /** Сбрасывает активный набор инструментов для нового диалога. */
    resetSession(): void {
        this.activeOperationIds.clear();
    }
}

/** Общий экземпляр для приложения; для отдельной сессии можно создать свой. */
export const openApiToolRegistry = new OpenApiToolRegistry();

export default openApiToolRegistry;
