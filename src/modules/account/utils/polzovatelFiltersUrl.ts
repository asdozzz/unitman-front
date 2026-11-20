import {
    DEFAULT_POLZOVATEL_FILTERS,
    normalizovatPolzovatelFiltri,
    type PolzovatelFiltri,
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/model/PolzovatelFiltri";

/**
 * Кодек фильтра списка аккаунтов для query-параметров URL.
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
 * не обрастала пустыми параметрами. Статусы — через запятую.
 */
export function serializovatFiltriVQuery(filters: PolzovatelFiltri): Record<string, string> {
    const query: Record<string, string> = {};

    if (filters.search !== null) {
        query.search = filters.search;
    }
    if (filters.statuses.length > 0) {
        query.statuses = filters.statuses.join(",");
    }
    if (filters.role !== null) {
        query.role = filters.role;
    }
    if (filters.sort !== DEFAULT_POLZOVATEL_FILTERS.sort) {
        query.sort = filters.sort;
    }

    return query;
}

/**
 * Читает фильтр из query.
 *
 * Всегда возвращает полный `PolzovatelFiltri` с дефолтами: неизвестные и
 * битые значения отбрасываются нормализацией.
 */
export function prochitatFiltriIzQuery(query: Record<string, unknown>): PolzovatelFiltri {
    return normalizovatPolzovatelFiltri({
        search: pervayaStroka(query.search),
        statuses: spisokStrok(query.statuses),
        role: pervayaStroka(query.role),
        sort: pervayaStroka(query.sort),
    });
}
