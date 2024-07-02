import { defineStore } from 'pinia';
import UnitiService from "@/modules/unit/services/UnitiService";
import Unit from "@/modules/unit/store/SpisokUnitov/model/Unit";
import ModelDlySpiskaUnitov from "@/modules/unit/services/UnitiService/model/ModelDlySpiskaUnitov";
import {Notify} from "quasar";

type NastroikiSpiska = {
    filter: {
        onlyMine: boolean,
        name: string | null
        branch: string | null
        projectId: string | null
    }
}

export type SpisokUnitovState = {
    nastroikiSpiska: NastroikiSpiska;
    spisok: Unit[];
    loaderSpiskaUnitov: boolean;
    oshibkaZagruzkiSpiska: string | null;
    loaderObnovleniyaUnita: boolean;
    unitLoaders: Record<string, boolean>;
    ocheredDlyObnovleniya: string[],
    pollingId: any | null
}

export const useSpisokUnitovStore = defineStore('SpisokUnitovStore', {
    state: (): SpisokUnitovState => {
        return {
            nastroikiSpiska: {
                filter: {
                    onlyMine: false,
                    name: null,
                    branch: null,
                    projectId: null
                }
            },
            spisok:[],
            loaderSpiskaUnitov:false,
            oshibkaZagruzkiSpiska: null,
            loaderObnovleniyaUnita:false,
            unitLoaders: {},
            ocheredDlyObnovleniya:[],
            pollingId: null,
        }
    },
    actions: {
        startUnitLoader(id: string) {
            this.unitLoaders[id] = true;
        },
        stopUnitLoader(id: string) {
            this.unitLoaders[id] = false;
        },
        dobavitVOcherediNaObnovlenie(id: string): void {
            console.log('dobavitVOcherediNaObnovlenie', id);
            this.ocheredDlyObnovleniya.push(id);
        },
        udalitIzOcherediNaObnovlenie(id: string): void {
            const index = this.ocheredDlyObnovleniya.indexOf(id);

            if (index > -1) {
                this.ocheredDlyObnovleniya.splice(index, 1);
            }
        },
        zapustitObrabotkuOcherediNaObnovlenie(): void {
            if (!this.pollingId) {
                clearInterval(this.pollingId);
            }
            this.pollingId = setInterval(() => {
                console.log('polling', this.ocheredDlyObnovleniya.length);
                if (this.ocheredDlyObnovleniya.length > 0) {
                    this.obnovitUnit(this.ocheredDlyObnovleniya[0]);
                }
            }, 2000);
        },
        ostanovitObrabotkuOcherediNaObnovlenie(): void {
            if (!this.pollingId) {
                clearInterval(this.pollingId);
            }
        },
        udalitUnitIzSpiska(id: string): void {
            const index = this.spisok.findIndex((item: Unit) => item.id === id);

            if (index > -1) {
                this.spisok.splice(index, 1);
            }
        },
        async poluchitSpisokUnitov() {
            this.loaderSpiskaUnitov = true;
            this.ocheredDlyObnovleniya = [];
            const response = await UnitiService.list(this.nastroikiSpiska);
            if (response.status === "success") {
                this.spisok = response.data.map((item: ModelDlySpiskaUnitov) => new Unit(item));

                this.spisok.forEach((item: Unit) => {
                    if (item.waitResultFromRunner) {
                        this.dobavitVOcherediNaObnovlenie(item.id);
                    }
                });
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
        async obnovitUnit(id: string) {
            this.startUnitLoader(id);
            this.udalitIzOcherediNaObnovlenie(id);
            const response = await UnitiService.obnovit({ id })

            if (response.status === "fail"){
                Notify.create(response.data.message);
            } else if (response.status === "success") {
                const unitIndex = this.spisok.findIndex((unit: Unit) => unit.id === id);

                if (unitIndex !== -1) {
                    this.spisok[unitIndex] = new Unit(response.data);
                    if (this.spisok[unitIndex].waitResultFromRunner) {
                        this.dobavitVOcherediNaObnovlenie(id);
                    }
                }
            }

            this.stopUnitLoader(id);

            return response;
        },
        async sobratMoiUnit(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.sobrat({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
        async ustanovitResultatSborkiMoegoUnita(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.ustanovitResultatSborki({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
        async obnovitKodMoegoUnita(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.obnovitKodUnita({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
        async ustanovitResultatObnovleniyaMoegoUnita(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.ustanovitResultatObnovleniya({ id })
            this.stopUnitLoader(id);

            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
        async podgotovitMoiUnit(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.podgotovit({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
        async ustanovitResultatPodgovkiMoegoUnita(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.ustanovitResultatPodgotovki({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
        async sbrositPodgotovkuMoegoUnita(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.sbrositPodgotovku({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
        async ustanovitResultatSbrosaPodgotovkiMoegoUnita(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.ustanovitResultatSbrosaPodgotovki({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
        async zapustitMoiUnit(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.zapustit({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
        async ustanovitResultatZapuskaMoegoUnita(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.ustanovitResultatZapuska({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
        async ostanovitMoiUnit(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.ostanovit({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
        async ustanovitResultatOstanovkiMoegoUnita(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.ustanovitResultatOstanovki({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
        async udalitMoiUnit(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.udalit({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
        async ustanovitResultatUdaleniyaMoegoUnita(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.ustanovitResultatUdaleniya({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
        async udalitMoiSlomaniiUnit(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.udalitSlomaniyUnit({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.udalitUnitIzSpiska(id);

            return response;
        },
        async udalitSlomaniiUnit(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.udalitSlomaniyUnit({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.udalitUnitIzSpiska(id);

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
        },
        showForceRemove() {
            return (item: Unit): boolean => {
                return item.commands.some((command: string) => ['udalitVruchnuyu'].includes(command))
            }
        }
    }
})
