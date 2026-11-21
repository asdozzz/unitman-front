import type { Schema } from "@/api/types";

/**
 * Workspace-сессия OpenCode.
 *
 * Бэкенд отдаёт её как отдельную read-модель, но промпты, история, ходы и
 * уведомления используют общие маршруты opencode: ид workspace — это ид
 * сессии OpenCode.
 */
export type Workspace = Schema<"Workspace">;

export type StatusWorkspace = Workspace["status"];

export type ProektWorkspace = Workspace["projects"][number];

/** Все допустимые статусы в порядке жизненного цикла. */
export const STATUSY_WORKSPACE: readonly StatusWorkspace[] = [
    "CREATING",
    "STARTING",
    "RUNNING",
    "ARCHIVING",
    "ARCHIVED",
    "DELETING",
    "ERROR",
];

/**
 * Статусы, в которых операцию выполняет фоновая задача.
 *
 * Пока статус транзитный, список периодически перечитывается, чтобы
 * поймать переход в `RUNNING`/`ARCHIVED`/`ERROR`.
 */
export const TRANZITNIE_STATUSY: readonly StatusWorkspace[] = [
    "CREATING",
    "STARTING",
    "ARCHIVING",
    "DELETING",
];

/** Статус ещё не финальный: сервер доделывает операцию. */
export function statusTranzitniy(status: StatusWorkspace): boolean {
    return TRANZITNIE_STATUSY.includes(status);
}

/** Цвет бейджа в палитре Quasar. */
export function cvetStatusaWorkspace(status: StatusWorkspace): string {
    switch (status) {
        case "RUNNING":
            return "positive";
        case "CREATING":
        case "STARTING":
            return "info";
        case "ERROR":
            return "negative";
        default:
            return "grey-6";
    }
}

/** Архивация доступна для рабочего workspace и после ошибки. */
export function mozhnoArhivirovat(status: StatusWorkspace): boolean {
    return status === "RUNNING" || status === "ERROR";
}

/** Восстановление доступно только для архива и ошибки. */
export function mozhnoVosstanovit(status: StatusWorkspace): boolean {
    return status === "ARCHIVED" || status === "ERROR";
}

/** Удаление запрещено, пока идёт другая операция. */
export function mozhnoUdalit(status: StatusWorkspace): boolean {
    return status !== "DELETING" && !statusTranzitniy(status);
}

/** Читает ли пользователь workspace в режиме только-чтение. */
export function estReadOnly(workspace: Workspace): boolean {
    return workspace.readOnly || workspace.projects.some((project) => !project.canPush);
}
