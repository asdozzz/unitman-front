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
import {ZaprosNaDobavlenieWebhooka} from "@/modules/unit/services/ProektiServices/model/ZaprosNaDobavlenieWebhooka";
import {ZaprosNaObnovlenieWebhooka} from "@/modules/unit/services/ProektiServices/model/ZaprosNaObnovlenieWebhooka";
import {
    ModelDlySpiskaWebhookovProekta
} from "@/modules/unit/services/ProektiServices/model/ModelDlySpiskaWebhookovProekta";
import {
    ZaprosNaPolucheniyeSobitiiWebhooka
} from "@/modules/unit/services/ProektiServices/model/ZaprosNaPolucheniyeSobitiiWebhooka";
import {OtvetNaPoluchenieSpiskaSobitiiWebhooka} from "@/modules/unit/services/ProektiServices/model/OtvetNaPoluchenieSpiskaSobitiiWebhooka";
import {ZaprosNaProverkuProxyHost} from "@/modules/unit/services/ProektiServices/model/ZaprosNaProverkuProxyHost";
import {OtvetNaProverkuProxyHost} from "@/modules/unit/services/ProektiServices/model/OtvetNaProverkuProxyHost";

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

    proveritProxyHost(params: ZaprosNaProverkuProxyHost) {
        return apiClient.post<OtvetNaProverkuProxyHost>('/project/proverkaProxyHost', params);
    }

    read(id: string) {
        return apiClient.post<ModelDlySpiskaProektov>('/project/read/'+id, {});
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

    dobavitWebhook(params: ZaprosNaDobavlenieWebhooka) {
        return apiClient.post<null>('/project/webhook/dobavit', params);
    }

    readWebhook(id: string) {
        return apiClient.post<ModelDlySpiskaWebhookovProekta>('/project/webhook/'+id+'/read', {});
    }

    obnovitWebhooka(params: ZaprosNaObnovlenieWebhooka) {
        return apiClient.post<null>('/project/webhook/obnovit', params);
    }

    otkluchitWebhook(id: string) {
        return apiClient.post<null>('/project/webhook/'+id+'/otkluchit', {});
    }

    vkluchitWebhook(id: string) {
        return apiClient.post<null>('/project/webhook/'+id+'/vkluchit', {});
    }

    udalitWebhook(id: string) {
        return apiClient.post<null>('/project/webhook/'+id+'/udalit', {});
    }

    spisokWebhookovDlyProekta( projectId: string) {
        return apiClient.post<ModelDlySpiskaWebhookovProekta[]>('/project/webhook/'+projectId+'/spisok', {});
    }

    poluchitSobitiyaWebhooka( params: ZaprosNaPolucheniyeSobitiiWebhooka) {
        return apiClient.post<OtvetNaPoluchenieSpiskaSobitiiWebhooka>('/project/webhook/poluchitSobitiyaWebhooka', params);
    }


}

export default new ProektiService();
