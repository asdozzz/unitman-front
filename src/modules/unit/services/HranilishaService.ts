import apiClient from "@/bootstrap/apiClient";
import ModelDlySpiskaHranilish from "@/modules/unit/services/HranilishaService/model/ModelDlySpiskaHranilish";
import {ModelDlyDobavleniyaHranilisha} from "@/modules/unit/services/HranilishaService/model/ModelDlyDobavleniyaHranilisha";
import {ModelDlyUdaleniyaHranilisha} from "@/modules/unit/services/HranilishaService/model/ModelDlyUdaleniyaHranilisha";
import {ModelDlyActivaziiHranilisha} from "@/modules/unit/services/HranilishaService/model/ModelDlyActivaziiHranilisha";
import {
    ModelDlyObnovleniyaRekvizitovHranilisha
} from "@/modules/unit/services/HranilishaService/model/ModelDlyObnovleniyaRekvizitovHranilisha";
import ModelDlySpiskaTipovHranilisha from "@/modules/unit/services/HranilishaService/model/ModelDlySpiskaTipovHranilisha";

class HranilishaService {
    list() {
        return apiClient.post<ModelDlySpiskaHranilish[]>('/repo/list', {});
    }

    poluchitSpisokActivnih() {
        return apiClient.post<ModelDlySpiskaHranilish[]>('/repo/activeList', {});
    }
    poluchitProektiHranilisha(params: {id: string, query: string | null}) {
        return apiClient.post<{ value: string, name: string }[]>('/repo/projectList', params);
    }
    typeList() {
        return apiClient.post<ModelDlySpiskaTipovHranilisha[]>('/repo/type/list', {});
    }

    add(params: ModelDlyDobavleniyaHranilisha) {
        return apiClient.post<null>('/repo/add', params);
    }
    delete(params: ModelDlyUdaleniyaHranilisha) {
        return apiClient.post<null>('/repo/delete', params);
    }

    confirm(params: ModelDlyActivaziiHranilisha) {
        return apiClient.post<null>('/repo/confirm', params);
    }

    changeCredentials(params: ModelDlyObnovleniyaRekvizitovHranilisha) {
        return apiClient.post<null>('/repo/changeCredentials', params);
    }
}

export default new HranilishaService();
