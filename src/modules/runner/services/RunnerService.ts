import apiClient from "@/bootstrap/apiClient";
import type {
    RannerKarta,
    UgrozyRannerov,
} from "@/modules/runner/model/ResursiServera";

/**
 * Сервис раннеров.
 *
 * Ответ `{active: boolean}` приходит без конверта, apiClient возвращает его целиком.
 * `GET /runner/list` и `GET /runner/threats` отвечают конвертом `{status, data}`;
 * их типы описаны вручную, пока схема OpenAPI не перегенерирована.
 */
class RunnerService {
    getDefaultRunnerActive() {
        return apiClient.post('/runner/getDefaultRunnerActive');
    }

    /** Карточки всех раннеров (только администратор). */
    getRunners() {
        return apiClient.get<RannerKarta[]>('/runner/list');
    }

    /** Краткая сводка угроз для шапки (все авторизованные). */
    getThreats() {
        return apiClient.get<UgrozyRannerov>('/runner/threats');
    }
}

export default new RunnerService();
