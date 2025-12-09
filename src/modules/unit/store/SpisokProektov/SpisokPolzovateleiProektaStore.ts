import {defineStore} from "pinia";
import ProektiService from "@/modules/unit/services/ProektiService";
import PolzovatelProekta from "@/modules/unit/store/SpisokProektov/model/PolzovatelProekta";

import {
    ModelDlySpiskaPolzovateleiProekta
} from "@/modules/unit/services/ProektiServices/model/ModelDlySpiskaPolzovateleiProekta";
import {Notify} from "quasar";

type SpisokPolzovateleiProektaState = {
    enable: boolean;
    projectId: string | null,
    spisok: PolzovatelProekta[],
    loaderSpiskaPolzovatei: boolean,
    loaderUdaleniya: boolean;
    loaderDobavleniya: boolean;
    oshibkaZagruzkiSpiska: string | null;
}

export const useSpisokPolzovateleiProektaStore = defineStore('SpisokPolzovateleiProektaStore', {
    state: (): SpisokPolzovateleiProektaState => {
        return {
            enable: false,
            projectId: null,
            spisok: [],
            loaderSpiskaPolzovatei: false,
            loaderUdaleniya: false,
            loaderDobavleniya: false,
            oshibkaZagruzkiSpiska: null,
        }
    },
    getters: {
        spisokIdPolzovatelei(state): string[] {
            return state.spisok.map((item: PolzovatelProekta) => item.userId);
        },
    },
    actions: {
        pokazatSpisok(projectId: string) {
            this.projectId = projectId;
            this.enable = true;
        },
        skritSpisok() {
            this.projectId = null;
            this.enable = false;
        },
        async poluchitSpisok() {
            if (this.projectId === null) {
                throw new Error('projectId ne opredelen dly polucheniya spiska polzovatelei proekta');
            }

            this.loaderSpiskaPolzovatei = true;

            const response = await ProektiService.poluchitSpisokPolzovatelei({ id: this.projectId});

            if (response.status === "success") {
                this.spisok = response.data.map((item:ModelDlySpiskaPolzovateleiProekta) => new PolzovatelProekta(item))
            } else if (response.status === "fail") {
                this.spisok = [];
                this.oshibkaZagruzkiSpiska = response.data.message;
            } else if (response.status === "error") {
                this.spisok = [];
                this.oshibkaZagruzkiSpiska = response.message;
            }

            this.loaderSpiskaPolzovatei = false;

            return response;
        },
        async udalitPolzovatelyaIzProekta(userId: string) {
            if (this.projectId === null) {
                throw new Error('projectId ne opredelen dly polucheniya spiska polzovatelei proekta');
            }

            this.loaderUdaleniya = true;

            const response = await ProektiService.udalitPolzovatelyaIzProekta({ id: this.projectId, userId });

            this.loaderUdaleniya = false;

            if (response.status === "fail"){
                Notify.create(response.data.message);
            } else if (response.status === "success") {
                this.spisok = this.spisok.filter((item) => item.userId !== userId)
            }

            return response;
        },
        async dobavitPolzovatelya(userId: string) {
            if (this.projectId === null) {
                throw new Error('projectId ne opredelen dly polucheniya spiska polzovatelei proekta');
            }
            this.loaderDobavleniya = true;

            const response = await ProektiService.dobavitPolzovatelyaKProektu({ id: this.projectId, userId });

            this.loaderDobavleniya = false;

            if (response.status === "fail"){
                Notify.create(response.data.message);
            } else if (response.status === "success") {
                this.spisok.push(new PolzovatelProekta({ userId, role: "USER"}))
            }

            return response;
        },
    }
});
