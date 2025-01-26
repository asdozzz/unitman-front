import { defineStore } from 'pinia';
import UnitiService from "@/modules/unit/services/UnitiService";
import Unit from "@/modules/unit/store/SpisokUnitov/model/Unit";
import {Notify} from "quasar";
import ProektiService from "@/modules/unit/services/ProektiService";
import ModelDlySpiskaProektov from "@/modules/unit/services/ProektiServices/model/ModelDlySpiskaProektov";
import ModelDlySpiskaUnitov from "@/modules/unit/services/UnitiService/model/ModelDlySpiskaUnitov";

type NastroikiSpiska = {
    filter: {
        onlyMine: boolean,
        name: string | null
        branch: string | null
        projectId: string | null
    },
    limit: number,
    offset: number
}

type PolzovatelProekta  = {
    role: string;
    userId: string;
}

class Proekt {
    value: string;
    label: string;
    users: PolzovatelProekta[];

    constructor(value: string, label: string, users: PolzovatelProekta[]) {
        this.value = value;
        this.label = label;
        this.users = users;
    }
}

export type SpisokUnitovState = {
    nastroikiSpiska: NastroikiSpiska;
    spisok: Unit[];
    proekti: {
        spisok: Proekt[];
        loader: boolean;
    },
    loaderSpiskaUnitov: boolean;
    oshibkaZagruzkiSpiska: string | null;
    loaderObnovleniyaUnita: boolean;
    unitLoaders: Record<string, boolean>;
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
                },
                limit: 100,
                offset: 0
            },
            spisok:[],
            proekti: {
                spisok: [],
                loader: false
            },
            loaderSpiskaUnitov:false,
            oshibkaZagruzkiSpiska: null,
            loaderObnovleniyaUnita:false,
            unitLoaders: {},
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
        udalitUnitIzSpiska(id: string): void {
            const index = this.spisok.findIndex((item: Unit) => item.id === id);

            if (index > -1) {
                this.spisok.splice(index, 1);
            }
        },
        async poluchitSpisokUnitov() {
            this.loaderSpiskaUnitov = true;
            const response = await UnitiService.list(this.nastroikiSpiska);
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
        async obnovitUnit(id: string) {
            this.startUnitLoader(id);
            const response = await UnitiService.obnovit({ id })


            if (response.status === "fail"){
                Notify.create(response.data.message);
            } else if (response.status === "success") {
                const unitIndex = this.spisok.findIndex((unit: Unit) => unit.id === id);

                if (unitIndex !== -1) {
                    this.spisok[unitIndex] = new Unit(response.data);
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
        async obnovitKodPosleZapuska(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.obnovitKodPosleZapuska({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
        async udalitUnitPosleZapuska(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.udalitUnitPosleZapuska({ id })
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
        async ustanovitResultatDeistviya(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.ustanovitResultatDeistviya({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
        async proveritKonteinerUnita(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.proveritKonteinerUnita({ id })
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

            //this.obnovitUnit(id);

            return response;
        },
        async ustanovitResultatUdaleniyaMoegoUnita(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.ustanovitResultatUdaleniya({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            //this.obnovitUnit(id);

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
        async poluchitMoiProekti() {
            this.proekti.loader = true;
            this.proekti.spisok = [];
            const response = await ProektiService.poluchitMoiProekti();

            this.proekti.loader = false;
            if (response.status === "success") {
                this.proekti.spisok = response.data.map((item: ModelDlySpiskaProektov) => new Proekt(item.id, item.name, item.users));
            } else if (response.status === "fail") {
                Notify.create(response.data.message);
            } else if (response.status === "error") {
                Notify.create(response.message);
            }
        },
    },
    getters: {
        issetUnit() {
            const store = this;
            return (id: string): boolean => {
                const unit = store.spisok.find((item:Unit) => item.id === id);

                return unit !== undefined;
            }
        },
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
        },
        esliZapushen() {
            return (item: Unit): boolean => {
                return item.state === 'USPESHNO_ZAPUSHEN';
            }
        },
        getUserRoleByProjectIdAndUserId() {
            const store = this;
            return (projectId: string, userId: string): string | null => {
                if (store.proekti.spisok.length === 0) return null;
                const proekt = store.proekti.spisok.find((proekt: Proekt) => proekt.value === projectId);

                if (!proekt) return null;

                const user = proekt.users.find((user: PolzovatelProekta) => user.userId === userId);

                if (!user) return null;

                return user.role;
            }
        },
    }
})
