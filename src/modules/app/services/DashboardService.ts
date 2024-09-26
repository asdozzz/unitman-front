import apiClient from "@/bootstrap/apiClient";
import {OtvetStatistikaPoProektu} from "@/modules/app/services/DashboardService/model/OtvetStatistikaPoProektu";

class DashboardService {
    statistikaPoProektam() {
        return apiClient.post<OtvetStatistikaPoProektu[]>('/project/statistikaPoProektam', {});
    }
}

export default new DashboardService();
