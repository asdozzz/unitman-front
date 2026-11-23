import type { RekvizityOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/model/OpenCodeRekvizity";

/**
 * Утилиты выбора модели OpenCode.
 *
 * Поля `model`, `models` и `defaultModel` уже есть в сгенерированной
 * OpenAPI-схеме (`yarn gen:api`), поэтому здесь остаются только
 * поведенческие хелперы: нормализация и вычисление модели по умолчанию.
 */

/** Модель в формате формы/селекта: пустая строка означает «модель не выбрана». */
export type ModelVybora = string;

/** Привести произвольное значение модели к непустой строке или `null`. */
export function normalizovatModel(model: string | null | undefined): string | null {
    const znachenie = (model ?? "").trim();

    return znachenie === "" ? null : znachenie;
}

/**
 * Список моделей реквизитов.
 *
 * Приоритет: массив `models`; для старых реквизитов без моделей — дефолтная
 * модель, затем legacy-поле `model`.
 */
export function modeliRekvizitov(rekvizity: RekvizityOpenCode | null | undefined): string[] {
    if (!rekvizity) {
        return [];
    }

    if (Array.isArray(rekvizity.models) && rekvizity.models.length > 0) {
        return [...rekvizity.models];
    }

    const zapasnaya = rekvizity.defaultModel || rekvizity.model || "";

    return zapasnaya === "" ? [] : [zapasnaya];
}

/** Модель по умолчанию для реквизитов (дефолт, затем legacy `model`). */
export function modelPoUmolchaniyu(rekvizity: RekvizityOpenCode | null | undefined): string {
    if (!rekvizity) {
        return "";
    }

    return rekvizity.defaultModel || rekvizity.model || "";
}

/**
 * Прочитать модель из произвольного объекта (ход, сессия, read-модель).
 *
 * Безопасный геттер для мест, где объект типизирован как `unknown` (например,
 * `workspace: Workspace & null`), либо пришёл из локальной модели.
 */
export function modelIzObekta(obekt: unknown): string | null {
    if (typeof obekt !== "object" || obekt === null) {
        return null;
    }

    const znachenie = (obekt as { model?: unknown }).model;

    return typeof znachenie === "string" && znachenie.trim() !== "" ? znachenie : null;
}
