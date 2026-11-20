import type {UnitUiStatus} from "@/modules/unit/utils/unitStatus";

/**
 * Статусы, которые поддерживает серверный фильтр списка юнитов.
 *
 * `UnitUiStatus` дополнительно содержит `broken`, но `deriveUnitUiState` его
 * не возвращает, а бэкенд его не принимает — поэтому исключаем.
 */
export type UnitFilterStatus = Exclude<UnitUiStatus, "broken">;

/** Допустимые сортировки списка (совпадают с контрактом API). */
export type UnitSort = "created_desc" | "updated_desc" | "name_asc" | "status_priority";

/** Единая модель фильтра списка юнитов. */
export type UnitFilters = {
    /** Подстрока по имени ИЛИ ветке. */
    search: string | null;
    /** Устаревшие поля: поддерживаются API, в тулбаре не показываются. */
    name: string | null;
    branch: string | null;
    projectId: string | null;
    onlyMine: boolean;
    statuses: UnitFilterStatus[];
    /** Deep-link ?id= — юнит, на который ведёт ссылка. */
    unitId: string | null;
    /** Связи через помощник переменной. */
    unitIds: string[];
    sort: UnitSort;
};

/** Значения по умолчанию; отсутствующие поля нормализации берутся отсюда. */
export const DEFAULT_UNIT_FILTERS: UnitFilters = {
    search: null,
    name: null,
    branch: null,
    projectId: null,
    onlyMine: false,
    statuses: [],
    unitId: null,
    unitIds: [],
    sort: "updated_desc",
};

/** Ключи, по которым можно строить чип активного фильтра (сортировка — не чип). */
export type UnitFilterKey = Exclude<keyof UnitFilters, "sort">;

/** Описание активного фильтра для полосы чипов. */
export type UnitFilterChip = {
    key: UnitFilterKey;
    /** Значение чипа: для statuses/unitIds — конкретный элемент. */
    value?: string;
    /** Готовое имя (проект, юнит, ветка); если не задано — переводится по key. */
    label?: string;
};

const DOPUSTIMIE_STATUSI: UnitFilterStatus[] = [
    "running",
    "busy",
    "prepared",
    "stopped",
    "error",
];

const DOPUSTIMIE_SORTIROVKI: UnitSort[] = [
    "created_desc",
    "updated_desc",
    "name_asc",
    "status_priority",
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
 * Приводит флаг «только мои» к boolean.
 *
 * Из query строка приходит как `"true"` или `"1"` — оба считаем включённым
 * флагом, всё остальное — выключенным.
 */
function normalizovatOnlyMine(raw: unknown): boolean {
    return raw === true || raw === "true" || raw === "1";
}

/**
 * Оставляет только известные статусы, убирает дубликаты и сохраняет порядок
 * первого появления. Не массив — пустой список.
 */
function normalizovatStatusi(raw: unknown): UnitFilterStatus[] {
    if (!Array.isArray(raw)) {
        return [];
    }

    const rezultat = new Set<UnitFilterStatus>();

    raw.forEach((znachenie: unknown) => {
        if (typeof znachenie === "string" && DOPUSTIMIE_STATUSI.includes(znachenie as UnitFilterStatus)) {
            rezultat.add(znachenie as UnitFilterStatus);
        }
    });

    return Array.from(rezultat);
}

/**
 * Оставляет непустые строки, убирает дубликаты и сохраняет порядок.
 * Не массив — пустой список.
 */
function normalizovatUnitIds(raw: unknown): string[] {
    if (!Array.isArray(raw)) {
        return [];
    }

    const rezultat = new Set<string>();

    raw.forEach((znachenie: unknown) => {
        const stroka = normalizovatStroku(znachenie);

        if (stroka !== null) {
            rezultat.add(stroka);
        }
    });

    return Array.from(rezultat);
}

/** Пропускает только значения из замороженного списка сортировок. */
function normalizovatSort(raw: unknown): UnitSort {
    if (typeof raw === "string" && DOPUSTIMIE_SORTIROVKI.includes(raw as UnitSort)) {
        return raw as UnitSort;
    }

    return DEFAULT_UNIT_FILTERS.sort;
}

/**
 * Приводит произвольный объект из localStorage/URL к валидному `UnitFilters`.
 *
 * Возвращает новый объект и не мутирует вход. Битые, отсутствующие и
 * неизвестные значения заменяются значениями по умолчанию.
 */
export function normalizovatFiltri(raw: unknown): UnitFilters {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        return {
            ...DEFAULT_UNIT_FILTERS,
            statuses: [],
            unitIds: [],
        };
    }

    const dannie = raw as Record<string, unknown>;

    return {
        search: normalizovatStroku(dannie.search),
        name: normalizovatStroku(dannie.name),
        branch: normalizovatStroku(dannie.branch),
        projectId: normalizovatStroku(dannie.projectId),
        onlyMine: normalizovatOnlyMine(dannie.onlyMine),
        statuses: normalizovatStatusi(dannie.statuses),
        unitId: normalizovatStroku(dannie.unitId),
        unitIds: normalizovatUnitIds(dannie.unitIds),
        sort: normalizovatSort(dannie.sort),
    };
}
