import apiClient from "@/bootstrap/apiClient";
import {
    OtvetNaPoluchenieSostoyanieDefoltnogoRunnera
} from "@/modules/runner/services/RunnerService/OtvetNaPoluchenieSostoyanieDefoltnogoRunnera";

class RunnerService {
    getDefaultRunnerActive() {
        return apiClient.post<OtvetNaPoluchenieSostoyanieDefoltnogoRunnera>('/runner/getDefaultRunnerActive', {});
    }
}

export default new RunnerService();
