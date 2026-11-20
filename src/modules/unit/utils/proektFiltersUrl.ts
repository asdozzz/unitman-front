import {
    DEFAULT_PROEKT_FILTERS,
    normalizovatProektFiltri,
    type ProektFiltri,
} from "@/modules/unit/store/SpisokProektov/model/ProektFiltri";

/**
 * Кодек фильтра списка проектов для query-параметров URL.
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
 * не обрастала пустыми параметрами. Состояния — через запятую,
 * булево — `"1"`.
 */
export function serializovatFiltriVQuery(filters: ProektFiltri): Record<string, string> {
    const query: Record<string, string> = {};

    if (filters.search !== null) {
        query.search = filters.search;
    }
    if (filters.states.length > 0) {
        query.states = filters.states.join(",");
    }
    if (filters.onlyActive) {
        query.onlyActive = "1";
    }
    if (filters.sort !== DEFAULT_PROEKT_FILTERS.sort) {
        query.sort = filters.sort;
    }

    return query;
}

/**
 * Читает фильтр из query.
 *
 * Всегда возвращает полный `ProektFiltri` с дефолтами: неизвестные и битые
 * значения отбрасываются нормализацией.
 */
export function prochitatFiltriIzQuery(query: Record<string, unknown>): ProektFiltri {
    return normalizovatProektFiltri({
        search: pervayaStroka(query.search),
        states: spisokStrok(query.states),
        onlyActive: pervayaStroka(query.onlyActive),
        sort: pervayaStroka(query.sort),
    });
}
