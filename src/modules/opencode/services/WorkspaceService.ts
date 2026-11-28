import apiClient from "@/bootstrap/apiClient";
import type { ApiResponse } from "@/bootstrap/apiClient/ApiResponse";
import type {
    FajlHodaSsilka,
    FajlHodaTekst,
    RolUchastnikaWorkspace,
    WorkspaceAnswer,
    WorkspaceLaunch,
    WorkspaceParticipant,
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
 * Чат, состояние, история, результат и прогресс идут через независимый
 * агрегат `/opencode/workspace-session/*` (таблицы
 * `opencode_workspace_session*`). Жизненный цикл и участники остаются на
 * прежних маршрутах `/opencode/workspace/*`: бэкенд внутри роутит их по
 * флагам `OPENCODE_WORKSPACE_READ/WRITE`. Сигнатуры методов не меняются.
 *
 * Артефакты хода (`poluchitSsylkuFajla`, `poluchitTekstFajla`) остаются на
 * `/opencode/fajl/*`: их обработчик ищет ход и в легаси, и в новом агрегате.
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
        /** Модель хода; пустое значение — дефолт реквизитов. */
        model?: string | null;
    }): Promise<ApiResponse<{ id: string; status: WorkspaceSession["status"] }>> {
        return apiClient.post<{ id: string; status: WorkspaceSession["status"] }>(
            "/opencode/workspace/sozdat",
            params,
        );
    }

    sostoyanie(params: { workspaceId: string }): Promise<ApiResponse<WorkspaceState>> {
        return apiClient.post<WorkspaceState>("/opencode/workspace-session/sostoyanie", params);
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

    prompt(params: {
        workspaceId: string;
        text: string;
        /** Реквизиты текущего участника; без них бэкенд берёт личные по умолчанию. */
        credentialId?: string | null;
        model?: string | null;
        agentModeId?: string | null;
    }): Promise<ApiResponse<WorkspaceLaunch>> {
        return apiClient.post<WorkspaceLaunch>("/opencode/workspace-session/prompt", {
            workspaceId: params.workspaceId,
            text: params.text,
            // Новый контроллер ключ игнорирует, но клиент продолжает передавать
            // выбранные реквизиты: контракт запроса не сужается.
            credentialId: params.credentialId ?? undefined,
            model: params.model ?? undefined,
            agentModeId: params.agentModeId ?? undefined,
        });
    }

    /**
     * Ответ на вопросы предыдущего хода.
     *
     * Новый обработчик читает PascalCase (`QuestionId`/`OptionId`/`Text`).
     * Дополнительно шлём camelCase-набор: лишние ключи игнорируются, а без
     * совпадения бэкенд возвращает `opencode.turn.answers_required`.
     */
    otvetit(params: {
        turnId: string;
        answers: WorkspaceAnswer[];
        /** Реквизиты текущего участника; без них бэкенд берёт личные по умолчанию. */
        credentialId?: string | null;
        model?: string | null;
        agentModeId?: string | null;
    }): Promise<ApiResponse<WorkspaceLaunch>> {
        return apiClient.post<WorkspaceLaunch>("/opencode/workspace-session/otvetit", {
            turnId: params.turnId,
            credentialId: params.credentialId ?? undefined,
            model: params.model ?? undefined,
            agentModeId: params.agentModeId ?? undefined,
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
        return apiClient.post<WorkspaceTurn[]>("/opencode/workspace-session/istoriya", {
            workspaceId: params.workspaceId,
        });
    }

    poluchitResultatHoda(params: { turnId: string }): Promise<ApiResponse<WorkspaceTurn>> {
        return apiClient.post<WorkspaceTurn>(
            "/opencode/workspace-session/poluchitResultatHoda",
            params,
        );
    }

    poluchitProgressHoda(params: { turnId: string }): Promise<ApiResponse<ProgressHoda | null>> {
        return apiClient.post<ProgressHoda | null>(
            "/opencode/workspace-session/poluchitProgressHoda",
            params,
        );
    }

    /** Участники workspace с ролями и личными реквизитами. */
    spisokUchastnikov(params: {
        workspaceId: string;
    }): Promise<ApiResponse<{ items: WorkspaceParticipant[] }>> {
        return apiClient.post<{ items: WorkspaceParticipant[] }>(
            "/opencode/workspace/uchastniki/spisok",
            params,
        );
    }

    /** Пригласить участника: роль `writer` или `viewer`. */
    dobavitUchastnika(params: {
        workspaceId: string;
        accountId: string;
        role: Exclude<RolUchastnikaWorkspace, "owner">;
        credentialId?: string | null;
        model?: string | null;
    }): Promise<ApiResponse<{ added: boolean }>> {
        return apiClient.post<{ added: boolean }>("/opencode/workspace/uchastniki/dobavit", {
            workspaceId: params.workspaceId,
            accountId: params.accountId,
            role: params.role,
            credentialId: params.credentialId ?? undefined,
            model: params.model ?? undefined,
        });
    }

    /** Изменить роль или личные реквизиты участника. */
    izmenitUchastnika(params: {
        workspaceId: string;
        accountId: string;
        role: Exclude<RolUchastnikaWorkspace, "owner">;
        credentialId?: string | null;
        model?: string | null;
    }): Promise<ApiResponse<{ updated: boolean }>> {
        return apiClient.post<{ updated: boolean }>("/opencode/workspace/uchastniki/izmenit", {
            workspaceId: params.workspaceId,
            accountId: params.accountId,
            role: params.role,
            credentialId: params.credentialId ?? undefined,
            model: params.model ?? undefined,
        });
    }

    /** Удалить участника; владельца удалить нельзя. */
    udalitUchastnika(params: {
        workspaceId: string;
        accountId: string;
    }): Promise<ApiResponse<{ removed: boolean }>> {
        return apiClient.post<{ removed: boolean }>("/opencode/workspace/uchastniki/udalit", params);
    }

    /** Подписанная ссылка на скачивание артефакта хода. */
    poluchitSsylkuFajla(params: {
        turnId: string;
        fileId: string;
    }): Promise<ApiResponse<FajlHodaSsilka>> {
        return apiClient.post<FajlHodaSsilka>("/opencode/fajl/ssylka", params);
    }

    /** Текст артефакта хода для предпросмотра (лимит 512 КБ). */
    poluchitTekstFajla(params: {
        turnId: string;
        fileId: string;
    }): Promise<ApiResponse<FajlHodaTekst>> {
        return apiClient.post<FajlHodaTekst>("/opencode/fajl/tekst", params);
    }
}

export default new WorkspaceService();
