import apiClient from "@/bootstrap/apiClient";
import type { Schema } from "@/api/types";
import type {
    IdRekvizitovOpenCode,
    OtvetSpiskaModeleiOpenCode,
    ProvayderOpenCode,
    RekvizityOpenCode,
    ZaprosIzmeneniyaRekvizitovOpenCode,
    ZaprosSpiskaModeleiOpenCode,
    ZaprosSozdaniyaRekvizitovOpenCode,
} from "@/modules/account/store/SpisokRekvizitovOpenCode/model/OpenCodeRekvizity";

/**
 * Сервис реквизитов OpenCode (`/account/opencode/*`).
 *
 * Реквизиты принадлежат аккаунту: API-ключ шифруется на бэкенде и наружу не
 * отдаётся — в списке приходит только маска `apiKeyHint`.
 *
 * Тела запросов и типы ответов выводятся из сгенерированной OpenAPI-схемы
 * (`yarn gen:api`) через типы модуля account (`OpenCodeRekvizity`).
 */
class OpenCodeCredentialService {
    /** Каталог провайдеров: код, название, baseUrl и статические модели. */
    providers() {
        return apiClient.get<ProvayderOpenCode[]>('/account/opencode/providers');
    }

    /**
     * Список моделей у провайдера.
     *
     * HTTP всегда 200: при ошибке провайдера приходит `source: 'static'` и
     * `errorKey`, форма при этом не блокируется.
     */
    spisokModelei(params: ZaprosSpiskaModeleiOpenCode) {
        return apiClient.post<OtvetSpiskaModeleiOpenCode>(
            '/account/opencode/spisokModelei',
            params,
        );
    }

    /** Реквизиты текущего пользователя (с провайдером и моделями). */
    spisokRekvizitov() {
        return apiClient.get<RekvizityOpenCode[]>('/account/opencode/spisokRekvizitov');
    }

    /** Создание реквизитов. Ответ — идентификатор; ключ не возвращается. */
    sozdatRekvizity(params: ZaprosSozdaniyaRekvizitovOpenCode) {
        return apiClient.post<IdRekvizitovOpenCode>(
            '/account/opencode/sozdatRekvizity',
            params,
        );
    }

    /**
     * Частичное изменение: непереданные поля (`null`/`undefined`) не меняются,
     * пустой `apiKey` означает «оставить прежний ключ».
     *
     * Бэкенд отвечает `data: null`, поэтому после вызова список
     * перезапрашивается, а не правится по ответу.
     */
    izmenitRekvizity(params: ZaprosIzmeneniyaRekvizitovOpenCode) {
        return apiClient.post<null>(
            '/account/opencode/izmenitRekvizity',
            params,
        );
    }

    /** Удаление реквизитов. Ответ — `data: null`. */
    udalitRekvizity(params: Schema<"UdalitRekvizityOpenCode">) {
        return apiClient.post('/account/opencode/udalitRekvizity', params);
    }
}

export default new OpenCodeCredentialService();
