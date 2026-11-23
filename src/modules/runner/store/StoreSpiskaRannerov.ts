import { defineStore } from 'pinia';
import RunnerService from "@/modules/runner/services/RunnerService";
import type { RannerKarta } from "@/modules/runner/model/ResursiServera";

/** Период опроса списка раннеров: снимок ресурсов обновляется раз в 30 секунд. */
const PERIOD_OPROSA_MS = 30000;

type SpisokRannerovStore = {
    loader: boolean;
    ranners: RannerKarta[];
    oshibka: string;
    init: boolean;
    pause: boolean;
}

export const storeSpiskaRannerov = defineStore('SpisokRannerov', {
    state: (): SpisokRannerovStore => {
        return {
            loader: false,
            ranners: [],
            oshibka: "",
            init: false,
            pause: false,
        };
    },
    getters: {
        /** Есть ли блокировка хотя бы на одном раннере. */
        estBlokirovka: (state): boolean => state.ranners.some((ranner) => ranner.blocked),
    },
    actions: {
        async zagruzit() {
            this.loader = true;

            const response = await RunnerService.getRunners();

            if (response.status === "fail") {
                this.oshibka = response.data.message;
            } else if (response.status === "error") {
                this.oshibka = response.message;
            } else {
                this.oshibka = "";
                this.ranners = response.data;
            }

            this.loader = false;
        },
        async zapustitOprosSpiska() {
            this.init = true;

            if (!this.pause) {
                await this.zagruzit();
                setTimeout(this.zapustitOprosSpiska, PERIOD_OPROSA_MS);
            }
        },
        ostanovitOprosSpiska(): void {
            this.pause = true;
        },
        vostanovitOprosSpiska(): void {
            this.pause = false;
        },
    },
});
