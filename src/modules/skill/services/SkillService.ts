import apiClient from "@/bootstrap/apiClient";
import type {
    EffektivnieNavykiPayload,
    EffektivnyyNavyk,
    IzmenitNavykPayload,
    NavykiSessiiPayload,
    Navyk,
    NavykKratko,
    OtkrepitNavykPayload,
    PrikrepitNavykPayload,
    RezultatEffektivnyhNavykov,
    RezultatNavykovSessii,
    SpisokNavykovPayload,
    SozdatNavykPayload,
    UdalitNavykPayload,
    VersiiNavykaPayload,
    VersiyaNavyka,
} from "@/modules/skill/model/Navyk";

export type RezultatSozdaniyaNavyka = {
    id: string;
    slug: string;
};

export type RezultatIzmeneniyaNavyka = {
    id: string;
    version: number;
};

export type RezultatPrivyazkiNavyka = {
    projectIds: string[];
};

/**
 * Результат запроса навыков сессии.
 *
 * `empty` соответствует `404` (старый бэкенд без эндпоинта): чат должен
 * работать так, будто навыков нет. Остальные ошибки (`401`, `403`, `422`
 * и сетевые) сводятся к `error`, чтобы потребитель показал баннер, а не
 * сломал чат.
 */
export type OtvetNavykovSessii =
    | { status: "success"; data: RezultatNavykovSessii }
    | { status: "empty" }
    | { status: "error"; message: string; code: number };

/** Тело ответа может прийти в конверте `{status,data}` или «плоским». */
function izvlechenoIzKonverta(body: unknown): unknown {
    if (body !== null && typeof body === "object" && "data" in body) {
        return (body as { data: unknown }).data;
    }

    return body;
}

/** Приводит ответ к безопасной модели, даже если бэкенд прислал неполный. */
function normalizovatNavykiSessii(value: unknown): RezultatNavykovSessii {
    const source = (value ?? {}) as Partial<RezultatNavykovSessii>;

    return {
        skills: Array.isArray(source.skills) ? source.skills : [],
        manifestHash: typeof source.manifestHash === "string" ? source.manifestHash : "",
        totalBytes: typeof source.totalBytes === "number" ? source.totalBytes : 0,
        truncated: source.truncated === true,
    };
}

/**
 * Сервис пользовательских навыков OpenCode (`/skill/*`).
 *
 * Тела запросов берутся из сгенерированной OpenAPI-схемы, ответы описаны
 * моделями модуля: у эндпоинтов навыков схема ответа пока объявляет только
 * конверт `status`, поэтому полезную нагрузку типизируем явно.
 */
class SkillService {
    spisok(params: SpisokNavykovPayload = {}) {
        return apiClient.post<NavykKratko[]>("/skill/spisok", params);
    }

    read(id: string) {
        return apiClient.post<Navyk>("/skill/read", { id });
    }

    sozdat(params: SozdatNavykPayload) {
        return apiClient.post<RezultatSozdaniyaNavyka>("/skill/sozdat", params);
    }

    izmenit(params: IzmenitNavykPayload) {
        return apiClient.post<RezultatIzmeneniyaNavyka>("/skill/izmenit", params);
    }

    /** Архивирование (мягкое удаление) навыка. */
    udalit(params: UdalitNavykPayload) {
        return apiClient.post<null>("/skill/udalit", params);
    }

    prikrepit(params: PrikrepitNavykPayload) {
        return apiClient.post<RezultatPrivyazkiNavyka>("/skill/prikrepit", params);
    }

    otkrepit(params: OtkrepitNavykPayload) {
        return apiClient.post<RezultatPrivyazkiNavyka>("/skill/otkrepit", params);
    }

    versii(params: VersiiNavykaPayload) {
        return apiClient.post<VersiyaNavyka[]>("/skill/versii", params);
    }

    /**
     * Эффективный набор навыков для проектов.
     *
     * Используется диагностикой и будущим чатом: `PanelNavykov` принимает уже
     * готовый список, поэтому загрузку выполняет потребитель.
     */
    effektivnie(params: EffektivnieNavykiPayload = {}) {
        return apiClient.post<RezultatEffektivnyhNavykov>("/skill/effektivnie", params);
    }

    /**
     * Эффективные навыки для существующей сессии OpenCode.
     *
     * Проекты разрешаются сервером из сессии, поэтому `projectIds` не
     * передаются. Используем «сырой» вызов: только он сохраняет HTTP-статус,
     * по которому `404` (старый бэкенд) отличается от реальной ошибки.
     */
    async navykiSessii(params: NavykiSessiiPayload & { sessionId: string }): Promise<OtvetNavykovSessii> {
        const result = await apiClient.requestRaw<unknown>("post", "/opencode/navyki", params);

        if (result.status === 404) {
            return { status: "empty" };
        }

        if (!result.ok) {
            return {
                status: "error",
                message: result.error ?? "",
                code: result.status,
            };
        }

        return {
            status: "success",
            data: normalizovatNavykiSessii(izvlechenoIzKonverta(result.data)),
        };
    }
}

export type { EffektivnyyNavyk };

export default new SkillService();
