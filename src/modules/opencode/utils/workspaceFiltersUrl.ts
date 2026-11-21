import {
    normalizovatFiltriWorkspace,
    type FiltriWorkspace,
} from "@/modules/opencode/model/WorkspaceFiltri";

/**
 * Кодек фильтра workspace для query-параметров URL.
 *
 * Чистые функции без зависимостей от vue-router и Pinia: страница сама
 * решает, когда читать `route.query` и когда писать `router.replace`.
 */

/** Берёт первую строку из значения query (vue-router отдаёт строку или массив). */
function pervayaStroka(znachenie: unknown): string | null {
    if (typeof znachenie === "string") {
        return znachenie;
    }

    if (Array.isArray(znachenie)) {
        const pervaya = znachenie.find((element: unknown): element is string => {
            return typeof element === "string";
        });

        return pervaya ?? null;
    }

    return null;
}

/**
 * Сериализует фильтр в query.
 *
 * Пишутся только значения, отличные от дефолтных, чтобы ссылка не обрастала
 * пустыми параметрами. Булево — `"1"`.
 */
export function serializovatFiltriWorkspaceVQuery(filters: FiltriWorkspace): Record<string, string> {
    const query: Record<string, string> = {};

    if (filters.search !== null) {
        query.search = filters.search;
    }
    if (filters.onlyActive) {
        query.onlyActive = "1";
    }

    return query;
}

/** Читает фильтр из query, всегда возвращая полный `FiltriWorkspace`. */
export function prochitatFiltriWorkspaceIzQuery(query: Record<string, unknown>): FiltriWorkspace {
    const onlyActive = pervayaStroka(query.onlyActive);

    return normalizovatFiltriWorkspace({
        search: pervayaStroka(query.search),
        onlyActive: onlyActive === "1" || onlyActive === "true",
    });
}
