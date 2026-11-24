import { defineStore } from 'pinia';
import RunnerService from "@/modules/runner/services/RunnerService";
import type { UgrozyRannerov } from "@/modules/runner/model/ResursiServera";

/** Период опроса сводки угроз для шапки сайта. */
const PERIOD_OPROSA_MS = 60000;

const PUSTAYA_SVODKA: UgrozyRannerov = {
    hasThreats: false,
    worstLevel: "ok",
    count: 0,
    runners: [],
    registeredCount: 0,
};

type UgrozyRannerovStore = {
    loader: boolean;
    svodka: UgrozyRannerov;
    oshibka: string;
    init: boolean;
    pause: boolean;
    /** Первый успешный ответ получен: пустой реестр не путается с загрузкой. */
    loaded: boolean;
}

export const storeUgrozRannerov = defineStore('UgrozRannerov', {
    state: (): UgrozyRannerovStore => {
        return {
            loader: false,
            svodka: { ...PUSTAYA_SVODKA },
            oshibka: "",
            init: false,
            pause: false,
            loaded: false,
        };
    },
    getters: {
        estUgrozy: (state): boolean =>
            state.loaded &&
            (state.svodka.hasThreats || state.svodka.registeredCount === 0),
        netZaregistrirovannyhRannerov: (state): boolean =>
            state.loaded && state.svodka.registeredCount === 0,
        hudshiyUroven: (state) => state.svodka.worstLevel,
    },
    actions: {
        async zagruzit() {
            this.loader = true;

            const response = await RunnerService.getThreats();

            if (response.status === "fail") {
                this.oshibka = response.data.message;
            } else if (response.status === "error") {
                this.oshibka = response.message;
            } else {
                this.oshibka = "";
                this.svodka = response.data;
                this.loaded = true;
            }

            this.loader = false;
        },
        async zapustitOprosUgrozy() {
            this.init = true;

            if (!this.pause) {
                await this.zagruzit();
                setTimeout(this.zapustitOprosUgrozy, PERIOD_OPROSA_MS);
            }
        },
        ostanovitOprosUgrozy(): void {
            this.pause = true;
        },
        vostanovitOprosUgrozy(): void {
            this.pause = false;
        },
    },
});
