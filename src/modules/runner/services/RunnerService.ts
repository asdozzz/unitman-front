import apiClient from "@/bootstrap/apiClient";

/**
 * Сервис default-runner'а.
 *
 * Ответ `{active: boolean}` приходит без конверта, apiClient возвращает его целиком.
 */
class RunnerService {
    getDefaultRunnerActive() {
        return apiClient.post('/runner/getDefaultRunnerActive');
    }
}

export default new RunnerService();
