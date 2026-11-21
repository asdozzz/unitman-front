/**
 * Фильтры списка workspace-сессий.
 *
 * Совпадают с query-параметрами `GET /opencode/workspace/spisok`, поэтому
 * не требуют клиентской фильтрации: список запрашивается уже отфильтрованным.
 */
export type FiltriWorkspace = {
    /** Подстрока названия, поиск через LIKE на бэкенде. */
    search: string | null;
    /** Показывать только неархивные workspace. */
    onlyActive: boolean;
};

export const DEFAULT_FILTRI_WORKSPACE: FiltriWorkspace = {
    search: null,
    onlyActive: false,
};

/** Приводит произвольный вход к полному фильтру с дефолтами. */
export function normalizovatFiltriWorkspace(vhod: {
    search?: unknown;
    onlyActive?: unknown;
}): FiltriWorkspace {
    const search = typeof vhod.search === "string" ? vhod.search.trim() : "";

    return {
        search: search === "" ? null : search,
        onlyActive: vhod.onlyActive === true,
    };
}
