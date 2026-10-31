import apiClient from "@/bootstrap/apiClient";
import type { Schema } from "@/api/types";
import {ApiInitializationModel} from "@/modules/app/services/Initialization/ApiInitializationModel";

/**
 * Сервис инициализации.
 *
 * Тело PUT-запроса типизировано по OpenAPI-схеме.
 * Тело GET-ответа задаётся явно: в спецификации `SuccessEnvelope.data`
 * описан как `object|null`.
 */
class InitializationService {
    getAllProps() {
        return apiClient.get<ApiInitializationModel[]>('/initialization/list')
    }

    updateProxyHost(params: Schema<"ObnovitDefoltnyiProxyHost">) {
        return apiClient.put('/initialization/proxy_host', params);
    }
}

export default new InitializationService();
