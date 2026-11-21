/**
 * Модель уведомлений OpenCode.
 *
 * Форма уведомления одинакова для payload Centrifugo и для элемента списка
 * непрочитанных из `GET /opencode/uvedomleniya` (раздел 8.1 контракта).
 * В канал websocket и в HTTP-ответ может прийти что угодно, поэтому перед
 * использованием данные проверяются runtime-валидатором.
 */

/** Итоговый статус хода, из-за которого появилось уведомление. */
export type StatusUvedomleniyaOpenCode =
    | "ANSWERED"
    | "AWAITING_INPUT"
    | "FAILED";

/** Вид результата хода, определивший текст уведомления. */
export type VidUvedomleniyaOpenCode =
    | "ANSWER"
    | "QUESTION"
    | "ERROR";

/** Тип владельца уведомления: обычная сессия или workspace. */
export type TipSessiiUvedomleniya = "unit" | "workspace";

/** Уведомление о завершении хода OpenCode. */
export type UvedomlenieOpenCode = {
    eventType: "new_message";
    id: string;
    sessionId: string;
    turnId: string;
    sessionTitle: string;
    status: StatusUvedomleniyaOpenCode;
    kind: VidUvedomleniyaOpenCode | null;
    createdAt: number;
    /**
     * Тип сессии-владельца.
     *
     * Старые бэкенды поле не присылают: отсутствие трактуется как unit-сессия.
     */
    sessionType?: TipSessiiUvedomleniya;
};

/**
 * Локальные типы ответов API.
 *
 * До регенерации `unitman.d.ts` эти endpoint-ы в сгенерированной схеме не
 * описаны, а править автогенерируемый файл вручную запрещено.
 */
export type UvedomleniyaOpenCodeResponse = {
    channel: string;
    notifications: UvedomlenieOpenCode[];
};

export type ZahvatUvedomleniyResponse = {
    ids: string[];
};

const STATUSY: readonly StatusUvedomleniyaOpenCode[] = [
    "ANSWERED",
    "AWAITING_INPUT",
    "FAILED",
];

const VIDY: readonly VidUvedomleniyaOpenCode[] = [
    "ANSWER",
    "QUESTION",
    "ERROR",
];

function yavlyaetsyaObektom(dannie: unknown): dannie is Record<string, unknown> {
    return typeof dannie === "object" && dannie !== null;
}

/**
 * Проверка формы уведомления.
 *
 * Проверяются все обязательные по контракту поля, их типы и допустимые
 * значения `status`/`kind`.
 */
export function pohozheNaUvedomlenie(dannie: unknown): dannie is UvedomlenieOpenCode {
    if (!yavlyaetsyaObektom(dannie)) {
        return false;
    }

    const status = dannie["status"];
    const kind = dannie["kind"];
    const sessionType = dannie["sessionType"];

    return dannie["eventType"] === "new_message"
        && typeof dannie["id"] === "string"
        && typeof dannie["sessionId"] === "string"
        && typeof dannie["turnId"] === "string"
        && typeof dannie["sessionTitle"] === "string"
        && typeof status === "string"
        && (STATUSY as readonly string[]).includes(status)
        && (kind === null || (typeof kind === "string" && (VIDY as readonly string[]).includes(kind)))
        && typeof dannie["createdAt"] === "number"
        // Тип необязателен, но если пришёл — должен быть допустимым.
        && (sessionType === undefined
            || sessionType === "unit"
            || sessionType === "workspace");
}

/**
 * Проверка формы ответа `GET /opencode/uvedomleniya`.
 *
 * Элементы списка не проверяются здесь: их валидирует
 * {@link pohozheNaUvedomlenie} на границе использования, чтобы одно битое
 * уведомление не отбрасывало весь ответ.
 */
export function pohozheNaOtvetUvedomleniy(dannie: unknown): dannie is UvedomleniyaOpenCodeResponse {
    if (!yavlyaetsyaObektom(dannie)) {
        return false;
    }

    return typeof dannie["channel"] === "string" && Array.isArray(dannie["notifications"]);
}

/**
 * Проверка формы ответа `POST /opencode/otmetitUvedomleniyaProchitannimi`.
 */
export function pohozheNaZahvatUvedomleniy(dannie: unknown): dannie is ZahvatUvedomleniyResponse {
    if (!yavlyaetsyaObektom(dannie) || !Array.isArray(dannie["ids"])) {
        return false;
    }

    return dannie["ids"].every((id: unknown): id is string => typeof id === "string");
}
