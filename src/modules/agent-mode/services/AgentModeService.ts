import apiClient from "@/bootstrap/apiClient";
import type { ApiResponse } from "@/bootstrap/apiClient/ApiResponse";
import type {
    AgentModeFull,
    IzmenitRezhimAgentaPayload,
    NastroitRezhimAgentaPayload,
    NastroykaRezhimaAgenta,
    SozdatRezhimAgentaPayload,
    SpisokRezhimovAgenta,
    TipChataAgenta,
} from "@/modules/agent-mode/model/AgentMode";

/**
 * Сервис модов агентов OpenCode.
 *
 * `apiClient` уже содержит `/api`, поэтому пути начинаются с `/opencode`.
 */
class AgentModeService {
    spisok(): Promise<ApiResponse<SpisokRezhimovAgenta>> {
        return apiClient.get<SpisokRezhimovAgenta>("/opencode/agent-modes/spisok");
    }

    read(id: string): Promise<ApiResponse<AgentModeFull>> {
        return apiClient.post<AgentModeFull>("/opencode/agent-modes/read", { id });
    }

    sozdat(params: SozdatRezhimAgentaPayload): Promise<ApiResponse<{ id: string; slug: string }>> {
        return apiClient.post<{ id: string; slug: string }>("/opencode/agent-modes/sozdat", params);
    }

    izmenit(params: IzmenitRezhimAgentaPayload): Promise<ApiResponse<{ id: string; version: number }>> {
        return apiClient.post<{ id: string; version: number }>("/opencode/agent-modes/izmenit", params);
    }

    udalit(id: string): Promise<ApiResponse<null>> {
        return apiClient.post<null>("/opencode/agent-modes/udalit", { id });
    }

    nastroit(params: NastroitRezhimAgentaPayload): Promise<ApiResponse<NastroykaRezhimaAgenta>> {
        return apiClient.post<NastroykaRezhimaAgenta>("/opencode/agent-modes/nastroit", params);
    }

    poUmolchaniyu(chatType: TipChataAgenta, modeId: string): Promise<ApiResponse<null>> {
        return apiClient.post<null>("/opencode/agent-modes/poUmolchaniyu", { chatType, modeId });
    }
}

export default new AgentModeService();
