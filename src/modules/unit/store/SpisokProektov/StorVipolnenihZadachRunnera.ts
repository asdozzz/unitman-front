import {defineStore} from "pinia";
import ProektiService from "@/modules/unit/services/ProektiService";

type ShagZadachi = {
    command: string;
    response: string;
    success: boolean;
    unixtime: number;
}

export type VipolnenayaZadacha = {
    id: string;
    projectId: string;
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
    projectId: string | null;
}

export const storVipolnenihZadachRunnera = defineStore('StorVipolnenihZadachRunnera', {
    state: (): StorVipolnenihZadachRunneraState => {
        return {
            loader: false,
            oshibkaOtBackenda: null,
            spisok: [],
            projectId: null,
            selectJob: {
                id: "",
                steps:[]
            }
        };
    },
    actions: {
        async select(jobId: string) {
            const response = await ProektiService.poluchitShagiZadachiRunnera({ id: jobId as string });

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
            this.projectId = id;
            this.oshibkaOtBackenda = null;
            this.loader = false;
        },
        zakritOkno() {
            this.spisok = [];
            this.projectId = null;
        },
        async poluchitVipolnenieZadachiRunnera(projectId: string) {
            this.otkritOkno(projectId);
            this.loader = true;

            const response = await ProektiService.poluchitVipolnenieZadachiRunnera({ id: this.projectId as string });

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
