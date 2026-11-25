/**
 * Клиент бэкенд-прокси `POST /api/ai/chat`.
 *
 * Сервис не содержит UI-логики и не хранит состояние сессии: история
 * сообщений, модель и идентификатор реквизитов приходят в аргументах каждого
 * вызова. Ключ провайдера сюда не попадает — он расшифровывается только на
 * бэкенде.
 *
 * Все ошибки нормализуются в {@link AiChatResult}: исключения не
 * выбрасываются, а статусы `401/422/502` и прикладные ошибки upstream
 * превращаются в стабильные ключи (`errorKey`), которые UI переводит позже.
 */

import apiClient from '@/bootstrap/apiClient';
import {isPlainObject, openApiToolRegistry} from '@/modules/ai-chat/services/OpenApiToolRegistry';
import {normalizovatOshibkuChat} from '@/modules/ai-chat/services/AiChatErrorNormalizer';
import type {
    AiChatAssistantMessage,
    AiChatRequestPayload,
    AiChatResult,
    AiChatServiceResult,
    AiChatSession,
    AiChatSessionCreateRequest,
    AiChatSessionDetail,
    AiChatSessionList,
    AiChatSessionListQuery,
    AiChatToolCall,
    AiChatTurnRequest,
    AiChatTurnResult,
} from '@/modules/ai-chat/model/types';

/**
 * Путь без префикса `/api`: `VITE_API_HOST` уже содержит `/api`
 * (см. `.env.dist`), поэтому абсолютный путь снимка `/api/ai/chat` здесь
 * приводится к `/ai/chat`.
 */
export const AI_CHAT_URL = '/ai/chat';

/** Базовый путь session-эндпоинтов без префикса `/api`. */
export const AI_CHAT_SESSIONS_URL = `${AI_CHAT_URL}/sessions`;

/** Безопасная сериализация: не выбрасывает исключение на циклических данных. */
function safeJsonStringify(value: unknown): string {
    try {
        const serialized = JSON.stringify(value);

        return serialized === undefined ? '' : serialized;
    } catch {
        return '';
    }
}

/** Достаёт `finish_reason` первого выбора. */
function readFinishReason(data: unknown): string | null {
    if (!isPlainObject(data) || !Array.isArray(data.choices) || data.choices.length === 0) {
        return null;
    }

    const first = data.choices[0];

    if (!isPlainObject(first)) {
        return null;
    }

    return typeof first.finish_reason === 'string' ? first.finish_reason : null;
}

/** Нормализует `tool_calls`, отбрасывая некорректные элементы без исключений. */
function readToolCalls(value: unknown): AiChatToolCall[] {
    if (!Array.isArray(value)) {
        return [];
    }

    const calls: AiChatToolCall[] = [];

    for (const item of value) {
        if (!isPlainObject(item) || !isPlainObject(item.function)) {
            continue;
        }

        const name = item.function.name;

        if (typeof name !== 'string' || name === '') {
            continue;
        }

        const rawArguments = item.function.arguments;
        const args = typeof rawArguments === 'string'
            ? rawArguments
            : (rawArguments === undefined || rawArguments === null
                ? ''
                : safeJsonStringify(rawArguments));

        calls.push({
            id: typeof item.id === 'string' ? item.id : '',
            type: 'function',
            function: {
                name,
                arguments: args,
            },
        });
    }

    return calls;
}

/**
 * Извлекает сообщение ассистента из OpenAI-совместимого ответа.
 *
 * Возвращает `null`, если структура ответа некорректна (нет `choices` или
 * `message`), — вызывающий код превратит это в типизированную ошибку.
 */
function readAssistantMessage(data: unknown): AiChatAssistantMessage | null {
    if (!isPlainObject(data) || !Array.isArray(data.choices) || data.choices.length === 0) {
        return null;
    }

    const first = data.choices[0];

    if (!isPlainObject(first) || !isPlainObject(first.message)) {
        return null;
    }

    const content = typeof first.message.content === 'string' ? first.message.content : null;

    return {
        role: 'assistant',
        content,
        toolCalls: readToolCalls(first.message.tool_calls),
    };
}

/** Достаёт `usage`, если он представлен объектом. */
function readUsage(data: unknown): Record<string, unknown> | null {
    if (!isPlainObject(data) || !isPlainObject(data.usage)) {
        return null;
    }

    return data.usage;
}

export class AiChatService {
    /**
     * Выполняет один шаг чата.
     *
     * @param payload `messages` и `tools` — в формате OpenAI chat-completions.
     *   Если `tools` не переданы, используются инструменты реестра
     *   (`openApiToolRegistry.getTools()`), но собственного состояния сервис
     *   при этом не хранит.
     */
    async chat(payload: AiChatRequestPayload): Promise<AiChatResult> {
        const tools = Array.isArray(payload.tools)
            ? payload.tools
            : openApiToolRegistry.getTools();

        const body: Record<string, unknown> = {
            messages: payload.messages,
            tools,
        };

        if (typeof payload.model === 'string' && payload.model !== '') {
            body.model = payload.model;
        }

        if (typeof payload.credentialId === 'string' && payload.credentialId !== '') {
            body.credentialId = payload.credentialId;
        }

        if (typeof payload.sessionId === 'string' && payload.sessionId !== '') {
            body.sessionId = payload.sessionId;
        }

        const raw = await apiClient.requestRaw('post', AI_CHAT_URL, body);

        if (raw.ok) {
            return this.normalizeSuccess(raw.status, raw.data);
        }

        return this.normalizeError(raw.status, raw.data);
    }

    /* --------------------------- Сессии AI-чата --------------------------- */

    /**
     * Страница списка сессий текущего пользователя.
     *
     * `limit`/`offset` передаются всегда, `includeArchived` — булевым,
     * `search` — только непустой строкой. Пустые сессии бэкенд исключает сам.
     */
    async listSessions(
        query: AiChatSessionListQuery = {},
    ): Promise<AiChatServiceResult<AiChatSessionList>> {
        const params: Record<string, unknown> = {
            includeArchived: query.includeArchived === true,
            limit: query.limit ?? 50,
            offset: query.offset ?? 0,
        };

        if (typeof query.search === 'string' && query.search.trim() !== '') {
            params.search = query.search.trim();
        }

        return this.requestSession<AiChatSessionList>(
            'get',
            AI_CHAT_SESSIONS_URL,
            undefined,
            params,
        );
    }

    /** Сессия вместе с полной историей сообщений. */
    async getSession(id: string): Promise<AiChatServiceResult<AiChatSessionDetail>> {
        return this.requestSession<AiChatSessionDetail>(
            'get',
            `${AI_CHAT_SESSIONS_URL}/${encodeURIComponent(id)}`,
        );
    }

    /** Создаёт сессию; пустые `credentialId`/`model`/`title` не отправляются. */
    async createSession(
        payload: AiChatSessionCreateRequest = {},
    ): Promise<AiChatServiceResult<AiChatSession>> {
        const body: Record<string, unknown> = {};

        if (typeof payload.credentialId === 'string' && payload.credentialId !== '') {
            body.credentialId = payload.credentialId;
        }

        if (typeof payload.model === 'string' && payload.model !== '') {
            body.model = payload.model;
        }

        if (typeof payload.title === 'string' && payload.title.trim() !== '') {
            body.title = payload.title.trim();
        }

        return this.requestSession<AiChatSession>('post', AI_CHAT_SESSIONS_URL, body);
    }

    /** Архивирует сессию; повторный вызов идемпотентен. */
    async archiveSession(id: string): Promise<AiChatServiceResult<AiChatSession>> {
        return this.requestSession<AiChatSession>(
            'post',
            `${AI_CHAT_SESSIONS_URL}/${encodeURIComponent(id)}/archive`,
        );
    }

    /** Удаляет сессию. Бэкенд разрешает только для архивной. */
    async deleteSession(id: string): Promise<AiChatServiceResult<null>> {
        return this.requestSession<null>(
            'delete',
            `${AI_CHAT_SESSIONS_URL}/${encodeURIComponent(id)}`,
        );
    }

    /**
     * Один шаг диалога. Тело содержит ровно одно из `message`/`toolResults`
     * (это гарантирует тип {@link AiChatTurnRequest}).
     */
    async startTurn(
        id: string,
        payload: AiChatTurnRequest,
    ): Promise<AiChatServiceResult<AiChatTurnResult>> {
        const body: Record<string, unknown> = {};

        if ('message' in payload && payload.message !== undefined) {
            body.message = payload.message;
        }

        if ('toolResults' in payload && Array.isArray(payload.toolResults)) {
            body.toolResults = payload.toolResults;
        }

        if (Array.isArray(payload.tools)) {
            body.tools = payload.tools;
        }

        if (typeof payload.model === 'string' && payload.model !== '') {
            body.model = payload.model;
        }

        return this.requestSession<AiChatTurnResult>(
            'post',
            `${AI_CHAT_SESSIONS_URL}/${encodeURIComponent(id)}/turns`,
            body,
        );
    }

    /**
     * «Сырой» вызов session-эндпоинта: сохраняет статус и тело конверта,
     * поэтому `data.code` ошибки доходит до {@link normalizovatOshibkuChat}.
     */
    private async requestSession<T>(
        method: 'get' | 'post' | 'delete',
        url: string,
        data?: unknown,
        params?: Record<string, unknown>,
    ): Promise<AiChatServiceResult<T>> {
        const raw = await apiClient.requestRaw(method, url, data, params);

        if (raw.ok) {
            const body = raw.data;
            const payload = isPlainObject(body) && 'data' in body ? body.data : body;

            return {
                ok: true,
                status: raw.status,
                data: (payload as T | null) ?? null,
                errorKey: null,
                errorDetails: null,
            };
        }

        const {errorKey, errorDetails} = normalizovatOshibkuChat(raw.status, raw.data);

        return {
            ok: false,
            status: raw.status,
            data: null,
            errorKey,
            errorDetails,
        };
    }

    /** Нормализует успешный ответ; некорректная структура — типизированная ошибка. */
    private normalizeSuccess(status: number, data: unknown): AiChatResult {
        const message = readAssistantMessage(data);

        if (message === null) {
            return {
                ok: false,
                status,
                finishReason: null,
                message: null,
                usage: null,
                errorKey: 'ai.chat.upstream_invalid_response',
                errorDetails: null,
            };
        }

        return {
            ok: true,
            status,
            finishReason: readFinishReason(data),
            message,
            usage: readUsage(data),
            errorKey: null,
            errorDetails: null,
        };
    }

    /**
     * Нормализует ответ с ошибкой, сохраняя статус, ключ из тела и текст
     * ошибки upstream-провайдера (`errorDetails`).
     */
    private normalizeError(status: number, data: unknown): AiChatResult {
        const {errorKey, errorDetails} = normalizovatOshibkuChat(status, data);

        return {
            ok: false,
            status,
            finishReason: null,
            message: null,
            usage: null,
            errorKey,
            errorDetails,
        };
    }
}

/** Общий экземпляр сервиса. */
export const aiChatService = new AiChatService();

export default aiChatService;
