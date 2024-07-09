import apiClient from "@/bootstrap/apiClient";
import ModelDlySpiskaProektov from "@/modules/unit/services/ProektiServices/model/ModelDlySpiskaProektov";
import {ModelDlyDobavleniyaProekta} from "@/modules/unit/services/ProektiServices/model/ModelDlyDobavleniyaProekta";
import {ModelDlyUdaleniyaProekta} from "@/modules/unit/services/ProektiServices/model/ModelDlyUdaleniyaProekta";
import {ModelDlyAktivaziiProekta} from "@/modules/unit/services/ProektiServices/model/ModelDlyAktivaziiProekta";
import {ModelDlyDeaktivaziiProekta} from "@/modules/unit/services/ProektiServices/model/ModelDlyDeaktivaziiProekta";
import {ModelDlyObnovleniyaProekta} from "@/modules/unit/services/ProektiServices/model/ModelDlyObnovleniyaProekta";
import {ModelDlySborkiProekta} from "@/modules/unit/services/ProektiServices/model/ModelDlySborkiProekta";
import {ModelDlyUdaleniyaPolzovatelyIzProekta} from "@/modules/unit/services/ProektiServices/model/ModelDlyUdaleniyaPolzovatelyIzProekta";
import {
    ModelDlyDobavleniyaPolzovatelyKProektu
} from "@/modules/unit/services/ProektiServices/model/ModelDlyDobavleniyaPolzovatelyKProektu";
import {
    ModelDlySpiskaPolzovateleiProekta
} from "@/modules/unit/services/ProektiServices/model/ModelDlySpiskaPolzovateleiProekta";
import ModelDlySpiskaVetok from "@/modules/unit/services/ProektiServices/model/ModelDlySpiskaVetok";

class ProektiService {
    list() {
        return apiClient.post<ModelDlySpiskaProektov[]>('/project/list', {});
    }

    poluchitMoiProekti() {
        return apiClient.post<ModelDlySpiskaProektov[]>('/project/my', {});
    }

    add(params: ModelDlyDobavleniyaProekta) {
        return apiClient.post<null>('/project/add', params);
    }

    updateData(params: ModelDlyObnovleniyaProekta) {
        return apiClient.post<null>('/project/updateData', params);
    }
    udalit(params: ModelDlyUdaleniyaProekta) {
        return apiClient.post<null>('/project/remove', params);
    }

    udalitSlomaniiProekt(params: ModelDlyUdaleniyaProekta) {
        return apiClient.post<null>('/project/forceRemove', params);
    }

    aktivirovat(params: ModelDlyAktivaziiProekta) {
        return apiClient.post<null>('/project/enable', params);
    }

    deaktivirovat(params: ModelDlyDeaktivaziiProekta) {
        return apiClient.post<null>('/project/disable', params);
    }

    sobrat(params: ModelDlySborkiProekta) {
        return apiClient.post<null>('/project/build', params);
    }

    polucitSpisokPolzovatelei(params: {id: string}) {
        return apiClient.post<ModelDlySpiskaPolzovateleiProekta[]>('/project/usersList', params);
    }

    dobavitPolzovatelyaKProektu(params: ModelDlyDobavleniyaPolzovatelyKProektu) {
        return apiClient.post<null>('/project/addUser', params);
    }

    udalitPolzovatelyaIzProekta(params: ModelDlyUdaleniyaPolzovatelyIzProekta) {
        return apiClient.post<null>('/project/removeUser', params);
    }

    poluchitVetkiProekta(params: {id: string, query: string | null}) {
        return apiClient.post<ModelDlySpiskaVetok[]>('/project/branchesList', params);
    }
}

export default new ProektiService();
