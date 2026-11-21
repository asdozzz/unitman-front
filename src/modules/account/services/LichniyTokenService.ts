import apiClient from "@/bootstrap/apiClient";
import type { Schema } from "@/api/types";

/**
 * Сервис личных токенов хранилищ (`/lichniyToken/*`).
 *
 * Токен принадлежит пользователю и привязывается к конкретному хранилищу.
 * Секрет токена бэкенд не возвращает никогда — наружу отдаётся только
 * подсказка `tokenHint`.
 *
 * Тела запросов и типы ответов выводятся из сгенерированной OpenAPI-схемы
 * (`yarn gen:api`).
 */
class LichniyTokenService {
    /** Добавление токена. Ответ — публичное представление токена (без секрета). */
    dobavit(params: Schema<"DobavitLichniyToken">) {
        return apiClient.post('/lichniyToken/dobavit', params);
    }

    /** Список доступных пользователю токенов. Ответ — `LichniyTokenPublic[]`. */
    spisok(params: Schema<"SpisokLichnihTokenov"> = {}) {
        return apiClient.post('/lichniyToken/spisok', params);
    }

    /** Перепроверка прав токена. Ответ — обновлённое публичное представление токена. */
    pereproverit(params: Schema<"PereproveritLichniyToken">) {
        return apiClient.post('/lichniyToken/pereproverit', params);
    }

    /** Удаление токена. Ответ — `data: null`. */
    udalit(params: Schema<"UdalitLichniyToken">) {
        return apiClient.post('/lichniyToken/udalit', params);
    }
}

export default new LichniyTokenService();
