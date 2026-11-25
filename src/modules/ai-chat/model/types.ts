/**
 * Типы модуля AI-чата, управляющего сайтом через инструменты OpenAPI.
 *
 * Модуль не содержит захардкоженных списков эндпоинтов, ролей или правил:
 * единственный источник истины — снимок `openapi/unitman.json` и его
 * расширения `x-ai-*`.
 */

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

/** Где исполнитель должен передать аргумент инструмента. */
export type ArgLocation = 'path' | 'query' | 'body';

/**
 * Соответствие «имя аргумента для LLM» → «исходное имя в OpenAPI».
 *
 * Нужно, потому что имена аргументов могут конфликтовать (одноимённые
 * path-параметр и свойство тела) и потому что LLM видит только безопасные
 * идентификаторы.
 */
export interface ArgMapping {
    /** Имя, которое видит LLM в JSON Schema инструмента. */
    argName: string;
    /** Исходное имя параметра или свойства тела. */
    sourceName: string;
    location: ArgLocation;
    required: boolean;
}

/**
 * Метаданные операции, пригодные и для LLM-инструмента, и для исполнителя.
 *
 * Собираются только из `x-ai-enabled: true` операций снимка.
 */
export interface OpenApiToolMeta {
    operationId: string;
    /** Итоговое имя инструмента, соответствующее `^[A-Za-z0-9_-]{1,64}$`. */
    toolName: string;
    method: HttpMethod;
    /** Шаблон пути из снимка, например `/api/project/list`. */
    path: string;
    summary: string;
    description: string;
    tags: string[];
    /** Требуется ли подтверждение пользователя перед HTTP-вызовом. */
    confirm: boolean;
    /** Роли с семантикой any-of; пустой массив — доступно всем авторизованным. */
    roles: string[];
    /** `operationId` зависимостей, активируемых рекурсивно. */
    deps: string[];
    /** Маппинг аргументов инструмента на параметры/тело запроса. */
    args: ArgMapping[];
    /** Санитизированная JSON Schema аргументов (объект верхнего уровня). */
    inputSchema: Record<string, unknown>;
}

/** Определение инструмента в формате OpenAI chat-completions. */
export interface LlmToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}

/**
 * Компактный результат поиска, который возвращается LLM в ответ на вызов
 * `search_api_endpoints`.
 */
export interface OpenApiToolSearchResult {
    toolName: string;
    operationId: string;
    method: HttpMethod;
    path: string;
    summary: string;
    description: string;
    tags: string[];
}

/** Результат `searchAndActivate`: всегда успешный конверт для tool-сообщения. */
export interface SearchApiEndpointsResult {
    ok: true;
    results: OpenApiToolSearchResult[];
}

/** Произвольная JSON Schema после санитизации. */
export type JsonSchema = Record<string, unknown>;

/* -------------------------------------------------------------------------- */
/* Исполнение инструментов                                                    */
/* -------------------------------------------------------------------------- */

/** Почему выполнение инструмента завершилось неудачей. */
export type ToolExecutionErrorKind =
    | 'confirmation_required'
    | 'invalid_arguments'
    | 'unknown_tool'
    | 'http_error'
    | 'transport_error';

interface ToolExecutionResultBase {
    /** HTTP-статус ответа; `0`, если запрос не дошёл до сервера. */
    status: number;
    /** Тело результата после обрезки; `null` при отсутствии данных. */
    data: unknown;
    /** `true`, если данные были обрезаны перед отправкой в LLM. */
    truncated: boolean;
    /**
     * Готовое содержимое tool-сообщения, ограниченное по размеру.
     *
     * Это единственная строка, которую цикл агента передаёт модели, поэтому
     * её длина всегда ограничена константой `MAX_TOOL_RESULT_CHARS`.
     */
    content: string;
}

export interface ToolExecutionSuccess extends ToolExecutionResultBase {
    ok: true;
    error: null;
    errorKind: null;
}

export interface ToolExecutionFailure extends ToolExecutionResultBase {
    ok: false;
    /** Пояснение для модели (не для UI): что именно пошло не так. */
    error: string;
    errorKind: ToolExecutionErrorKind;
}

export type ToolExecutionResult = ToolExecutionSuccess | ToolExecutionFailure;

/* -------------------------------------------------------------------------- */
/* AI-чат (POST /api/ai/chat)                                                 */
/* -------------------------------------------------------------------------- */

/** Роли сообщений, которые принимает бэкенд (`AiChatRequest::ROLES`). */
export type AiChatRole = 'system' | 'user' | 'assistant' | 'tool';

/** Вызов инструмента в формате OpenAI chat-completions. */
export interface AiChatToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        /** Аргументы строкой JSON (как их присылает провайдер). */
        arguments: string;
    };
}

/** Сообщение истории в формате OpenAI chat-completions. */
export interface AiChatMessage {
    role: AiChatRole;
    content?: string | null;
    tool_calls?: AiChatToolCall[];
    tool_call_id?: string;
    name?: string;
}

/**
 * Тело запроса `POST /api/ai/chat` (поля совпадают с `AiChatRequest`).
 *
 * `tools` необязателен на уровне типа: бэкенд трактует отсутствие как пустой
 * список, а сервис при отсутствии подставляет инструменты реестра.
 */
export interface AiChatRequestPayload {
    messages: AiChatMessage[];
    tools?: LlmToolDefinition[];
    model?: string;
    credentialId?: string;
    /** Идентификатор диалога; бэкенд пересылает его как `x-opencode-session`. */
    sessionId?: string;
}

/**
 * Стабильные ключи ошибок бэкенда AI-чата.
 *
 * Это только ключи, а не готовые фразы: перевод выполняется на уровне UI
 * через `vue-i18n`. Допускаются и ключи, которых нет в списке (например, код
 * ошибки upstream-провайдера), поэтому тип расширяем строкой.
 */
export type AiChatErrorKey =
    | 'account.not_authenticated'
    | 'ai.chat.invalid_payload'
    | 'ai.chat.credential_required'
    | 'account.opencode_credential.model_not_available'
    | 'ai.chat.upstream_not_configured'
    | 'ai.chat.upstream_unavailable'
    | 'ai.chat.upstream_invalid_response'
    | 'ai.chat.upstream_error'
    | (string & {});

/** Нормализованное сообщение ассистента из ответа провайдера. */
export interface AiChatAssistantMessage {
    role: 'assistant';
    content: string | null;
    toolCalls: AiChatToolCall[];
}

/**
 * Нормализованный результат одного шага AI-чата.
 *
 * Не бросает исключений: транспортные и прикладные ошибки описываются
 * полями `ok`/`status`/`errorKey`.
 */
export interface AiChatResult {
    ok: boolean;
    /** HTTP-статус ответа бэкенда/провайдера; `0` — транспортная ошибка. */
    status: number;
    /** `finish_reason` первого выбора (`stop`, `tool_calls`, `length` и т.п.). */
    finishReason: string | null;
    /** Сообщение ассистента либо `null`, если ответ некорректен. */
    message: AiChatAssistantMessage | null;
    /** Блок `usage` upstream-ответа, если он есть. */
    usage: Record<string, unknown> | null;
    /** Стабильный ключ ошибки для перевода в UI; `null` при успехе. */
    errorKey: AiChatErrorKey | null;
    /**
     * Текст ошибки upstream-провайдера (`error.message` и родственные поля).
     *
     * Показывается пользователю в UI как есть (только плоским текстом) и не
     * переводится: это диагностическое сообщение провайдера. `null`, если
     * тело ошибки не содержит пригодной строки.
     */
    errorDetails: string | null;
}
