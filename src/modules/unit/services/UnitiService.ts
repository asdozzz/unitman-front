import apiClient from "@/bootstrap/apiClient";
import type { Schema } from "@/api/types";
import ModelDlySpiskaUnitov from "@/modules/unit/services/UnitiService/model/ModelDlySpiskaUnitov";
import {
    ModelDlyZapolneniyaPeremenihUnita
} from "@/modules/unit/services/UnitiService/model/ModelDlyZapolneniyaPeremenihUnita";
import {OtvetNaPoluchenieKonfigaUnita} from "@/modules/unit/services/UnitiService/model/OtvetNaPoluchenieKonfigaUnita";
import {
    OtvetNaPolucheniePeremenihUnita
} from "@/modules/unit/services/UnitiService/model/OtvetNaPolucheniePeremenihUnita";
import {
    OtvetNaPoluchenieZadachRunneraUnita
} from "@/modules/unit/services/UnitiService/model/OtvetNaPoluchenieZadachRunneraUnita";
import {
    OtvetNaPoluchenieShagovZadachiRunnera
} from "@/modules/unit/services/UnitiService/model/OtvetNaPoluchenieShagovZadachiRunnera";
import {ZaprosNaVipolnenieDeistviya} from "@/modules/unit/services/UnitiService/model/ZaprosNaVipolnenieDeistviya";

/**
 * Тела запросов берутся из сгенерированной OpenAPI-схемы (`yarn gen:api`),
 * поэтому расхождение с контрактом бэкенда ловится на этапе компиляции.
 *
 * Типы ответов остаются явными: спецификация описывает `data` конверта
 * обобщённо (`object|null`), поэтому точные модели пока задаются вручную.
 */
class UnitiService {
    list(params: Schema<"GetUnitList">) {
        return apiClient.post<ModelDlySpiskaUnitov[]>('/unit/list', params);
    }

    naitiDubliUnita(params: Schema<"NaitiDubliUnita">) {
        return apiClient.post<ModelDlySpiskaUnitov[]>('/unit/naitiDubliUnita', params);
    }

    obnovit(params: Schema<"GetUnitReadModelById"> ) {
        return apiClient.post<ModelDlySpiskaUnitov>('/unit/obnovit', params);
    }

    sozdat(params: Schema<"SozdatUnit">) {
        return apiClient.post<null>('/unit/sozdat', params);
    }

    sobrat(params: Schema<"SobratUnit">) {
        return apiClient.post<null>('/unit/sobrat', params);
    }

    obnovitKodUnita(params: Schema<"ObnovitKodUnita">) {
        return apiClient.post<null>('/unit/obnovitKodUnita', params);
    }

    podgotovit(params: Schema<"PodgotovitUnitKZapusku">) {
        return apiClient.post<null>('/unit/podgotovit', params);
    }

    sbrositPodgotovku(params: Schema<"SbrositPodgotovkuUnita">) {
        return apiClient.post<null>('/unit/sbrositPodgotovku', params);
    }

    zapustit(params: Schema<"ZapustitUnit">) {
        return apiClient.post<null>('/unit/zapustit', params);
    }

    ostanovit(params: Schema<"OstanovitUnit">) {
        return apiClient.post<null>('/unit/ostanovit', params);
    }

    udalit(params: Schema<"UdalitUnit">) {
        return apiClient.post<null>('/unit/udalit', params);
    }

    udalitSlomaniyUnit(params: Schema<"UdalitSlomaniyUnit">) {
        return apiClient.post<null>('/unit/udalitSlomaniyUnit', params);
    }

    /**
     * ВНИМАНИЕ: расхождение с контрактом.
     * Спецификация ожидает `values: ZnacheniePeremenoi[]`
     * (`{id, type, value}[]`), а вызывающий код отправляет `Record<string, string>`.
     * Нужно согласовать с бэкендом и заменить тип на `Schema<"ZapolnitPeremenieUnita">`.
     */
    zapolnitPeremenie(params: ModelDlyZapolneniyaPeremenihUnita) {
        return apiClient.post<null>('/unit/zapolnitPeremenie', params);
    }

    /**
     * ВНИМАНИЕ: расхождение с контрактом.
     * Спецификация ожидает `values: ZnacheniePeremenoi[]`
     * (`{id, type, value}[]`), а вызывающий код отправляет `Record<string, string>`.
     * Нужно согласовать с бэкендом и заменить тип на `Schema<"VipolnitDeistviye">`.
     */
    vipolnitDeistviye(params: ZaprosNaVipolnenieDeistviya) {
        return apiClient.post<null>('/unit/vipolnitDeistviye', params);
    }

    poluchitKonfigUnita(params: Schema<"PoluchitKonfigUnita">) {
        return apiClient.post<OtvetNaPoluchenieKonfigaUnita>('/unit/poluchitKonfigUnita', params);
    }

    poluchitPeremenieUnita(params: Schema<"PoluchitPeremenieUnita">) {
        return apiClient.post<OtvetNaPolucheniePeremenihUnita[]>('/unit/poluchitPeremenieUnita', params);
    }

    poluchitVipolnenieZadachiRunnera(params: Schema<"GetUnitRunnerJobs">) {
        return apiClient.post<OtvetNaPoluchenieZadachRunneraUnita[]>('/unit/poluchitVipolnenieZadachiRunnera', params);
    }

    poluchitKonfigPoNazvaniyuVetki(params: Schema<"PoluchitKonfigIzHranilisha">) {
        return apiClient.post<OtvetNaPolucheniePeremenihUnita[]>('/unit/poluchitKonfigIzHranilisha', params);
    }

    poluchitShagiZadachiRunnera(params: Schema<"PoluchitShagiZadachiUnita">) {
        return apiClient.post<OtvetNaPoluchenieShagovZadachiRunnera>('/unit/poluchitShagiZadachiRunnera', params);
    }

    proveritKonteinerUnita(params: Schema<"ProveritKonteinerUnita">) {
        return apiClient.post<null>('/unit/proveritKonteinerUnita', params);
    }

    rebuildModel(params: Schema<"PeresobratModelSpisokUnitov">) {
        return apiClient.post<null>('/unit/rebuildSpisokUnitov', params)
    }

    pometitKakSlomanii(params: Schema<"PometitKakSlomanii">) {
        return apiClient.post<null>('/unit/pometitKakSlomanii', params);
    }
}

export default new UnitiService();
