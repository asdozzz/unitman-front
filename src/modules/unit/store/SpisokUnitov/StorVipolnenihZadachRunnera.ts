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
    //steps: ShagZadachi[]
}


type StorVipolnenihZadachRunneraState = {
    loader: boolean;
    spisok: VipolnenayaZadacha[],
    selectJob: {
        id: string;
        steps: ShagZadachi[]
    },
    oshibkaOtBackenda: string | null;
    unitId: string | null;
}

export const storVipolnenihZadachRunnera = defineStore('StorVipolnenihZadachRunnera', {
    state: (): StorVipolnenihZadachRunneraState => {
        return {
            loader: false,
            oshibkaOtBackenda: null,
            spisok: [],
            unitId: null,
            selectJob: {
                id: "",
                steps:[]
            }
        };
    },
    actions: {
        async select(jobId: string) {
            const response = await UnitiService.poluchitShagiZadachiRunnera({ id: jobId as string });

            this.loader = false;
            if (response.status === "success") {
                this.selectJob = response.data;
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }
        },
        otkritOkno(id: string) {
            this.spisok = [];
            this.unitId = id;
            this.oshibkaOtBackenda = null;
            this.loader = false;
        },
        zakritOkno() {
            this.spisok = [];
            this.unitId = null;
        },
        async poluchitVipolnenieZadachiRunnera(unitId: string) {
            this.otkritOkno(unitId);
            this.loader = true;

            const response = await UnitiService.poluchitVipolnenieZadachiRunnera({ id: this.unitId as string });

            this.loader = false;
            if (response.status === "success") {
                this.spisok = response.data;
                this.select(this.spisok[0].id);
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }
        },
    }
});
