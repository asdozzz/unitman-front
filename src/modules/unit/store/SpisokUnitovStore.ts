import { defineStore } from 'pinia';
import UnitiService from "@/modules/unit/services/UnitiService";
import Unit from "@/modules/unit/store/SpisokUnitov/model/Unit";
import ModelDlySpiskaUnitov from "@/modules/unit/services/UnitiService/model/ModelDlySpiskaUnitov";
import {Notify} from "quasar";

export type SpisokUnitovState = {
    spisok: Unit[];
    loaderSpiskaUnitov: boolean;
    oshibkaZagruzkiSpiska: string | null;
    loaderObnovleniyaUnita: boolean;
    unitLoaders: Record<string, boolean>
}

export const useSpisokUnitovStore = defineStore('SpisokUnitovStore', {
    state: (): SpisokUnitovState => {
        return {
            spisok:[],
            loaderSpiskaUnitov:false,
            oshibkaZagruzkiSpiska: null,
            loaderObnovleniyaUnita:false,
            unitLoaders: {}
        }
    },
    actions: {
        startUnitLoader(id: string) {
            this.unitLoaders[id] = true;
        },
        stopUnitLoader(id: string) {
            this.unitLoaders[id] = false;
        },
        async poluchitSpisokUnitov() {
            this.loaderSpiskaUnitov = true;
            const response = await UnitiService.list();
            if (response.status === "success") {
                this.spisok = response.data.map((item: ModelDlySpiskaUnitov) => new Unit(item));
            } else if (response.status === "fail") {
                this.spisok = [];
                this.oshibkaZagruzkiSpiska = response.data.message;
            } else if (response.status === "error") {
                this.spisok = [];
                this.oshibkaZagruzkiSpiska = response.message;
            }

            this.loaderSpiskaUnitov = false;

            return response;
        },
        async poluchitSpisokMoihUnitov() {
            this.loaderSpiskaUnitov = true;
            const response = await UnitiService.moi();
            if (response.status === "success") {
                this.spisok = response.data.map((item: ModelDlySpiskaUnitov) => new Unit(item));
            } else if (response.status === "fail") {
                this.spisok = [];
                this.oshibkaZagruzkiSpiska = response.data.message;
            } else if (response.status === "error") {
                this.spisok = [];
                this.oshibkaZagruzkiSpiska = response.message;
            }

            this.loaderSpiskaUnitov = false;

            return response;
        },
        async sobratMoiUnit(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.sobrat({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisokMoihUnitov();

            return response;
        },
        async ustanovitResultatSborkiMoegoUnita(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.ustanovitResultatSborki({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisokMoihUnitov();

            return response;
        },
        async obnovitMoiUnit(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.obnovit({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisokMoihUnitov();

            return response;
        },
        async ustanovitResultatObnovleniyaMoegoUnita(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.ustanovitResultatObnovleniya({ id })
            this.stopUnitLoader(id);

            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisokMoihUnitov();

            return response;
        },
        async podgotovitMoiUnit(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.podgotovit({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisokMoihUnitov();

            return response;
        },
        async ustanovitResultatPodgovkiMoegoUnita(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.ustanovitResultatPodgotovki({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisokMoihUnitov();

            return response;
        },
        async sbrositPodgotovkuMoegoUnita(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.sbrositPodgotovku({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisokMoihUnitov();

            return response;
        },
        async ustanovitResultatSbrosaPodgotovkiMoegoUnita(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.ustanovitResultatSbrosaPodgotovki({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisokMoihUnitov();

            return response;
        },
        async zapustitMoiUnit(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.zapustit({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisokMoihUnitov();

            return response;
        },
        async ustanovitResultatZapuskaMoegoUnita(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.ustanovitResultatZapuska({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisokMoihUnitov();

            return response;
        },
        async ostanovitMoiUnit(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.ostanovit({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisokMoihUnitov();

            return response;
        },
        async ustanovitResultatOstanovkiMoegoUnita(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.ustanovitResultatOstanovki({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisokMoihUnitov();

            return response;
        },
        async udalitMoiUnit(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.udalit({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisokMoihUnitov();

            return response;
        },
        async ustanovitResultatUdaleniyaMoegoUnita(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.ustanovitResultatUdaleniya({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisokMoihUnitov();

            return response;
        },
        async udalitMoiSlomaniiUnit(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.udalitSlomaniyUnit({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisokMoihUnitov();

            return response;
        },
    },
    getters: {
        getUnitLoader() {
            const store = this;
            return (id: string): boolean => {
                if (!store.unitLoaders.hasOwnProperty(id)) {
                    return false;
                }

                return store.unitLoaders[id];
            }
        }
    }
})
