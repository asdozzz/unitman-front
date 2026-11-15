import apiClient from "@/bootstrap/apiClient";
import type { Schema } from "@/api/types";

/**
 * Сервис реквизитов OpenCode (`/account/opencode/*`).
 *
 * Реквизиты принадлежат аккаунту: API-ключ шифруется на бэкенде и наружу не
 * отдаётся — в списке приходит только маска `apiKeyHint`.
 *
 * Тела запросов и типы ответов выводятся из сгенерированной OpenAPI-схемы
 * (`yarn gen:api`).
 */
class OpenCodeCredentialService {
    /** Контракт объявляет эндпоинт как GET; ответ — `OpenCodeCredential[]`. */
    spisokRekvizitov() {
        return apiClient.get('/account/opencode/spisokRekvizitov');
    }

    /** Создание реквизитов. Ответ — `IdHolder`, ключ в ответе не возвращается. */
    sozdatRekvizity(params: Schema<"SozdatRekvizityOpenCode">) {
        return apiClient.post('/account/opencode/sozdatRekvizity', params);
    }

    /**
     * Частичное изменение: непереданные поля (`null`/`undefined`) не меняются,
     * пустой `apiKey` означает «оставить прежний ключ».
     *
     * Бэкенд отвечает `data: null`, поэтому после вызова список
     * перезапрашивается, а не правится по ответу.
     */
    izmenitRekvizity(params: Schema<"IzmenitRekvizityOpenCode">) {
        return apiClient.post('/account/opencode/izmenitRekvizity', params);
    }

    /** Удаление реквизитов. Ответ — `data: null`. */
    udalitRekvizity(params: Schema<"UdalitRekvizityOpenCode">) {
        return apiClient.post('/account/opencode/udalitRekvizity', params);
    }
}

export default new OpenCodeCredentialService();
