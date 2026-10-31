import apiClient from "@/bootstrap/apiClient";
import type { Schema } from "@/api/types";

/**
 * Сервис хранилищ (репозиториев).
 *
 * Тела запросов и типы ответов выводятся напрямую из сгенерированной OpenAPI-схемы
 * (`yarn gen:api`). Ручные модели ответов удалены.
 */
class HranilishaService {
    list(params: Schema<"GetRepoList"> = {}) {
        return apiClient.post('/repo/list', params);
    }

    poluchitSpisokActivnih(params: Schema<"GetActiveRepoList"> = {}) {
        return apiClient.post('/repo/activeList', params);
    }

    poluchitProektiHranilisha(params: Schema<"PoluchitSpisokProektovRepi">) {
        return apiClient.post('/repo/projectList', params);
    }

    typeList(params: Schema<"GetRepoTypeList"> = {}) {
        return apiClient.post('/repo/type/list', params);
    }

    add(params: Schema<"AddRepo">) {
        return apiClient.post('/repo/add', params);
    }

    delete(params: Schema<"DeleteRepo">) {
        return apiClient.post('/repo/delete', params);
    }

    confirm(params: Schema<"CheckAccessToRepo">) {
        return apiClient.post('/repo/confirm', params);
    }

    changeCredentials(params: Schema<"ChangeCredentialsOfRepo">) {
        return apiClient.post('/repo/changeCredentials', params);
    }
}

export default new HranilishaService();
