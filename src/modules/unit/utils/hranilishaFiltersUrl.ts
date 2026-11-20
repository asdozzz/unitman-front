import {
    DEFAULT_HRANILISHA_FILTERS,
    normalizovatHranilishaFiltri,
    type HranilishaFiltri,
} from "@/modules/unit/store/SpisokHranilish/model/HranilishaFiltri";

/**
 * Кодек фильтра списка репозиториев для query-параметров URL.
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
export function serializovatFiltriVQuery(filters: HranilishaFiltri): Record<string, string> {
    const query: Record<string, string> = {};

    if (filters.search !== null) {
        query.search = filters.search;
    }
    if (filters.type !== null) {
        query.type = filters.type;
    }
    if (filters.statuses.length > 0) {
        query.statuses = filters.statuses.join(",");
    }
    if (filters.sort !== DEFAULT_HRANILISHA_FILTERS.sort) {
        query.sort = filters.sort;
    }

    return query;
}

/**
 * Читает фильтр из query.
 *
 * Всегда возвращает полный `HranilishaFiltri` с дефолтами: неизвестные и
 * битые значения отбрасываются нормализацией.
 */
export function prochitatFiltriIzQuery(query: Record<string, unknown>): HranilishaFiltri {
    return normalizovatHranilishaFiltri({
        search: pervayaStroka(query.search),
        type: pervayaStroka(query.type),
        statuses: spisokStrok(query.statuses),
        sort: pervayaStroka(query.sort),
    });
}
