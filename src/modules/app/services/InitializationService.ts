import apiClient from "@/bootstrap/apiClient";
import {ApiInitializationModel} from "@/modules/app/services/Initialization/ApiInitializationModel";

class InitializationService {
    getAllProps() {
        return apiClient.get<ApiInitializationModel[]>('/initialization/list')
    }

    updateProxyHost(params: { value: string | null}) {
        return apiClient.put('/initialization/proxy_host', params);
    }
}

export default new InitializationService();
