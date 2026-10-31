import apiClient from "@/bootstrap/apiClient";
import type { Schema } from "@/api/types";

/**
 * Сервис инициализации.
 *
 * Тела запросов и типы ответов выводятся из сгенерированной OpenAPI-схемы.
 */
class InitializationService {
    getAllProps() {
        return apiClient.get('/initialization/list');
    }

    updateProxyHost(params: Schema<"ObnovitDefoltnyiProxyHost">) {
        return apiClient.put('/initialization/proxy_host', params);
    }
}

export default new InitializationService();
