/**
 * Модель фильтра списка аккаунтов для администрирования.
 *
 * `search` уходит на сервер как `query` (серверный поиск), статусы, роль и
 * сортировка применяются клиентски поверх полученного списка.
 */

/** Статус аккаунта в терминах UI: активен, заблокирован, ждёт активации или email не подтверждён. */
export type PolzovatelFilterStatus = "active" | "blocked" | "pending" | "unverified";

/** Допустимые сортировки списка. */
export type PolzovatelSort = "email_asc" | "nickname_asc";

/** Единая модель фильтра списка аккаунтов. */
export type PolzovatelFiltri = {
    /** Подстрока для серверного поиска. */
    search: string | null;
    /** Статусы блокировки; пустой массив — все. */
    statuses: PolzovatelFilterStatus[];
    /** Роль (например, `ROLE_ADMIN`); null — все роли. */
    role: string | null;
    /** Сортировка списка. */
    sort: PolzovatelSort;
};

/** Значения по умолчанию; отсутствующие поля нормализации берутся отсюда. */
export const DEFAULT_POLZOVATEL_FILTERS: PolzovatelFiltri = {
    search: null,
    statuses: [],
    role: null,
    sort: "email_asc",
};

/** Ключи, по которым можно строить чип активного фильтра (сортировка — не чип). */
export type PolzovatelFilterKey = Exclude<keyof PolzovatelFiltri, "sort">;

/** Описание активного фильтра для полосы чипов. */
export type PolzovatelFilterChip = {
    key: PolzovatelFilterKey;
    /** Значение чипа: для statuses — конкретный статус. */
    value?: string;
    /** Готовое имя (роль); если не задано — переводится по key. */
    label?: string;
};

const DOPUSTIMIE_STATUSI: PolzovatelFilterStatus[] = ["active", "blocked", "pending", "unverified"];

const DOPUSTIMIE_SORTIROVKI: PolzovatelSort[] = ["email_asc", "nickname_asc"];

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
function normalizovatStatusi(raw: unknown): PolzovatelFilterStatus[] {
    if (!Array.isArray(raw)) {
        return [];
    }

    const rezultat = new Set<PolzovatelFilterStatus>();

    raw.forEach((znachenie: unknown) => {
        if (typeof znachenie === "string" && DOPUSTIMIE_STATUSI.includes(znachenie as PolzovatelFilterStatus)) {
            rezultat.add(znachenie as PolzovatelFilterStatus);
        }
    });

    return Array.from(rezultat);
}

/** Пропускает только значения из замороженного списка сортировок. */
function normalizovatSort(raw: unknown): PolzovatelSort {
    if (typeof raw === "string" && DOPUSTIMIE_SORTIROVKI.includes(raw as PolzovatelSort)) {
        return raw as PolzovatelSort;
    }

    return DEFAULT_POLZOVATEL_FILTERS.sort;
}

/**
 * Приводит произвольный объект из localStorage/URL к валидному `PolzovatelFiltri`.
 *
 * Возвращает новый объект и не мутирует вход. Битые, отсутствующие и
 * неизвестные значения заменяются значениями по умолчанию.
 */
export function normalizovatPolzovatelFiltri(raw: unknown): PolzovatelFiltri {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        return {
            ...DEFAULT_POLZOVATEL_FILTERS,
            statuses: [],
        };
    }

    const dannie = raw as Record<string, unknown>;

    return {
        search: normalizovatStroku(dannie.search),
        statuses: normalizovatStatusi(dannie.statuses),
        role: normalizovatStroku(dannie.role),
        sort: normalizovatSort(dannie.sort),
    };
}
