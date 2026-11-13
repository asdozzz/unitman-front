import apiClient from "@/bootstrap/apiClient";
import type { Schema } from "@/api/types";

/**
 * Сервис юнитов.
 *
 * Тела запросов и типы ответов выводятся из сгенерированной OpenAPI-схемы
 * (`yarn gen:api`), поэтому расхождение с контрактом бэкенда ловится
 * на этапе компиляции. Ручные модели ответов удалены.
 */
class UnitiService {
    list(params: Schema<"GetUnitList">) {
        return apiClient.post('/unit/list', params);
    }

    naitiDubliUnita(params: Schema<"NaitiDubliUnita">) {
        return apiClient.post('/unit/naitiDubliUnita', params);
    }

    obnovit(params: Schema<"GetUnitReadModelById">) {
        return apiClient.post('/unit/obnovit', params);
    }

    sozdat(params: Schema<"SozdatUnit">) {
        return apiClient.post('/unit/sozdat', params);
    }

    sobrat(params: Schema<"SobratUnit">) {
        return apiClient.post('/unit/sobrat', params);
    }

    obnovitKodUnita(params: Schema<"ObnovitKodUnita">) {
        return apiClient.post('/unit/obnovitKodUnita', params);
    }

    podgotovit(params: Schema<"PodgotovitUnitKZapusku">) {
        return apiClient.post('/unit/podgotovit', params);
    }

    sbrositPodgotovku(params: Schema<"SbrositPodgotovkuUnita">) {
        return apiClient.post('/unit/sbrositPodgotovku', params);
    }

    zapustit(params: Schema<"ZapustitUnit">) {
        return apiClient.post('/unit/zapustit', params);
    }

    ostanovit(params: Schema<"OstanovitUnit">) {
        return apiClient.post('/unit/ostanovit', params);
    }

    udalit(params: Schema<"UdalitUnit">) {
        return apiClient.post('/unit/udalit', params);
    }

    udalitSlomaniyUnit(params: Schema<"UdalitSlomaniyUnit">) {
        return apiClient.post('/unit/udalitSlomaniyUnit', params);
    }

    zapolnitPeremenie(params: Schema<"ZapolnitPeremenieUnita">) {
        return apiClient.post('/unit/zapolnitPeremenie', params);
    }

    vipolnitDeistviye(params: Schema<"VipolnitDeistviye">) {
        return apiClient.post('/unit/vipolnitDeistviye', params);
    }

    poluchitKonfigUnita(params: Schema<"PoluchitKonfigUnita">) {
        return apiClient.post('/unit/poluchitKonfigUnita', params);
    }

    poluchitPeremenieUnita(params: Schema<"PoluchitPeremenieUnita">) {
        return apiClient.post('/unit/poluchitPeremenieUnita', params);
    }

    poluchitVipolnenieZadachiRunnera(params: Schema<"GetUnitRunnerJobs">) {
        return apiClient.post('/unit/poluchitVipolnenieZadachiRunnera', params);
    }

    /**
     * Ссылка на сервис другого юнита, вычисленная по помощнику переменной
     * (`ConfigVariableHelper`). Используется для автоподстановки значения.
     */
    poluchitSsylkuPoPomoschniku(params: Schema<"PoluchitSsylkuPoPomoschniku">) {
        return apiClient.post('/unit/poluchitSsylkuPoPomoschniku', params);
    }

    poluchitKonfigPoNazvaniyuVetki(params: Schema<"PoluchitKonfigIzHranilisha">) {
        return apiClient.post('/unit/poluchitKonfigIzHranilisha', params);
    }

    poluchitShagiZadachiRunnera(params: Schema<"PoluchitShagiZadachiUnita">) {
        return apiClient.post('/unit/poluchitShagiZadachiRunnera', params);
    }

    /**
     * Снимок прогресса задачи runner'а.
     *
     * Источник истины по прогрессу. Тот же `data`, что приходит пушем
     * в канал `unit_progress#<jobId>`.
     */
    poluchitProgressZadachiRunnera(params: Schema<"PoluchitProgressZadachiUnita">) {
        return apiClient.post('/unit/poluchitProgressZadachiRunnera', params);
    }

    proveritKonteinerUnita(params: Schema<"ProveritKonteinerUnita">) {
        return apiClient.post('/unit/proveritKonteinerUnita', params);
    }

    rebuildModel(params: Schema<"PeresobratModelSpisokUnitov">) {
        return apiClient.post('/unit/rebuildSpisokUnitov', params);
    }

    pometitKakSlomanii(params: Schema<"PometitKakSlomanii">) {
        return apiClient.post('/unit/pometitKakSlomanii', params);
    }
}

export default new UnitiService();
