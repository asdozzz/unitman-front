import apiClient from "@/bootstrap/apiClient";
import type { ApiResponse } from "@/bootstrap/apiClient/ApiResponse";
import type {
    WorkspaceAnswer,
    WorkspaceLaunch,
    WorkspaceSession,
    WorkspaceState,
    WorkspaceTurn,
} from "@/modules/opencode/model/WorkspaceSession";
import type { ProgressHoda } from "@/modules/opencode/model/ProgressHoda";

export type FiltrWorkspace = {
    onlyActive?: boolean;
    search?: string | null;
};

export type ZahvatUvedomleniyWorkspaceResponse = {
    ids: string[];
};

/**
 * Сервис workspace OpenCode.
 *
 * ВАЖНО: независимый бэкенд-агрегат workspace (`/opencode/workspace-session/*`,
 * таблицы `opencode_workspace_session*`) пока не имеет пути записи — создание
 * и жизненный цикл workspace живут в старом агрегате сессий OpenCode
 * (`opencode_session` + `opencode_workspace`). Поэтому чат workspace работает
 * через маршруты старого агрегата: ид сессии workspace — это ид сессии
 * OpenCode (см. докблок `OpenCodeService`).
 *
 * Когда запись переехит в независимые таблицы, методы ниже переключаются на
 * `/opencode/workspace-session/*` без изменения сигнатур.
 */
class WorkspaceService {
    spisok(params?: FiltrWorkspace): Promise<ApiResponse<WorkspaceSession[]>> {
        return apiClient.get<WorkspaceSession[]>("/opencode/workspace/spisok", params);
    }

    sozdat(params: {
        name: string;
        credentialId: string;
        projectIds: string[];
        prompt: string;
        branch: string;
        projectBranches?: { projectId: string; branch: string }[];
    }): Promise<ApiResponse<{ id: string; status: WorkspaceSession["status"] }>> {
        return apiClient.post<{ id: string; status: WorkspaceSession["status"] }>(
            "/opencode/workspace/sozdat",
            params,
        );
    }

    sostoyanie(params: { workspaceId: string }): Promise<ApiResponse<WorkspaceState>> {
        return apiClient.post<WorkspaceState>("/opencode/workspace/sostoyanie", params);
    }

    arhivirovat(params: {
        workspaceId: string;
        force?: boolean;
    }): Promise<ApiResponse<{ requiresConfirmation?: boolean; dirtyProjects?: string[] }>> {
        return apiClient.post<{ requiresConfirmation?: boolean; dirtyProjects?: string[] }>(
            "/opencode/workspace/arhivirovat",
            params,
        );
    }

    vosstanovit(params: { workspaceId: string }): Promise<ApiResponse<null>> {
        return apiClient.post<null>("/opencode/workspace/vosstanovit", params);
    }

    udalit(params: { workspaceId: string }): Promise<ApiResponse<null>> {
        return apiClient.post<null>("/opencode/workspace/udalit", params);
    }

    ssylkaPoPortu(params: {
        workspaceId: string;
        port: number;
        type?: string | null;
        suffix?: string | null;
    }): Promise<ApiResponse<{ link: string }>> {
        return apiClient.post<{ link: string }>("/opencode/workspace/ssylkaPoPortu", params);
    }

    prompt(params: { workspaceId: string; text: string }): Promise<ApiResponse<WorkspaceLaunch>> {
        return apiClient.post<WorkspaceLaunch>("/opencode/prompt", {
            sessionId: params.workspaceId,
            text: params.text,
        });
    }

    /**
     * Ответ на вопросы предыдущего хода.
     *
     * Чат workspace может обслуживаться двумя агрегатами:
     * - легаси `/opencode/otvetit` — DTO `OtvetitNaVopros` с camelCase-ключами
     *   (`questionId`/`optionId`/`text`);
     * - новый `/opencode/workspace-session/otvetit` — читает PascalCase
     *   (`QuestionId`/`OptionId`/`Text`).
     *
     * Чтобы ответ не зависел от того, какой агрегат стоит за маршрутом, шлём
     * оба набора ключей. Лишние ключи каждый обработчик игнорирует, а без
     * совпадения бэкенд отбрасывает ответ и возвращает
     * `opencode.turn.answers_required`.
     */
    otvetit(params: {
        turnId: string;
        answers: WorkspaceAnswer[];
    }): Promise<ApiResponse<WorkspaceLaunch>> {
        return apiClient.post<WorkspaceLaunch>("/opencode/otvetit", {
            turnId: params.turnId,
            answers: params.answers.map((answer) => ({
                QuestionId: answer.QuestionId,
                OptionId: answer.OptionId,
                Text: answer.Text,
                questionId: answer.QuestionId,
                optionId: answer.OptionId,
                text: answer.Text,
            })),
        });
    }

    istoriya(params: { workspaceId: string }): Promise<ApiResponse<WorkspaceTurn[]>> {
        return apiClient.post<WorkspaceTurn[]>("/opencode/istoriyaSessii", {
            sessionId: params.workspaceId,
        });
    }

    poluchitResultatHoda(params: { turnId: string }): Promise<ApiResponse<WorkspaceTurn>> {
        return apiClient.post<WorkspaceTurn>("/opencode/poluchitResultatHoda", params);
    }

    poluchitProgressHoda(params: { turnId: string }): Promise<ApiResponse<ProgressHoda | null>> {
        return apiClient.post<ProgressHoda | null>("/opencode/poluchitProgressHoda", params);
    }
}

export default new WorkspaceService();
