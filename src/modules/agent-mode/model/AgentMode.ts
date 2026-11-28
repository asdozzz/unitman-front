/**
 * Моды агентов OpenCode.
 *
 * Общий мод (`isGlobal`) доступен всем, персональный — только владельцу.
 * Настройки (`credentialId`, `model`, `enabled`, `sortOrder`) принадлежат
 * текущему пользователю и не меняют общий каталог.
 */

export type RezhimDostupaAgenta = "build" | "plan";

export type AgentMode = {
    id: string;
    slug: string;
    name: string;
    description: string;
    accessMode: RezhimDostupaAgenta;
    isGlobal: boolean;
    isOwner: boolean;
    enabled: boolean;
    sortOrder: number;
    credentialId: string | null;
    model: string | null;
    isDefaultUnit: boolean;
    isDefaultWorkspace: boolean;
};

export type TipChataAgenta = "unit" | "workspace";

export type DefaultyRezhimovAgenta = Record<TipChataAgenta, string>;

export type SpisokRezhimovAgenta = {
    modes: AgentMode[];
    defaults: DefaultyRezhimovAgenta;
};

export type AgentModeFull = {
    id: string;
    slug: string;
    name: string;
    description: string;
    prompt: string;
    accessMode: RezhimDostupaAgenta;
    isGlobal: boolean;
    isOwner: boolean;
    version: number;
    createdAt: number;
    updatedAt: number;
};

export type SozdatRezhimAgentaPayload = {
    slug?: string | null;
    name: string;
    description?: string;
    prompt: string;
    accessMode: RezhimDostupaAgenta;
    scope: "global" | "personal";
};

export type IzmenitRezhimAgentaPayload = {
    id: string;
    slug?: string | null;
    name?: string;
    description?: string;
    prompt?: string;
    accessMode?: RezhimDostupaAgenta;
};

export type NastroitRezhimAgentaPayload = {
    modeId: string;
    credentialId?: string | null;
    model?: string | null;
    enabled?: boolean;
    sortOrder?: number;
};

export type NastroykaRezhimaAgenta = {
    modeId: string;
    credentialId: string | null;
    model: string | null;
    enabled: boolean;
    sortOrder: number;
};

/** Доступные для выбора моды: только включённые, в пользовательском порядке. */
export function dostupnyeRezhimy(modes: AgentMode[]): AgentMode[] {
    return modes
        .filter((mode) => mode.enabled)
        .slice()
        .sort((left, right) => {
            if (left.sortOrder !== right.sortOrder) {
                return left.sortOrder - right.sortOrder;
            }

            if (left.isGlobal !== right.isGlobal) {
                return left.isGlobal ? -1 : 1;
            }

            return left.name.localeCompare(right.name);
        });
}

/** Мод по умолчанию для типа чата с фолбэком на первый включённый. */
export function rezhimPoUmolchaniyu(
    modes: AgentMode[],
    defaults: DefaultyRezhimovAgenta,
    tip: TipChataAgenta,
): AgentMode | null {
    const poId = modes.find((mode) => mode.id === defaults[tip]);

    if (poId !== undefined && poId.enabled) {
        return poId;
    }

    return dostupnyeRezhimy(modes)[0] ?? null;
}
