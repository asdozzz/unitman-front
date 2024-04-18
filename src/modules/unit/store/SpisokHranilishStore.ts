import { defineStore } from 'pinia';
import HranilishaService from "@/modules/unit/services/HranilishaService";
import {Notify} from "quasar";
import Hranilishe from "@/modules/unit/store/SpisokHranilish/model/Hranilishe";
import ModelDlySpiskaHranilish from "@/modules/unit/services/HranilishaService/model/ModelDlySpiskaHranilish";

export type SpisokHranilishState = {
    spisok: Hranilishe[];
    loaderSpiskaHranilish: boolean;
    oshibkaZagruzkiSpiska: string | null;
    loaderObnovleniyaHranilisha: boolean;
}

export const useSpisokHranilishStore = defineStore('SpisokHranilishStore', {
    state: (): SpisokHranilishState => {
        return {
            spisok:[],
            loaderSpiskaHranilish:false,
            oshibkaZagruzkiSpiska: null,
            loaderObnovleniyaHranilisha:false,
        }
    },
    actions: {
        async poluchitSpisokHranilish() {
            this.loaderSpiskaHranilish = true;
            const response = await HranilishaService.list();
            if (response.status === "success") {
                this.spisok = response.data.map((item: ModelDlySpiskaHranilish) => new Hranilishe(item));
            } else if (response.status === "fail") {
                this.spisok = [];
                this.oshibkaZagruzkiSpiska = response.data.message;
            } else if (response.status === "error") {
                this.spisok = [];
                this.oshibkaZagruzkiSpiska = response.message;
            }

            this.loaderSpiskaHranilish = false;

            return response;
        },
        async activirovatHranilishe(repoId: string) {
            this.loaderObnovleniyaHranilisha = true;

            const response = await HranilishaService.confirm({ repoId })
            this.loaderObnovleniyaHranilisha = false;
            if (response.status === "success") {
                this.poluchitSpisokHranilish();
            } else if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            return response;
        },
        async udalitHranilishe(repoId: string) {
            this.loaderObnovleniyaHranilisha = true;

            const response = await HranilishaService.delete({ repoId })
            this.loaderObnovleniyaHranilisha = false;
            if (response.status === "success") {
                this.poluchitSpisokHranilish();
            } else if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            return response;
        },
    }
})
