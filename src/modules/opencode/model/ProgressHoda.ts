/**
 * Снапшот прогресса хода. Общий stateless-тип для двух независимых экранов:
 * он не содержит ссылок на сессию или workspace.
 */
export type ProgressHoda = {
    steps: Record<string, unknown>[];
    finished: boolean;
    success: boolean;
    updatedAt: number;
};

export function pohozheNaProgress(dannie: unknown): dannie is ProgressHoda {
    if (typeof dannie !== "object" || dannie === null) {
        return false;
    }

    const zapis = dannie as Record<string, unknown>;

    return Array.isArray(zapis["steps"])
        && typeof zapis["finished"] === "boolean"
        && typeof zapis["success"] === "boolean"
        && typeof zapis["updatedAt"] === "number";
}
