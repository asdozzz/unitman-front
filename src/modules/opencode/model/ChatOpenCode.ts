import type {Schema} from "@/api/types";

/**
 * Модель чата OpenCode.
 *
 * Контракт бэкенда неоднороден по регистру полей: запросы (`otvetit`) уходят
 * в camelCase (`questionId`, `optionId`, `text`), а ответы приходят в PascalCase
 * (`QuestionId`, `OptionId`, `Text`, а также `Kind`, `Questions`, `Answer`,
 * `ErrorKey`, `Success` в `turn.result`). Чтобы экраны не разбирались в двух
 * диалектах, приведение делается один раз здесь, на границе модели.
 */

/** Вопрос к пользователю в форме, удобной для шаблона. */
export type VoprosOpenCode = {
    id: string;
    text: string;
    allowFreeText: boolean;
    options: VariantOtvetaOpenCode[];
};

/** Вариант ответа на вопрос. */
export type VariantOtvetaOpenCode = {
    id: string;
    label: string;
    description: string | null;
};

/** Ответ пользователя в том виде, в котором его принимает `otvetit`. */
export type OtvetOpenCode = {
    questionId: string;
    optionId: string | null;
    text: string | null;
};

/** Черновик ответа, который пользователь заполняет в интерфейсе. */
export type ChernovikOtvetaOpenCode = {
    optionId: string | null;
    text: string;
};

/** Прогресс хода: один и тот же payload у Centrifugo и у `poluchitProgressHoda`. */
export type ProgressHodaOpenCode = {
    steps: Record<string, unknown>[];
    finished: boolean;
    success: boolean;
    updatedAt: number;
};

/** Статус хода из контракта. */
export type StatusHodaOpenCode = Schema<"OpenCodeTurn">["status"];

/** Ветка результата хода. */
export type TipRezultataOpenCode = NonNullable<Schema<"OpenCodeTurnResult">>["Kind"];

/**
 * Привести вопрос бэкенда (PascalCase) к виду шаблона (camelCase).
 *
 * `Description` в контракте необязателен и может отсутствовать как ключ,
 * поэтому отсутствие нормализуется в `null` — иначе `undefined` попадал бы
 * в разметку.
 */
export function normalizovatVopros(vopros: Schema<"OpenCodeQuestion">): VoprosOpenCode {
    return {
        id: vopros.Id,
        text: vopros.Text,
        allowFreeText: vopros.AllowFreeText,
        options: (vopros.Options ?? []).map((option: Schema<"OpenCodeQuestionOption">): VariantOtvetaOpenCode => ({
            id: option.Id,
            label: option.Label,
            description: option.Description ?? null,
        })),
    };
}

/** Привести список вопросов, приходящий в `turn.result.Questions`. */
export function normalizovatVoprosy(voprosy: Schema<"OpenCodeQuestion">[] | null | undefined): VoprosOpenCode[] {
    return (voprosy ?? []).map(normalizovatVopros);
}

/** Привести ответ из истории (`turn.answers`) к виду формы. */
export function normalizovatOtvet(otvet: Schema<"OpenCodeAnswer">): OtvetOpenCode {
    return {
        questionId: otvet.questionId,
        optionId: otvet.optionId ?? null,
        text: otvet.text ?? null,
    };
}

/**
 * Проверка формы payload прогресса.
 *
 * В канал Centrifugo может прийти что угодно (в том числе событие другого
 * типа), поэтому перед отображением данные проверяются по форме.
 */
export function pohozheNaProgress(dannie: unknown): dannie is ProgressHodaOpenCode {
    if (typeof dannie !== "object" || dannie === null) {
        return false;
    }

    const zapis = dannie as Record<string, unknown>;

    return Array.isArray(zapis["steps"])
        && typeof zapis["finished"] === "boolean"
        && typeof zapis["success"] === "boolean"
        && typeof zapis["updatedAt"] === "number";
}

/**
 * Ход ещё выполняется: по нему нужно продолжать опрос результата.
 *
 * `AWAITING_INPUT` сюда не входит — это терминальное для наблюдения состояние:
 * бэкенд ждёт ответа пользователя, а следующий ход запустит уже `otvetit`.
 */
export function hodVProzesse(status: StatusHodaOpenCode): boolean {
    return status === "RUNNING";
}
