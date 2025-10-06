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
import {
    ModelDlySpiskaPeremenihProekta
} from "@/modules/unit/services/ProektiServices/model/ModelDlySpiskaPeremenihProekta";
import {
    ZaprosNaDobavleniePeremenoiProekta
} from "@/modules/unit/services/ProektiServices/model/ZaprosNaDobavleniePeremenoiProekta";
import {
    ZaprosNaUdaleniePeremenoiIzProekta
} from "@/modules/unit/services/ProektiServices/model/ZaprosNaUdaleniePeremenoiIzProekta";
import {
    ZaprosNaIzmenenieZnacheniyaPeremenoiProekta
} from "@/modules/unit/services/ProektiServices/model/ZaprosNaIzmenenieZnacheniyaPeremenoiProekta";
import {
    ZaprosNaObnovlenieNastroekHuka
} from "@/modules/unit/services/ProektiServices/model/ZaprosNaObnovlenieNastroekHuka";
import {
    ZaprosNaPoluchenieZadachRunneraUnita
} from "@/modules/unit/services/ProektiServices/model/ZaprosNaPoluchenieZadachRunneraUnita";
import {
    OtvetNaPoluchenieZadachRunneraUnita
} from "@/modules/unit/services/ProektiServices/model/OtvetNaPoluchenieZadachRunneraUnita";
import {
    OtvetNaPoluchenieShagovZadachiRunnera
} from "@/modules/unit/services/ProektiServices/model/OtvetNaPoluchenieShagovZadachiRunnera";

class ProektiService {
    list() {
        return apiClient.post<ModelDlySpiskaProektov[]>('/project/list', {});
    }

    poluchitMoiProekti() {
        return apiClient.post<ModelDlySpiskaProektov[]>('/project/my', {});
    }

    poluchitAktivnieProekti() {
        return apiClient.post<ModelDlySpiskaProektov[]>('/project/activeList', {});
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

    poluchitSpisokPolzovatelei(params: {id: string}) {
        return apiClient.post<ModelDlySpiskaPolzovateleiProekta[]>('/project/usersList', params);
    }

    dobavitPolzovatelyaKProektu(params: ModelDlyDobavleniyaPolzovatelyKProektu) {
        return apiClient.post<null>('/project/addUser', params);
    }

    udalitPolzovatelyaIzProekta(params: ModelDlyUdaleniyaPolzovatelyIzProekta) {
        return apiClient.post<null>('/project/removeUser', params);
    }

    poluchitSpisokPeremenih(params: {id: string}) {
        return apiClient.post<ModelDlySpiskaPeremenihProekta[]>('/project/spisokPeremenihProekta', params);
    }

    dobavitPeremenuyu(params: ZaprosNaDobavleniePeremenoiProekta) {
        return apiClient.post<null>('/project/dobavitPeremenuyu', params);
    }

    udalitPeremenuyu(params: ZaprosNaUdaleniePeremenoiIzProekta) {
        return apiClient.post<null>('/project/udalitPeremenuyu', params);
    }

    izmenitPeremenuyu(params: ZaprosNaIzmenenieZnacheniyaPeremenoiProekta) {
        return apiClient.post<null>('/project/izmenitPeremenuyu', params);
    }

    poluchitVetkiProekta(params: {id: string, query: string | null}) {
        return apiClient.post<ModelDlySpiskaVetok[]>('/project/branchesList', params);
    }

    obnovitNastroikiHuka(params: ZaprosNaObnovlenieNastroekHuka) {
        return apiClient.post<null>('/project/obnovitNastroikiHuka', params);
    }

    poluchitVipolnenieZadachiRunnera(params: ZaprosNaPoluchenieZadachRunneraUnita) {
        return apiClient.post<OtvetNaPoluchenieZadachRunneraUnita[]>('/project/poluchitVipolnenieZadachiRunnera', params);
    }

    poluchitShagiZadachiRunnera(params: { id: string }) {
        return apiClient.post<OtvetNaPoluchenieShagovZadachiRunnera>('/project/poluchitShagiZadachiRunnera', params);
    }

    ochistit(params: { id: string }) {
        return apiClient.post<null>('/project/ochistit', params);
    }
}

export default new ProektiService();
