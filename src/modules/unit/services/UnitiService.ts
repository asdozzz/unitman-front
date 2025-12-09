import apiClient from "@/bootstrap/apiClient";
import ModelDlySpiskaUnitov from "@/modules/unit/services/UnitiService/model/ModelDlySpiskaUnitov";
import { ModelDlySozdaniyaUnita } from "@/modules/unit/services/UnitiService/model/ModelDlySozdaniyaUnita";
import {ModelDlyUdaleniyaUnita} from "@/modules/unit/services/UnitiService/model/ModelDlyUdaleniyaUnita";
import {ModelDlySborkiUnita} from "@/modules/unit/services/UnitiService/model/ModelDlySborkiUnita";
import {ModelDlyObnovleniyaUnita} from "@/modules/unit/services/UnitiService/model/ModelDlyObnovleniyaUnita";
import {ModelDlyPodgotovkiUnita} from "@/modules/unit/services/UnitiService/model/ModelDlyPodgotovkiUnita";
import {ModelDlyZapuskaUnita} from "@/modules/unit/services/UnitiService/model/ModelDlyZapuskaUnita";
import {ModelDlySbrosaPodgotovkiUnita} from "@/modules/unit/services/UnitiService/model/ModelDlySbrosaPodgotovkiUnita";
import {ModelDlyOstanovkiUnita} from "@/modules/unit/services/UnitiService/model/ModelDlyOstanovkiUnita";
import {
    ModelDlyZapolneniyaPeremenihUnita
} from "@/modules/unit/services/UnitiService/model/ModelDlyZapolneniyaPeremenihUnita";
import {
    ZaprosNaPoluchenieKonfigaUnita
} from "@/modules/unit/services/UnitiService/model/ZaprosNaPoluchenieKonfigaUnita";
import {OtvetNaPoluchenieKonfigaUnita} from "@/modules/unit/services/UnitiService/model/OtvetNaPoluchenieKonfigaUnita";
import {
    ZaprosNaPolucheniePeremenihUnita
} from "@/modules/unit/services/UnitiService/model/ZaprosNaPolucheniePeremenihUnita";
import {
    OtvetNaPolucheniePeremenihUnita
} from "@/modules/unit/services/UnitiService/model/OtvetNaPolucheniePeremenihUnita";
import {ZaprosNaPoluchenieUnita} from "@/modules/unit/services/UnitiService/model/ZaprosNaPoluchenieUnita";
import {
    ZaprosNaPoluchenieZadachRunneraUnita
} from "@/modules/unit/services/UnitiService/model/ZaprosNaPoluchenieZadachRunneraUnita";
import {
    OtvetNaPoluchenieZadachRunneraUnita
} from "@/modules/unit/services/UnitiService/model/OtvetNaPoluchenieZadachRunneraUnita";
import {ZaprosSpiskaUnitov} from "@/modules/unit/services/UnitiService/model/ZaprosSpiskaUnitov";

import {
    OtvetNaPoluchenieShagovZadachiRunnera
} from "@/modules/unit/services/UnitiService/model/OtvetNaPoluchenieShagovZadachiRunnera";
import {ZaprosNaVipolnenieDeistviya} from "@/modules/unit/services/UnitiService/model/ZaprosNaVipolnenieDeistviya";
import {
    ZaprosNaPoluchenieKonfigaVetkiUnita
} from "@/modules/unit/services/UnitiService/model/ZaprosNaPoluchenieKonfigaVetkiUnita";
import {ZaprosNaPoluchenieDubleiUnita} from "@/modules/unit/services/UnitiService/model/ZaprosNaPoluchenieDubleiUnita";

class UnitiService {
    list(params: ZaprosSpiskaUnitov) {
        return apiClient.post<ModelDlySpiskaUnitov[]>('/unit/list', params);
    }

    naitiDubliUnita(params: ZaprosNaPoluchenieDubleiUnita) {
        return apiClient.post<ModelDlySpiskaUnitov[]>('/unit/naitiDubliUnita', params);
    }

    obnovit(params: ZaprosNaPoluchenieUnita ) {
        return apiClient.post<ModelDlySpiskaUnitov>('/unit/obnovit', params);
    }

    sozdat(params: ModelDlySozdaniyaUnita) {
        return apiClient.post<null>('/unit/sozdat', params);
    }

    sobrat(params: ModelDlySborkiUnita) {
        return apiClient.post<null>('/unit/sobrat', params);
    }

    obnovitKodUnita(params: ModelDlyObnovleniyaUnita) {
        return apiClient.post<null>('/unit/obnovitKodUnita', params);
    }

    podgotovit(params: ModelDlyPodgotovkiUnita) {
        return apiClient.post<null>('/unit/podgotovit', params);
    }

    sbrositPodgotovku(params: ModelDlySbrosaPodgotovkiUnita) {
        return apiClient.post<null>('/unit/sbrositPodgotovku', params);
    }

    zapustit(params: ModelDlyZapuskaUnita) {
        return apiClient.post<null>('/unit/zapustit', params);
    }

    ostanovit(params: ModelDlyOstanovkiUnita) {
        return apiClient.post<null>('/unit/ostanovit', params);
    }

    udalit(params: ModelDlyUdaleniyaUnita) {
        return apiClient.post<null>('/unit/udalit', params);
    }

    udalitSlomaniyUnit(params: ModelDlyUdaleniyaUnita) {
        return apiClient.post<null>('/unit/udalitSlomaniyUnit', params);
    }

    zapolnitPeremenie(params: ModelDlyZapolneniyaPeremenihUnita) {
        return apiClient.post<null>('/unit/zapolnitPeremenie', params);
    }

    vipolnitDeistviye(params: ZaprosNaVipolnenieDeistviya) {
        return apiClient.post<null>('/unit/vipolnitDeistviye', params);
    }

    poluchitKonfigUnita(params: ZaprosNaPoluchenieKonfigaUnita) {
        return apiClient.post<OtvetNaPoluchenieKonfigaUnita>('/unit/poluchitKonfigUnita', params);
    }

    poluchitPeremenieUnita(params: ZaprosNaPolucheniePeremenihUnita) {
        return apiClient.post<OtvetNaPolucheniePeremenihUnita[]>('/unit/poluchitPeremenieUnita', params);
    }

    poluchitVipolnenieZadachiRunnera(params: ZaprosNaPoluchenieZadachRunneraUnita) {
        return apiClient.post<OtvetNaPoluchenieZadachRunneraUnita[]>('/unit/poluchitVipolnenieZadachiRunnera', params);
    }

    poluchitKonfigPoNazvaniyuVetki(params: ZaprosNaPoluchenieKonfigaVetkiUnita) {
        return apiClient.post<OtvetNaPolucheniePeremenihUnita[]>('/unit/poluchitKonfigIzHranilisha', params);
    }

    poluchitShagiZadachiRunnera(params: { prozesId: string, zadachaId: string }) {
        return apiClient.post<OtvetNaPoluchenieShagovZadachiRunnera>('/unit/poluchitShagiZadachiRunnera', params);
    }

    proveritKonteinerUnita(params: { id: string }) {
        return apiClient.post<null>('/unit/proveritKonteinerUnita', params);
    }

    rebuildModel(params: { id: string }) {
        return apiClient.post<null>('/unit/rebuildSpisokUnitov', params)
    }
}

export default new UnitiService();
