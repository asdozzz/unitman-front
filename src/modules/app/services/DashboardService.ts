import apiClient from "@/bootstrap/apiClient";

/**
 * Сервис статистики дашборда.
 *
 * Тип ответа выводится из сгенерированной OpenAPI-схемы: у операции
 * `/project/statistikaPoProektam` нет тела запроса, поэтому оно не передаётся.
 */
class DashboardService {
    statistikaPoProektam() {
        return apiClient.post('/project/statistikaPoProektam');
    }
}

export default new DashboardService();
