/**
 * Статус подтверждения репозитория.
 *
 * У `/repo/list` серверных фильтров нет (только `limit`/`offset`), поэтому и
 * фильтрация, и сортировка выполняются на клиенте.
 */
export type HranilishaFilterStatus = "confirmed" | "unconfirmed";

/** Допустимые сортировки клиентского списка репозиториев. */
export type HranilishaSort = "name_asc" | "type_asc";

/** Единая модель фильтра списка репозиториев. */
export type HranilishaFiltri = {
    /** Подстрока по названию ИЛИ URL репозитория. */
    search: string | null;
    /** Выбранный тип репозитория; `null` — все типы. */
    type: string | null;
    /** Выбранные статусы подтверждения; пустой массив — все. */
    statuses: HranilishaFilterStatus[];
    sort: HranilishaSort;
};

/** Значения по умолчанию; отсутствующие поля нормализации берутся отсюда. */
export const DEFAULT_HRANILISHA_FILTERS: HranilishaFiltri = {
    search: null,
    type: null,
    statuses: [],
    sort: "name_asc",
};

/** Ключи, по которым можно строить чип активного фильтра (сортировка — не чип). */
export type HranilishaFilterKey = Exclude<keyof HranilishaFiltri, "sort">;

/** Описание активного фильтра для полосы чипов. */
export type HranilishaFilterChip = {
    key: HranilishaFilterKey;
    /** Значение чипа: для `statuses` — конкретный статус, для `type` — тип. */
    value?: string;
    /** Готовое имя; если не задано — переводится по ключу. */
    label?: string;
};

const DOPUSTIMIE_STATUSI: HranilishaFilterStatus[] = [
    "confirmed",
    "unconfirmed",
];

const DOPUSTIMIE_SORTIROVKI: HranilishaSort[] = [
    "name_asc",
    "type_asc",
];

/**
 * Приводит строковое значение (в том числе из URL) к непустой строке или null.
 * Значения других типов отбрасываются — вход может быть произвольным.
 */
function normalizovatStroku(raw: unknown): string | null {
    if (typeof raw !== "string") {
        return null;
    }

    const obrezannaya = raw.trim();

    return obrezannaya === "" ? null : obrezannaya;
}

/**
 * Оставляет только известные статусы, убирает дубликаты и сохраняет порядок
 * первого появления. Не массив — пустой список.
 */
function normalizovatStatusi(raw: unknown): HranilishaFilterStatus[] {
    if (!Array.isArray(raw)) {
        return [];
    }

    const rezultat = new Set<HranilishaFilterStatus>();

    raw.forEach((znachenie: unknown) => {
        if (typeof znachenie === "string" && DOPUSTIMIE_STATUSI.includes(znachenie as HranilishaFilterStatus)) {
            rezultat.add(znachenie as HranilishaFilterStatus);
        }
    });

    return Array.from(rezultat);
}

/** Пропускает только значения из замороженного списка сортировок. */
function normalizovatSort(raw: unknown): HranilishaSort {
    if (typeof raw === "string" && DOPUSTIMIE_SORTIROVKI.includes(raw as HranilishaSort)) {
        return raw as HranilishaSort;
    }

    return DEFAULT_HRANILISHA_FILTERS.sort;
}

/**
 * Приводит произвольный объект из localStorage/URL к валидному `HranilishaFiltri`.
 *
 * Возвращает новый объект и не мутирует вход. Битые, отсутствующие и
 * неизвестные значения заменяются значениями по умолчанию.
 */
export function normalizovatHranilishaFiltri(raw: unknown): HranilishaFiltri {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        return {
            ...DEFAULT_HRANILISHA_FILTERS,
            statuses: [],
        };
    }

    const dannie = raw as Record<string, unknown>;

    return {
        search: normalizovatStroku(dannie.search),
        type: normalizovatStroku(dannie.type),
        statuses: normalizovatStatusi(dannie.statuses),
        sort: normalizovatSort(dannie.sort),
    };
}
