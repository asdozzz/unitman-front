import apiClient from "@/bootstrap/apiClient";
import type { ApiResponse } from "@/bootstrap/apiClient/ApiResponse";
import type {
    UnitSession,
    UnitSessionAnswer,
    UnitSessionLaunch,
    UnitSessionNotification,
    UnitSessionState,
    UnitSessionTurn,
} from "@/modules/opencode/model/UnitSession";
import type { ProgressHoda } from "@/modules/opencode/model/ProgressHoda";

export type FiltrSessiyUnita = {
    onlyActive?: boolean;
    search?: string | null;
};

export type UvedomleniyaSessiyUnitaResponse = {
    notifications: UnitSessionNotification[];
    channel: string;
};

export type ZahvatUvedomleniySessiyUnitaResponse = {
    ids: string[];
};

/**
 * Сервис unit-сессий OpenCode.
 *
 * Не знает о workspace: другие методы, другие типы, другие маршруты.
 */
class UnitSessionService {
    spisok(params?: FiltrSessiyUnita): Promise<ApiResponse<UnitSession[]>> {
        return apiClient.get<UnitSession[]>("/opencode/unit-session/spisok", params);
    }

    sozdat(params: {
        credentialId: string;
        title?: string | null;
        unitId: string;
        /** Модель хода; пустое значение — дефолт реквизитов. */
        model?: string | null;
    }): Promise<ApiResponse<{ id: string }>> {
        return apiClient.post<{ id: string }>("/opencode/unit-session/sozdat", params);
    }

    sessiyaPoUnitu(params: { unitId: string }): Promise<ApiResponse<UnitSession | null>> {
        return apiClient.post<UnitSession | null>("/opencode/unit-session/sessiyaPoUnitu", params);
    }

    prompt(params: {
        sessionId: string;
        text: string;
        model?: string | null;
    }): Promise<ApiResponse<UnitSessionLaunch>> {
        return apiClient.post<UnitSessionLaunch>("/opencode/unit-session/prompt", params);
    }

    /**
     * Ответ на вопросы предыдущего хода.
     *
     * Контроллер unit-сессии читает PascalCase (`QuestionId`/`OptionId`/`Text`),
     * но для совместимости с общим контрактом дополнительно отправляем
     * camelCase-дубли — лишние ключи игнорируются.
     */
    otvetit(params: {
        turnId: string;
        answers: UnitSessionAnswer[];
        model?: string | null;
    }): Promise<ApiResponse<UnitSessionLaunch>> {
        return apiClient.post<UnitSessionLaunch>("/opencode/unit-session/otvetit", {
            turnId: params.turnId,
            model: params.model ?? undefined,
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

    istoriya(params: { sessionId: string }): Promise<ApiResponse<UnitSessionTurn[]>> {
        return apiClient.post<UnitSessionTurn[]>("/opencode/unit-session/istoriya", params);
    }

    sostoyanie(params: { sessionId: string }): Promise<ApiResponse<UnitSessionState>> {
        return apiClient.post<UnitSessionState>("/opencode/unit-session/sostoyanie", params);
    }

    arhivirovat(params: { sessionId: string }): Promise<ApiResponse<null>> {
        return apiClient.post<null>("/opencode/unit-session/arhivirovat", params);
    }

    poluchitResultatHoda(params: { turnId: string }): Promise<ApiResponse<UnitSessionTurn>> {
        return apiClient.post<UnitSessionTurn>("/opencode/unit-session/poluchitResultatHoda", params);
    }

    poluchitProgressHoda(params: { turnId: string }): Promise<ApiResponse<ProgressHoda | null>> {
        return apiClient.post<ProgressHoda | null>("/opencode/unit-session/poluchitProgressHoda", params);
    }

    uvedomleniya(params?: { limit?: number }): Promise<ApiResponse<UvedomleniyaSessiyUnitaResponse>> {
        return apiClient.get<UvedomleniyaSessiyUnitaResponse>("/opencode/unit-session/uvedomleniya", params);
    }

    otmetitUvedomleniyaProchitannimi(
        params: { ids: string[] },
    ): Promise<ApiResponse<ZahvatUvedomleniySessiyUnitaResponse>> {
        return apiClient.post<ZahvatUvedomleniySessiyUnitaResponse>(
            "/opencode/unit-session/otmetitUvedomleniyaProchitannimi",
            params,
        );
    }
}

export default new UnitSessionService();
