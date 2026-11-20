import {
    DEFAULT_UNIT_FILTERS,
    normalizovatFiltri,
    type UnitFilters,
} from "@/modules/unit/store/SpisokUnitov/model/UnitFilters";

/**
 * Кодек фильтра списка юнитов для query-параметров URL.
 *
 * Чистые функции без зависимостей от vue-router и Pinia: страница сама
 * решает, когда читать `route.query` и когда писать `router.replace`.
 */

/**
 * Берёт первую строку из значения query.
 *
 * Vue-router отдаёт `string`, `string[]` либо `null`, но функция рассчитана
 * на произвольный вход и отбрасывает всё, что не является строкой.
 */
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
 * Разбирает список значений, записанный через запятую.
 *
 * Поддерживает и одиночную строку, и массив строк (повторяющийся параметр).
 * Пустые элементы отбрасываются.
 */
function spisokStrok(znachenie: unknown): string[] {
    if (typeof znachenie === "string") {
        return razbitPoZapyatoy(znachenie);
    }

    if (Array.isArray(znachenie)) {
        return znachenie.flatMap((element: unknown) => {
            return typeof element === "string" ? razbitPoZapyatoy(element) : [];
        });
    }

    return [];
}

/** Делит строку по запятым и убирает пустые/пробельные элементы. */
function razbitPoZapyatoy(znachenie: string): string[] {
    return znachenie
        .split(",")
        .map((element: string) => element.trim())
        .filter((element: string) => element !== "");
}

/**
 * Сериализует фильтр в query.
 *
 * Пишутся только значения, отличные от значений по умолчанию, чтобы ссылка
 * не обрастала пустыми параметрами. Статусы и связи — через запятую,
 * булево — `"1"`.
 */
export function serializovatFiltriVQuery(filters: UnitFilters): Record<string, string> {
    const query: Record<string, string> = {};

    if (filters.search !== null) {
        query.search = filters.search;
    }
    if (filters.name !== null) {
        query.name = filters.name;
    }
    if (filters.branch !== null) {
        query.branch = filters.branch;
    }
    if (filters.projectId !== null) {
        query.projectId = filters.projectId;
    }
    if (filters.onlyMine) {
        query.onlyMine = "1";
    }
    if (filters.statuses.length > 0) {
        query.statuses = filters.statuses.join(",");
    }
    if (filters.unitId !== null) {
        query.unitId = filters.unitId;
    }
    if (filters.unitIds.length > 0) {
        query.unitIds = filters.unitIds.join(",");
    }
    if (filters.sort !== DEFAULT_UNIT_FILTERS.sort) {
        query.sort = filters.sort;
    }

    return query;
}

/**
 * Читает фильтр из query.
 *
 * Всегда возвращает полный `UnitFilters` с дефолтами: неизвестные и битые
 * значения отбрасываются нормализацией.
 */
export function prochitatFiltriIzQuery(query: Record<string, unknown>): UnitFilters {
    return normalizovatFiltri({
        search: pervayaStroka(query.search),
        name: pervayaStroka(query.name),
        branch: pervayaStroka(query.branch),
        projectId: pervayaStroka(query.projectId),
        onlyMine: pervayaStroka(query.onlyMine),
        statuses: spisokStrok(query.statuses),
        unitId: pervayaStroka(query.unitId),
        unitIds: spisokStrok(query.unitIds),
        sort: pervayaStroka(query.sort),
    });
}
