/**
 * Composable цикла ReAct для AI-чата над инструментами OpenAPI.
 *
 * Один экземпляр композабла — одна сессия диалога: всё состояние живёт в
 * `ref`/`shallowRef` внутри фабрики, модульного изменяемого состояния нет.
 *
 * Композабл:
 * 1. Инициализирует реестр инструментов и обновляет роли текущего пользователя.
 * 2. Ведёт две согласованные истории: `messages` для UI и `llmMessages` в
 *    формате OpenAI chat-completions.
 * 3. На каждом шаге передаёт модели свежий `openApiToolRegistry.getTools()`.
 * 4. Выполняет tool-вызовы строго последовательно и только через
 *    `toolExecutor`, не обращаясь к эндпоинтам напрямую.
 * 5. Для инструментов с `x-ai-confirm` приостанавливает цикл на Promise,
 *    который разрешает UI через `confirmToolCall()`/`cancelToolCall()`.
 * 6. Ограничивает ход десятью шагами и никогда не выпускает 11-й вызов модели.
 * 7. Преобразует любые ошибки в записи с `errorKey`/`status` (без переводов).
 */

import { reactive, ref, shallowRef } from 'vue';
import type { Ref, ShallowRef } from 'vue';
import { openApiToolRegistry } from '@/modules/ai-chat/services/OpenApiToolRegistry';
import { isPlainObject } from '@/modules/ai-chat/services/OpenApiToolRegistry';
import {
    SEARCH_TOOL_NAME,
    toolExecutor,
} from '@/modules/ai-chat/services/ToolExecutor';
import { aiChatService } from '@/modules/ai-chat/services/AiChatService';
import type {
    AiChatErrorKey,
    AiChatMessage,
    AiChatToolCall,
    HttpMethod,
    OpenApiToolMeta,
    ToolExecutionFailure,
    ToolExecutionResult,
} from '@/modules/ai-chat/model/types';

/* -------------------------------------------------------------------------- */
/* Константы                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Предельное число итераций ReAct-цикла на один ход пользователя.
 *
 * Совпадает с лимитом из плана и DTO бэкенда (`AiChatRequest`). Значение
 * проверяется ДО очередного вызова модели, поэтому 11-й запрос не уходит.
 */
export const MAX_STEPS = 10;

/** Максимальная длина результата инструмента, показываемая в UI. */
export const MAX_UI_TOOL_RESULT_CHARS = 600;

/**
 * Стабильное содержимое tool-сообщения при отказе пользователя.
 *
 * Это короткий английский текст для модели, а не ключ перевода: UI не
 * показывает его напрямую, поэтому локализация здесь не нужна.
 */
const USER_DECLINED_TOOL_CONTENT = JSON.stringify({
    ok: false,
    cancelled: true,
    errorKind: 'cancelled',
    error: 'The user declined to execute this action. Do not retry it automatically.',
});

/** Содержимое tool-сообщения для вызовов, не выполненных из-за остановки. */
const STOPPED_TOOL_CONTENT = JSON.stringify({
    ok: false,
    cancelled: true,
    errorKind: 'cancelled',
    error: 'The run was stopped before this action could be executed.',
});

/** Ключ ошибки для исключений, которые не удалось классифицировать иначе. */
const UNEXPECTED_ERROR_KEY: AiChatErrorKey = 'ai.chat.unexpected_error';

/* -------------------------------------------------------------------------- */
/* Типы записей UI                                                            */
/* -------------------------------------------------------------------------- */

/** Запись пользователя в ленте чата. */
export interface AiChatUserEntry {
    id: string;
    kind: 'user';
    text: string;
    createdAt: number;
}

/** Текстовая запись ассистента в ленте чата. */
export interface AiChatAssistantEntry {
    id: string;
    kind: 'assistant';
    text: string;
    createdAt: number;
}

/** Статус вызова инструмента, отображаемый в ленте. */
export type AiChatToolCallStatus =
    | 'pending'
    | 'awaiting_confirmation'
    | 'running'
    | 'success'
    | 'error'
    | 'cancelled';

/** Запись о вызове инструмента (имя, аргументы, статус, краткий итог). */
export interface AiChatToolInvocationEntry {
    id: string;
    kind: 'tool';
    /** `id` из `tool_calls` ответа модели; связывает запись с tool-сообщением. */
    toolCallId: string;
    toolName: string;
    operationId: string | null;
    method: HttpMethod | null;
    path: string | null;
    /** Человекочитаемая подпись из метаданных операции (без перевода). */
    summary: string;
    /** Разобранные аргументы (пустой объект, если JSON некорректен). */
    args: Record<string, unknown>;
    /** Исходная строка аргументов, как её прислала модель. */
    argsRaw: string;
    status: AiChatToolCallStatus;
    /** Обрезанный результат для показа в UI; `null` до завершения. */
    resultSummary: string | null;
    /** Пояснение ошибки для UI/диагностики; `null` при успехе. */
    resultError: string | null;
    /** HTTP-статус результата; `null`, если запрос не выполнялся. */
    resultStatus: number | null;
    /** `true`, если исполнитель обрезал результат. */
    truncated: boolean;
    createdAt: number;
}

/** Запись об ошибке провайдера/транспорта; переводится в UI по `errorKey`. */
export interface AiChatErrorEntry {
    id: string;
    kind: 'error';
    /** Стабильный ключ перевода либо `null`, если бэкенд его не прислал. */
    errorKey: AiChatErrorKey | null;
    /** HTTP-статус ответа; `0` — транспортная ошибка или исключение. */
    status: number;
    /** Техническая подробность (не переводится, только для диагностики). */
    details: string | null;
    createdAt: number;
}

/** Ключи служебных уведомлений цикла. */
export type AiChatNoticeKey = 'step_limit_reached' | 'stopped';

/** Служебное уведомление (лимит шагов, остановка). */
export interface AiChatNoticeEntry {
    id: string;
    kind: 'notice';
    noticeKey: AiChatNoticeKey;
    createdAt: number;
}

/** Любая запись ленты чата. */
export type AiChatEntry =
    | AiChatUserEntry
    | AiChatAssistantEntry
    | AiChatToolInvocationEntry
    | AiChatErrorEntry
    | AiChatNoticeEntry;

/**
 * Ожидающее подтверждения действие.
 *
 * Объект отдаётся в UI; `confirm()`/`cancel()` разрешают внутренний Promise,
 * на котором приостановлен цикл. Те же действия доступны на уровне
 * композабла через `confirmToolCall()`/`cancelToolCall()`.
 */
export interface PendingConfirmationState {
    toolCallId: string;
    toolName: string;
    operationId: string;
    method: HttpMethod;
    path: string;
    /** Человекочитаемая подпись из `summary`/`description` метаданных. */
    summary: string;
    description: string;
    /** Разобранные аргументы, которые будут отправлены после подтверждения. */
    args: Record<string, unknown>;
    /** Исходная строка аргументов модели. */
    argsRaw: string;
    /** Подтвердить действие; разрешает ожидание значением `true`. */
    confirm: () => void;
    /** Отменить действие; разрешает ожидание значением `false`. */
    cancel: () => void;
}

/** Необязательные начальные значения селекторов. */
export interface UseAiAgentChatOptions {
    credentialId?: string | null;
    model?: string | null;
}

/** Полный контракт композабла (используется UI-подзадачей 4b). */
export interface UseAiAgentChatReturn {
    /** Записи ленты для отображения в UI. */
    messages: Ref<AiChatEntry[]>;
    /** История в формате OpenAI chat-completions, отправляемая на бэкенд. */
    llmMessages: Ref<AiChatMessage[]>;
    /** `true`, пока выполняется ход агента. */
    isRunning: Ref<boolean>;
    /** Число уже отправленных вызовов модели в текущем ходе. */
    stepCount: Ref<number>;
    /** `true`, если ход прерван достижением `MAX_STEPS`. */
    stepLimitReached: Ref<boolean>;
    /** Активные инструменты сессии (для боковой панели). */
    activeTools: Ref<OpenApiToolMeta[]>;
    /** Идентификатор реквизитов OpenCode (необязательный). */
    credentialId: Ref<string | null>;
    /** Желаемая модель провайдера (необязательная). */
    model: Ref<string | null>;
    /** Текущее действие, ожидающее подтверждения, либо `null`. */
    pendingConfirmation: ShallowRef<PendingConfirmationState | null>;
    /** Последний ключ ошибки шага; `null`, если ошибок не было. */
    errorKey: Ref<AiChatErrorKey | null>;
    /** Запускает ход агента по тексту пользователя. */
    send: (text: string) => Promise<void>;
    /** Просит цикл завершиться после текущей операции. */
    stop: () => void;
    /** Сбрасывает историю, подтверждение, счётчик шагов и сессию реестра. */
    reset: () => void;
    /** Подтверждает ожидающее действие. */
    confirmToolCall: () => void;
    /** Отменяет ожидающее действие. */
    cancelToolCall: () => void;
    /** Устанавливает селекторы реквизитов/модели. */
    setCredentials: (options: UseAiAgentChatOptions) => void;
    /** Перечитывает активные инструменты из реестра. */
    refreshActiveTools: () => void;
}

/* -------------------------------------------------------------------------- */
/* Вспомогательные функции                                                    */
/* -------------------------------------------------------------------------- */

/** Пустая/пробельная строка нормализуется в `null`. */
function normalizeOptionalString(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();

    return trimmed === '' ? null : trimmed;
}

/**
 * Генерирует идентификатор сессии диалога для `x-opencode-session`.
 *
 * `crypto.randomUUID()` доступен не во всех окружениях (например, в
 * не-secure контексте), поэтому предусмотрен fallback только из символов,
 * допустимых бэкендом (`^[A-Za-z0-9._:-]{1,128}$`).
 */
function generateSessionId(): string {
    const cryptoApi = typeof globalThis.crypto === 'undefined' ? null : globalThis.crypto;

    if (cryptoApi !== null && typeof cryptoApi.randomUUID === 'function') {
        return cryptoApi.randomUUID();
    }

    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);

    return `ai-${timestamp}-${random}`.slice(0, 128);
}

/** Значение для необязательного поля запроса. */
function optionalArgument(value: string | null): string | undefined {
    return value === null ? undefined : value;
}

/** Обрезает результат инструмента до размера, безопасного для UI. */
function truncateForUi(content: string): string {
    if (content.length <= MAX_UI_TOOL_RESULT_CHARS) {
        return content;
    }

    return `${content.slice(0, MAX_UI_TOOL_RESULT_CHARS)}…`;
}

interface ParsedToolArguments {
    args: Record<string, unknown>;
    error: string | null;
}

/**
 * Безопасно разбирает аргументы `tool_call.function.arguments`.
 *
 * Модель может прислать невалидный JSON или не объект — в обоих случаях
 * возвращается пустой объект и причина, чтобы не выполнять инструмент с
 * некорректными данными.
 */
function parseToolArguments(raw: string): ParsedToolArguments {
    if (raw.trim() === '') {
        return { args: {}, error: null };
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(raw);
    } catch {
        return { args: {}, error: 'Tool arguments are not valid JSON.' };
    }

    if (!isPlainObject(parsed)) {
        return { args: {}, error: 'Tool arguments must be a JSON object.' };
    }

    return { args: parsed, error: null };
}

/** Содержимое tool-сообщения для некорректных аргументов. */
function invalidArgumentsContent(error: string): string {
    return JSON.stringify({
        ok: false,
        errorKind: 'invalid_arguments',
        error,
    });
}

/** Страховка на случай, если исполнитель всё же выбросил исключение. */
function makeUnexpectedToolFailure(error: unknown): ToolExecutionFailure {
    const message = error instanceof Error && error.message !== ''
        ? error.message
        : String(error);

    return {
        ok: false,
        status: 0,
        data: null,
        truncated: false,
        content: JSON.stringify({
            ok: false,
            status: 0,
            errorKind: 'transport_error',
            error: message,
        }),
        error: message,
        errorKind: 'transport_error',
    };
}

/** Человекочитаемая подпись операции из метаданных. */
function formatOperationSummary(meta: OpenApiToolMeta): string {
    if (meta.summary !== '') {
        return meta.summary;
    }

    return `${meta.method.toUpperCase()} ${meta.path}`;
}

/* -------------------------------------------------------------------------- */
/* Композабл                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Создаёт независимую сессию AI-чата с инструментами OpenAPI.
 *
 * @param options Начальные значения `credentialId`/`model` (их можно менять
 *   через одноимённые `ref` или `setCredentials`).
 */
export function useAiAgentChat(options: UseAiAgentChatOptions = {}): UseAiAgentChatReturn {
    /* ------------------------------ Состояние ------------------------------ */

    const messages = ref<AiChatEntry[]>([]);
    const llmMessages = ref<AiChatMessage[]>([]);
    const isRunning = ref(false);
    const stepCount = ref(0);
    const stepLimitReached = ref(false);
    const activeTools = ref<OpenApiToolMeta[]>([]);
    const credentialId = ref<string | null>(normalizeOptionalString(options.credentialId));
    const model = ref<string | null>(normalizeOptionalString(options.model));
    const pendingConfirmation = shallowRef<PendingConfirmationState | null>(null);
    const errorKey = ref<AiChatErrorKey | null>(null);

    /**
     * Идентификатор сессии диалога. Живёт до `reset()`, чтобы все сообщения
     * одного диалога уходили в `opencode-go` с одним `x-opencode-session`.
     */
    const sessionId = ref<string>(generateSessionId());

    /**
     * Номер текущего запуска. `reset()` увеличивает его, чтобы «осиротевший»
     * цикл перестал менять состояние и не воскрешал очищенную историю.
     */
    let runSequence = 0;

    /** Мягкая просьба завершить текущий ход. */
    let stopRequested = false;

    /** Резолвер Promise, на котором приостановлен цикл подтверждения. */
    let confirmationResolver: ((approved: boolean) => void) | null = null;

    /** Сквозной счётчик для стабильных `id` записей UI. */
    let entrySequence = 0;

    function nextEntryId(prefix: string): string {
        entrySequence += 1;

        return `${prefix}-${Date.now()}-${entrySequence}`;
    }

    function refreshActiveTools(): void {
        activeTools.value = openApiToolRegistry.getActiveTools();
    }

    function setCredentials(next: UseAiAgentChatOptions): void {
        if ('credentialId' in next) {
            credentialId.value = normalizeOptionalString(next.credentialId);
        }

        if ('model' in next) {
            model.value = normalizeOptionalString(next.model);
        }
    }

    /* ------------------------- Записи ленты (UI) --------------------------- */

    function pushUserEntry(text: string): void {
        messages.value.push({
            id: nextEntryId('user'),
            kind: 'user',
            text,
            createdAt: Date.now(),
        });
    }

    function pushAssistantEntry(text: string): void {
        messages.value.push({
            id: nextEntryId('assistant'),
            kind: 'assistant',
            text,
            createdAt: Date.now(),
        });
    }

    function pushErrorEntry(
        entryErrorKey: AiChatErrorKey | null,
        status: number,
        details: string | null,
    ): void {
        errorKey.value = entryErrorKey;
        messages.value.push({
            id: nextEntryId('error'),
            kind: 'error',
            errorKey: entryErrorKey,
            status,
            details,
            createdAt: Date.now(),
        });
    }

    function pushNoticeEntry(noticeKey: AiChatNoticeKey): void {
        messages.value.push({
            id: nextEntryId('notice'),
            kind: 'notice',
            noticeKey,
            createdAt: Date.now(),
        });
    }

    function createToolEntry(
        call: AiChatToolCall,
        meta: OpenApiToolMeta | null,
        args: Record<string, unknown>,
        argsRaw: string,
    ): AiChatToolInvocationEntry {
        return reactive<AiChatToolInvocationEntry>({
            id: nextEntryId('tool'),
            kind: 'tool',
            toolCallId: call.id,
            toolName: call.function.name,
            operationId: meta?.operationId ?? null,
            method: meta?.method ?? null,
            path: meta?.path ?? null,
            summary: meta === null ? '' : formatOperationSummary(meta),
            args,
            argsRaw,
            status: 'pending',
            resultSummary: null,
            resultError: null,
            resultStatus: null,
            truncated: false,
            createdAt: Date.now(),
        });
    }

    /**
     * Добавляет tool-сообщения для вызовов, которые не будут выполнены.
     *
     * Нужно, чтобы история оставалась валидной для OpenAI-совместимого API:
     * на каждый `tool_call` из сообщения ассистента должен быть ответ
     * `role: 'tool'` с тем же `tool_call_id`.
     */
    function skipToolCalls(calls: readonly AiChatToolCall[], content: string): void {
        for (const call of calls) {
            const parsed = parseToolArguments(call.function.arguments);
            const entry = createToolEntry(call, null, parsed.args, call.function.arguments);

            entry.status = 'cancelled';
            entry.resultError = 'cancelled';
            messages.value.push(entry);

            llmMessages.value.push({
                role: 'tool',
                tool_call_id: call.id,
                content,
            });
        }
    }

    /* ---------------------- Подтверждение пользователя --------------------- */

    /**
     * Ставит цикл на паузу до решения пользователя.
     *
     * Возвращает Promise, который разрешается `true` при подтверждении и
     * `false` при отмене. Пока Promise не разрешён, HTTP-вызов инструмента не
     * выполняется.
     */
    function requestConfirmation(
        meta: OpenApiToolMeta,
        call: AiChatToolCall,
        args: Record<string, unknown>,
        argsRaw: string,
    ): Promise<boolean> {
        // Предыдущее ожидание не должно «зависнуть»: разрешаем его отказом.
        settleConfirmation(false);

        return new Promise<boolean>((resolve) => {
            confirmationResolver = resolve;
            pendingConfirmation.value = {
                toolCallId: call.id,
                toolName: meta.toolName,
                operationId: meta.operationId,
                method: meta.method,
                path: meta.path,
                summary: formatOperationSummary(meta),
                description: meta.description,
                args,
                argsRaw,
                confirm: () => settleConfirmation(true),
                cancel: () => settleConfirmation(false),
            };
        });
    }

    /** Завершает ожидание подтверждения ровно один раз. */
    function settleConfirmation(approved: boolean): void {
        const resolver = confirmationResolver;
        confirmationResolver = null;
        pendingConfirmation.value = null;

        if (resolver !== null) {
            resolver(approved);
        }
    }

    function confirmToolCall(): void {
        settleConfirmation(true);
    }

    function cancelToolCall(): void {
        settleConfirmation(false);
    }

    /* ------------------------------ Цикл ReAct ----------------------------- */

    /**
     * Выполняет один ход агента.
     *
     * Пустой текст и повторный вызов во время выполнения игнорируются.
     * Исключения не покидают функцию: они превращаются в запись об ошибке.
     */
    async function send(text: string): Promise<void> {
        const trimmed = text.trim();

        if (trimmed === '' || isRunning.value) {
            return;
        }

        const runId = runSequence + 1;
        runSequence = runId;
        stopRequested = false;

        const isCurrentRun = (): boolean => runSequence === runId;

        isRunning.value = true;
        stepCount.value = 0;
        stepLimitReached.value = false;
        errorKey.value = null;

        try {
            await openApiToolRegistry.initialize();

            if (!isCurrentRun()) {
                return;
            }

            openApiToolRegistry.refreshRoles();
            refreshActiveTools();

            pushUserEntry(trimmed);
            llmMessages.value.push({ role: 'user', content: trimmed });

            // Основной цикл: проверка лимита стоит до вызова модели, поэтому
            // 11-й запрос не будет отправлен ни при каких условиях.
            while (true) {
                if (!isCurrentRun()) {
                    return;
                }

                if (stopRequested) {
                    pushNoticeEntry('stopped');
                    break;
                }

                if (stepCount.value >= MAX_STEPS) {
                    stepLimitReached.value = true;
                    pushNoticeEntry('step_limit_reached');
                    break;
                }

                stepCount.value += 1;

                const response = await aiChatService.chat({
                    messages: llmMessages.value,
                    tools: openApiToolRegistry.getTools(),
                    model: optionalArgument(model.value),
                    credentialId: optionalArgument(credentialId.value),
                    sessionId: sessionId.value,
                });

                if (!isCurrentRun()) {
                    return;
                }

                if (!response.ok || response.message === null) {
                    pushErrorEntry(
                        response.errorKey ?? UNEXPECTED_ERROR_KEY,
                        response.status,
                        response.errorDetails,
                    );
                    break;
                }

                const assistant = response.message;

                llmMessages.value.push({
                    role: 'assistant',
                    content: assistant.content,
                    tool_calls: assistant.toolCalls.length > 0 ? assistant.toolCalls : undefined,
                });

                if (typeof assistant.content === 'string' && assistant.content.trim() !== '') {
                    pushAssistantEntry(assistant.content);
                }

                if (assistant.toolCalls.length === 0) {
                    break;
                }

                // Вызовы одного сообщения выполняются строго по порядку.
                const toolCalls = assistant.toolCalls;

                for (let index = 0; index < toolCalls.length; index += 1) {
                    if (!isCurrentRun()) {
                        return;
                    }

                    if (stopRequested) {
                        skipToolCalls(toolCalls.slice(index), STOPPED_TOOL_CONTENT);
                        break;
                    }

                    const call = toolCalls[index];
                    const parsed = parseToolArguments(call.function.arguments);
                    const meta = call.function.name === SEARCH_TOOL_NAME
                        ? null
                        : openApiToolRegistry.resolveTool(call.function.name);
                    const entry = createToolEntry(call, meta, parsed.args, call.function.arguments);

                    messages.value.push(entry);

                    if (parsed.error !== null) {
                        entry.status = 'error';
                        entry.resultError = parsed.error;
                        llmMessages.value.push({
                            role: 'tool',
                            tool_call_id: call.id,
                            content: invalidArgumentsContent(parsed.error),
                        });
                        continue;
                    }

                    const needsConfirmation = toolExecutor.requiresConfirmation(call.function.name)
                        || (meta !== null && meta.confirm);

                    if (needsConfirmation && meta !== null) {
                        entry.status = 'awaiting_confirmation';

                        // Цикл стоит здесь, пока UI не вызовет confirmToolCall()
                        // или cancelToolCall(). HTTP-вызова ещё не было.
                        const approved = await requestConfirmation(
                            meta,
                            call,
                            parsed.args,
                            call.function.arguments,
                        );

                        if (!isCurrentRun()) {
                            return;
                        }

                        if (!approved) {
                            entry.status = 'cancelled';
                            entry.resultError = 'cancelled';
                            llmMessages.value.push({
                                role: 'tool',
                                tool_call_id: call.id,
                                content: USER_DECLINED_TOOL_CONTENT,
                            });
                            continue;
                        }
                    }

                    entry.status = 'running';

                    let result: ToolExecutionResult;

                    try {
                        result = await toolExecutor.execute(
                            call.function.name,
                            parsed.args,
                            needsConfirmation ? { confirmed: true } : {},
                        );
                    } catch (error) {
                        result = makeUnexpectedToolFailure(error);
                    }

                    if (!isCurrentRun()) {
                        return;
                    }

                    entry.status = result.ok ? 'success' : 'error';
                    entry.resultStatus = result.status;
                    entry.resultSummary = truncateForUi(result.content);
                    entry.resultError = result.ok ? null : result.error;
                    entry.truncated = result.truncated;

                    llmMessages.value.push({
                        role: 'tool',
                        tool_call_id: call.id,
                        content: result.content,
                    });

                    // `search_api_endpoints` активирует новые инструменты сессии.
                    if (call.function.name === SEARCH_TOOL_NAME) {
                        refreshActiveTools();
                    }

                    if (stopRequested) {
                        skipToolCalls(toolCalls.slice(index + 1), STOPPED_TOOL_CONTENT);
                        break;
                    }
                }

                if (!isCurrentRun()) {
                    return;
                }

                if (stopRequested) {
                    pushNoticeEntry('stopped');
                    break;
                }
            }
        } catch (error) {
            if (isCurrentRun()) {
                const details = error instanceof Error && error.message !== ''
                    ? error.message
                    : String(error);

                pushErrorEntry(UNEXPECTED_ERROR_KEY, 0, details);
            }
        } finally {
            if (isCurrentRun()) {
                // Страховка: не оставляем висеть Promise подтверждения.
                if (pendingConfirmation.value !== null || confirmationResolver !== null) {
                    settleConfirmation(false);
                }

                isRunning.value = false;
            }
        }
    }

    /**
     * Просит цикл завершиться и снимает ожидание подтверждения.
     *
     * Уже начатый HTTP-запрос отменить нельзя, но следующие шаги и вызовы
     * инструментов выполняться не будут. Сессия остаётся пригодной для
     * следующего сообщения.
     */
    function stop(): void {
        if (!isRunning.value) {
            return;
        }

        stopRequested = true;
        settleConfirmation(false);
    }

    /**
     * Сбрасывает сессию: историю, подтверждение, счётчик шагов и активные
     * инструменты реестра.
     *
     * Если цикл ещё выполняется, его состояние инвалидируется через
     * `runSequence`: «осиротевший» цикл больше не изменит ленту.
     */
    function reset(): void {
        runSequence += 1;
        stopRequested = true;
        settleConfirmation(false);

        isRunning.value = false;
        messages.value = [];
        llmMessages.value = [];
        sessionId.value = generateSessionId();
        stepCount.value = 0;
        stepLimitReached.value = false;
        errorKey.value = null;

        openApiToolRegistry.resetSession();
        refreshActiveTools();
    }

    return {
        messages,
        llmMessages,
        isRunning,
        stepCount,
        stepLimitReached,
        activeTools,
        credentialId,
        model,
        pendingConfirmation,
        errorKey,
        send,
        stop,
        reset,
        confirmToolCall,
        cancelToolCall,
        setCredentials,
        refreshActiveTools,
    };
}

export default useAiAgentChat;
