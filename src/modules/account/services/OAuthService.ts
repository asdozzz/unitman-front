import apiClient from "@/bootstrap/apiClient";
import type { ApiResponse } from "@/bootstrap/apiClient/ApiResponse";
import type { OAuthTokenData } from "@/modules/account/services/AccountService";
import { apiHost } from "@/utils/runtimeEnv";

/**
 * OAuth-вход через Google/GitHub.
 *
 * Redirect/callback выполняются браузером, поэтому для старта используется
 * обычная навигация, а обмен одноразового кода — обычный API-запрос.
 */
class OAuthService {
    async poluchitProvaydery(): Promise<ApiResponse<{ providers: string[] }>> {
        return apiClient.get<{ providers: string[] }>('/oauth/providers');
    }

    start(provider: string, locale: string): void {
        const host = apiHost().replace(/\/$/, "");

        window.location.href = `${host}/oauth/${encodeURIComponent(provider)}/redirect?locale=${encodeURIComponent(locale)}`;
    }

    obmenyatKod(code: string): Promise<ApiResponse<OAuthTokenData>> {
        return apiClient.post<OAuthTokenData>('/oauth/exchange', { code });
    }
}

export default new OAuthService();
