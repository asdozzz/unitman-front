import { defineStore } from 'pinia';
import ProektiService from "@/modules/unit/services/ProektiService";
import Proekt from "@/modules/unit/store/SpisokProektov/model/Proekt";
import ModelDlySpiskaProektov from "@/modules/unit/services/ProektiServices/model/ModelDlySpiskaProektov";

import {Notify} from "quasar";

export type SpisokProektovState = {
    spisok: Proekt[];
    loaderSpiskaProektov: boolean;
    oshibkaZagruzkiSpiska: string | null;
    loaderObnovleniyaProekta: boolean;
}

export const useSpisokProektovStore = defineStore('SpisokProektovStore', {
    state: (): SpisokProektovState => {
        return {
            spisok:[],
            loaderSpiskaProektov:false,
            oshibkaZagruzkiSpiska: null,
            loaderObnovleniyaProekta:false,
        }
    },
    getters: {
        poluchitProektPoId: (state) => {
            return (id: string) => state.spisok.find((proekt: Proekt) => proekt.id === id);
        },
        poluchitStateProektaPoId() {
            const store = this;
            return (id: string): string => {
                const proekt = store.poluchitProektPoId(id);

                if (!proekt) {
                    return "";
                }

                return proekt.state;
            }
        },
        proektGdetResultatSborki() {
            const store = this;
            return (id: string): boolean => {
                const state = store.poluchitStateProektaPoId(id);
                return state === 'BUILD_PENDING';
            }
        },
        proektGdetResultatUdaleniya() {
            const store = this;
            return (id: string): boolean => {
                const state = store.poluchitStateProektaPoId(id);
                return state === 'REMOVE_PENDING';
            }
        },
        proektGdetResultatiOtRunnera() {
            const store = this;
            return (id: string): boolean => {
                return store.proektGdetResultatSborki(id) || store.proektGdetResultatUdaleniya(id);
            }
        },
        proektSloman() {
            const store = this;
            return (id: string): boolean => {
                const state = store.poluchitStateProektaPoId(id);
                return state === 'REMOVE_ERROR';
            }
        },
        proektNeSobirali() {
            const store = this;
            return (id: string): boolean => {
                const state = store.poluchitStateProektaPoId(id);
                return state === 'NEW';
            }
        },
    },
    actions: {
        async poluchitSpisokProektov() {
            this.loaderSpiskaProektov = true;
            const response = await ProektiService.list();
            if (response.status === "success") {
                this.spisok = response.data.map((item: ModelDlySpiskaProektov) => new Proekt(item));
            } else if (response.status === "fail") {
                this.spisok = [];
                this.oshibkaZagruzkiSpiska = response.data.message;
            } else if (response.status === "error") {
                this.spisok = [];
                this.oshibkaZagruzkiSpiska = response.message;
            }

            this.loaderSpiskaProektov = false;

            return response;
        },
        async udalitProekt(id: string) {
            this.loaderObnovleniyaProekta = true;

            const response = await ProektiService.udalit({ id })
            this.loaderObnovleniyaProekta = false;
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisokProektov();

            return response;
        },
        async udalitSlomaniiProekt(id: string) {
            this.loaderObnovleniyaProekta = true;

            const response = await ProektiService.udalitSlomaniiProekt({ id })
            this.loaderObnovleniyaProekta = false;
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisokProektov();

            return response;
        },
        async aktivirovat(id: string) {
            this.loaderObnovleniyaProekta = true;

            const response = await ProektiService.aktivirovat({ id })
            this.loaderObnovleniyaProekta = false;
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisokProektov();

            return response;
        },
        async deaktivirovat(id: string) {
            this.loaderObnovleniyaProekta = true;

            const response = await ProektiService.deaktivirovat({ id })
            this.loaderObnovleniyaProekta = false;
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisokProektov();

            return response;
        },
        async sobrat(id: string) {
            this.loaderObnovleniyaProekta = true;

            const response = await ProektiService.sobrat({ id })
            this.loaderObnovleniyaProekta = false;
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisokProektov();

            return response;
        },
    }
})
