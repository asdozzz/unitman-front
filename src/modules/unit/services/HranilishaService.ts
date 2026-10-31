import apiClient from "@/bootstrap/apiClient";
import type { Schema } from "@/api/types";
import ModelDlySpiskaHranilish from "@/modules/unit/services/HranilishaService/model/ModelDlySpiskaHranilish";
import ModelDlySpiskaTipovHranilisha from "@/modules/unit/services/HranilishaService/model/ModelDlySpiskaTipovHranilisha";

/**
 * Сервис хранилищ (репозиториев).
 *
 * Тела запросов типизированы по OpenAPI-схеме. Типы ответов задаются явно:
 * в спецификации `SuccessEnvelope.data` описан как `object|null`.
 */
class HranilishaService {
    list() {
        return apiClient.post<ModelDlySpiskaHranilish[]>('/repo/list', {});
    }

    poluchitSpisokActivnih() {
        return apiClient.post<ModelDlySpiskaHranilish[]>('/repo/activeList', {});
    }

    poluchitProektiHranilisha(params: Schema<"PoluchitSpisokProektovRepi">) {
        return apiClient.post<{ value: string, name: string }[]>('/repo/projectList', params);
    }

    typeList() {
        return apiClient.post<ModelDlySpiskaTipovHranilisha[]>('/repo/type/list', {});
    }

    add(params: Schema<"AddRepo">) {
        return apiClient.post<null>('/repo/add', params);
    }

    delete(params: Schema<"DeleteRepo">) {
        return apiClient.post<null>('/repo/delete', params);
    }

    confirm(params: Schema<"CheckAccessToRepo">) {
        return apiClient.post<null>('/repo/confirm', params);
    }

    changeCredentials(params: Schema<"ChangeCredentialsOfRepo">) {
        return apiClient.post<null>('/repo/changeCredentials', params);
    }
}

export default new HranilishaService();
