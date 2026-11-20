/**
 * Состояние проекта из `ProjectListItem.state`.
 *
 * Список повторяет контракт OpenAPI: серверных фильтров у `/project/list`
 * нет, поэтому и фильтрация, и сортировка выполняются на клиенте.
 */
export type ProektFilterStatus =
    | "NEW"
    | "BUILD_PENDING"
    | "BUILD_SUCCESS"
    | "BUILD_ERROR"
    | "REMOVE_PENDING"
    | "REMOVE_ERROR";

/** Допустимые сортировки клиентского списка проектов. */
export type ProektSort = "name_asc" | "code_asc" | "state_priority";

/** Единая модель фильтра списка проектов. */
export type ProektFiltri = {
    /** Подстрока по названию ИЛИ коду проекта. */
    search: string | null;
    /** Выбранные состояния; пустой массив — все. */
    states: ProektFilterStatus[];
    /** Показывать только активные проекты (`ProjectListItem.isActive`). */
    onlyActive: boolean;
    sort: ProektSort;
};

/** Значения по умолчанию; отсутствующие поля нормализации берутся отсюда. */
export const DEFAULT_PROEKT_FILTERS: ProektFiltri = {
    search: null,
    states: [],
    onlyActive: false,
    sort: "name_asc",
};

/** Ключи, по которым можно строить чип активного фильтра (сортировка — не чип). */
export type ProektFilterKey = Exclude<keyof ProektFiltri, "sort">;

/** Описание активного фильтра для полосы чипов. */
export type ProektFilterChip = {
    key: ProektFilterKey;
    /** Значение чипа: для `states` — конкретное состояние. */
    value?: string;
    /** Готовое имя; если не задано — переводится по ключу. */
    label?: string;
};

const DOPUSTIMIE_STATUSI: ProektFilterStatus[] = [
    "NEW",
    "BUILD_PENDING",
    "BUILD_SUCCESS",
    "BUILD_ERROR",
    "REMOVE_PENDING",
    "REMOVE_ERROR",
];

const DOPUSTIMIE_SORTIROVKI: ProektSort[] = [
    "name_asc",
    "code_asc",
    "state_priority",
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
 * Приводит флаг «только активные» к boolean.
 *
 * Из query строка приходит как `"true"` или `"1"` — оба считаем включённым
 * флагом, всё остальное — выключенным.
 */
function normalizovatOnlyActive(raw: unknown): boolean {
    return raw === true || raw === "true" || raw === "1";
}

/**
 * Оставляет только известные состояния, убирает дубликаты и сохраняет порядок
 * первого появления. Не массив — пустой список.
 */
function normalizovatStatusi(raw: unknown): ProektFilterStatus[] {
    if (!Array.isArray(raw)) {
        return [];
    }

    const rezultat = new Set<ProektFilterStatus>();

    raw.forEach((znachenie: unknown) => {
        if (typeof znachenie === "string" && DOPUSTIMIE_STATUSI.includes(znachenie as ProektFilterStatus)) {
            rezultat.add(znachenie as ProektFilterStatus);
        }
    });

    return Array.from(rezultat);
}

/** Пропускает только значения из замороженного списка сортировок. */
function normalizovatSort(raw: unknown): ProektSort {
    if (typeof raw === "string" && DOPUSTIMIE_SORTIROVKI.includes(raw as ProektSort)) {
        return raw as ProektSort;
    }

    return DEFAULT_PROEKT_FILTERS.sort;
}

/**
 * Приводит произвольный объект из localStorage/URL к валидному `ProektFiltri`.
 *
 * Возвращает новый объект и не мутирует вход. Битые, отсутствующие и
 * неизвестные значения заменяются значениями по умолчанию.
 */
export function normalizovatProektFiltri(raw: unknown): ProektFiltri {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        return {
            ...DEFAULT_PROEKT_FILTERS,
            states: [],
        };
    }

    const dannie = raw as Record<string, unknown>;

    return {
        search: normalizovatStroku(dannie.search),
        states: normalizovatStatusi(dannie.states),
        onlyActive: normalizovatOnlyActive(dannie.onlyActive),
        sort: normalizovatSort(dannie.sort),
    };
}
