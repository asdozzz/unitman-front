import apiClient from "@/bootstrap/apiClient";
import type { ApiResponse } from "@/bootstrap/apiClient/ApiResponse";
import type {
  NastroikaUvedomleniya,
  SpisokUvedomleniy,
} from "@/modules/notification/model/Uvedomlenie";
import type { PushPodpiskaPayload } from "@/modules/notification/model/PushPodpiska";

/**
 * Сервис уведомлений (`/notifications/*`).
 */
class NotificationService {
  list(params?: {
    limit?: number;
    onlyActionable?: boolean;
  }): Promise<ApiResponse<SpisokUvedomleniy>> {
    return apiClient.get<SpisokUvedomleniy>(
      "/notifications",
      params as Record<string, unknown> | undefined,
    );
  }

  unreadCount(): Promise<ApiResponse<{ count: number }>> {
    return apiClient.get<{ count: number }>("/notifications/unread-count");
  }

  markRead(id: string): Promise<ApiResponse<{ updated: boolean }>> {
    return apiClient.post<{ updated: boolean }>(
      `/notifications/${encodeURIComponent(id)}/read`,
    );
  }

  markAllRead(): Promise<ApiResponse<{ updated: number }>> {
    return apiClient.post<{ updated: number }>("/notifications/read-all");
  }

  preferences(): Promise<ApiResponse<NastroikaUvedomleniya[]>> {
    return apiClient.get<NastroikaUvedomleniya[]>("/notifications/preferences");
  }

  updatePreference(type: string, enabled: boolean): Promise<ApiResponse<null>> {
    return apiClient.put<null>(
      `/notifications/preferences/${encodeURIComponent(type)}`,
      { enabled },
    );
  }

  pushPublicKey(): Promise<ApiResponse<{ publicKey: string }>> {
    return apiClient.get<{ publicKey: string }>(
      "/notifications/push/public-key",
    );
  }

  subscribePush(body: PushPodpiskaPayload): Promise<ApiResponse<null>> {
    return apiClient.post<null>("/notifications/push/subscribe", body);
  }

  unsubscribePush(endpoint: string): Promise<ApiResponse<null>> {
    return apiClient.post<null>("/notifications/push/unsubscribe", {
      endpoint,
    });
  }
}

export default new NotificationService();
