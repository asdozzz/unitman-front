import type { Schema } from "@/api/types";

/**
 * Область действия навыка OpenCode.
 *
 * Глобальный навык доступен всем проектам и меняется только администратором.
 * Проектный навык привязан к списку проектов и меняется их администраторами.
 */
export type OblastNavyka = "global" | "project";

/** Краткая карточка навыка (`/skill/spisok`). */
export type NavykKratko = {
    id: string;
    slug: string;
    name: string;
    description: string;
    isGlobal: boolean;
    projectIds: string[];
    version: number;
    /** Unix-время последнего изменения (секунды). */
    updatedAt: number;
    archived: boolean;
};

/** Полная карточка навыка (`/skill/read`). */
export type Navyk = {
    id: string;
    slug: string;
    name: string;
    description: string;
    content: string;
    contentHash: string;
    isGlobal: boolean;
    projectIds: string[];
    version: number;
    createdBy: string;
    updatedBy: string;
    createdAt: number;
    updatedAt: number;
    archived: boolean;
    /** Разрешено ли текущему пользователю менять навык. */
    canEdit: boolean;
};

/** Снимок версии навыка (`/skill/versii`). */
export type VersiyaNavyka = {
    version: number;
    name: string;
    description: string;
    content: string;
    contentHash: string;
    createdBy: string;
    createdAt: number;
};

/** Навык в эффективном наборе (`/skill/effektivnie`). */
export type EffektivnyyNavyk = {
    skillId: string;
    slug: string;
    containerName: string;
    name: string;
    description: string;
    content: string;
    version: number;
    hash: string;
    scope: OblastNavyka;
    /** `null` для глобального навыка. */
    projectId: string | null;
};

export type RezultatEffektivnyhNavykov = {
    skills: EffektivnyyNavyk[];
    manifestHash: string;
    totalBytes: number;
};

/**
 * Эффективные навыки для сессии OpenCode (`POST /opencode/navyki`).
 *
 * Проекты разрешаются на сервере из сессии. `truncated` сообщает, что
 * манифест обрезан по лимиту и список неполный.
 */
export type RezultatNavykovSessii = RezultatEffektivnyhNavykov & {
    truncated: boolean;
};

/** Модель формы создания/редактирования навыка. */
export type FormaNavykaModel = {
    name: string;
    slug: string;
    /** Пользователь менял slug вручную: авто-генерация больше не перезаписывает его. */
    slugIzmenenVruchnuyu: boolean;
    description: string;
    content: string;
    scope: OblastNavyka;
    projectIds: string[];
};

/** Ошибки полей формы, ключи i18n (`skill.validation.*`). */
export type OshibkiFormiNavyka = {
    name: string;
    slug: string;
    description: string;
    content: string;
    projectIds: string;
};

/** Транспортные тела запросов из сгенерированной OpenAPI-схемы. */
export type SozdatNavykPayload = Schema<"SozdatNavyk">;
export type IzmenitNavykPayload = Schema<"IzmenitNavyk">;
export type UdalitNavykPayload = Schema<"UdalitNavyk">;
export type PrikrepitNavykPayload = Schema<"PrikrepitNavykKProektam">;
export type OtkrepitNavykPayload = Schema<"OtkrepitNavykOtProekta">;
export type SpisokNavykovPayload = Schema<"PoluchitSpisokNavykov">;
export type VersiiNavykaPayload = Schema<"PoluchitVersiiNavyka">;
export type EffektivnieNavykiPayload = Schema<"PoluchitEffektivnieNavyki">;
export type NavykiSessiiPayload = Schema<"PoluchitNavykiSessii">;

/** Ограничения и паттерны совпадают с бэкендом (`ProverkaNavyka`). */
export const PATTERN_SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const MAX_NAME_LENGTH = 128;
export const MAX_DESCRIPTION_LENGTH = 512;
export const MAX_CONTENT_BYTES = 32768;

/** Пустая модель формы. */
export function pustayaFormaNavyka(scope: OblastNavyka = "global"): FormaNavykaModel {
    return {
        name: "",
        slug: "",
        slugIzmenenVruchnuyu: false,
        description: "",
        content: "",
        scope,
        projectIds: [],
    };
}

/** Пустые ошибки формы. */
export function pystieOshibkiFormi(): OshibkiFormiNavyka {
    return {
        name: "",
        slug: "",
        description: "",
        content: "",
        projectIds: "",
    };
}

/**
 * Транслитерация для клиентского превью slug.
 *
 * Бэкенд валидирует итоговое значение сам (`^[a-z0-9][a-z0-9-]{0,63}$`),
 * поэтому здесь достаточно предсказуемого латинского варианта. Пользователь
 * может изменить slug вручную, если превью не подошло.
 */
const TABLICA_TRANSLITERACII: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
    и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function slugify(znachenie: string): string {
    const latinica = Array.from(znachenie.toLowerCase())
        .map((simvol: string) => TABLICA_TRANSLITERACII[simvol] ?? simvol)
        .join("");

    return latinica
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+/, "")
        .replace(/-+$/, "")
        .slice(0, 64);
}

export function validenSlug(slug: string): boolean {
    return PATTERN_SLUG.test(slug);
}

/** Количество UTF-8 байт (совпадает с проверкой бэкенда для content). */
export function razmerVBaytah(znachenie: string): number {
    if (typeof TextEncoder !== "undefined") {
        return new TextEncoder().encode(znachenie).length;
    }

    return new Blob([znachenie]).size;
}

/** Приводит краткую карточку к безопасному виду (защита от неполного ответа). */
export function normalizovatKratkuyu(model: Partial<NavykKratko> & { id: string }): NavykKratko {
    return {
        id: model.id,
        slug: model.slug ?? "",
        name: model.name ?? model.slug ?? model.id,
        description: model.description ?? "",
        isGlobal: model.isGlobal ?? false,
        projectIds: model.projectIds ?? [],
        version: model.version ?? 1,
        updatedAt: model.updatedAt ?? 0,
        archived: model.archived ?? false,
    };
}

/**
 * Ключ i18n для ошибки бэкенда вида `skill.slug.invalid`.
 *
 * Если ключа нет, вызывающий код показывает исходное сообщение — так новые
 * коды бэкенда не ломают интерфейс.
 */
export function klyuchOshibkiNavyka(code: string): string | null {
    if (!code.startsWith("skill.") && !code.startsWith("account.")) {
        return null;
    }

    return `skill.errors.${code.replace(/^[a-z]+\./, "")}`;
}
