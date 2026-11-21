import apiClient from "@/bootstrap/apiClient";
import type {Schema} from "@/api/types";

/**
 * Сервис управления редакторами юнита и режимом редактирования файлов.
 *
 * Тела запросов и типы ответов выводятся из сгенерированной OpenAPI-схемы,
 * поэтому расхождение с контрактом бэкенда ловится на этапе компиляции.
 */
class RedaktorService {
    /** Включает режим редактирования файлов юнита. */
    vklyuchitRedaktirovanie(params: Schema<"VklyuchitRedaktirovanieUnita">) {
        return apiClient.post('/unit/vklyuchitRedaktirovanie', params);
    }

    /** Выключает режим редактирования файлов юнита. */
    vykluchitRedaktirovanie(params: Schema<"VykluchitRedaktirovanieUnita">) {
        return apiClient.post('/unit/vykluchitRedaktirovanie', params);
    }

    /** Прикрепляет пользователя к юниту в качестве редактора. */
    prikrepitRedaktora(params: Schema<"PrikrepitRedaktoraKUnitu">) {
        return apiClient.post('/unit/prikrepitRedaktora', params);
    }

    /** Открепляет редактора от юнита (идемпотентно). */
    otkrepitRedaktora(params: Schema<"OtkrepitRedaktoraOtUnita">) {
        return apiClient.post('/unit/otkrepitRedaktora', params);
    }

    /** Список прикреплённых редакторов с состоянием их личных токенов. */
    redaktory(params: Schema<"SpisokRedaktorovUnita">) {
        return apiClient.post('/unit/redaktory', params);
    }

    /** Персональная подписанная ссылка редактора. */
    poluchitSsylkuRedaktora(params: Schema<"PoluchitSsylkuRedaktora">) {
        return apiClient.post('/unit/poluchitSsylkuRedaktora', params);
    }
}

export default new RedaktorService();
