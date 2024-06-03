import {defineStore} from "pinia";
import UnitiService from "@/modules/unit/services/UnitiService";

type ShagZadachi = {
    command: string;
    response: string;
    success: boolean;
    unixtime: number;
}

export type VipolnenayaZadacha = {
    id: string;
    unitId: string;
    jobType: string;
    success: boolean;
    steps: ShagZadachi[]
}


type StorVipolnenihZadachRunneraState = {
    enable: boolean;
    loader: boolean;
    spisok: VipolnenayaZadacha[],
    selectIndex: number,
    oshibkaOtBackenda: string | null;
    unitId: string | null;
}

export const storVipolnenihZadachRunnera = defineStore('StorVipolnenihZadachRunnera', {
    state: (): StorVipolnenihZadachRunneraState => {
        return {
            enable: false,
            loader: false,
            oshibkaOtBackenda: null,
            spisok: [],
            unitId: null,
            selectIndex: 0
        };
    },
    getters: {
        selectJob(): VipolnenayaZadacha | null  {
            if (this.spisok.length === 0) {
                return null;
            }
            return this.spisok[this.selectIndex] ?? null;
        },
    },
    actions: {
        select(index: number) {
            this.selectIndex = index;
        },
        otkritOkno(id: string) {
            this.spisok = [];
            this.unitId = id;
            this.enable = true;
            this.oshibkaOtBackenda = null;
            this.loader = false;
        },
        zakritOkno() {
            this.spisok = [];
            this.unitId = null;
            this.enable = false;
        },
        async poluchitVipolnenieZadachiRunnera() {
            this.loader = true;

            const response = await UnitiService.poluchitVipolnenieZadachiRunnera({ id: this.unitId as string });

            this.loader = false;
            if (response.status === "success") {
                this.spisok = response.data;
                this.selectIndex = 0;
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }
        },
    }
});
