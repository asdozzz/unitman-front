import {defineStore} from "pinia";
import UnitiService from "@/modules/unit/services/UnitiService";
import {StatusProzesa, StatusZadachi, TipProzesa, TipZadachi} from "@/modules/unit/store/SpisokUnitov/model/UnitEnums";

type ShagZadachi = {
    command: string;
    response: string;
    success: boolean;
    unixtime: number;
}

export type ZadachaUnitaBezShagov = {
    id: string;
    type: TipZadachi;
    state: StatusZadachi;
}

export type ProzesUnitaBezShagov = {
    id: string;
    userId: string;
    type: TipProzesa;
    state: StatusProzesa;
    jobs: ZadachaUnitaBezShagov[];
};


type StorVipolnenihZadachRunneraState = {
    loader: boolean;
    spisok: ProzesUnitaBezShagov[],
    selectJob: {
        prozesId: string;
        zadachaId: string;
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
                prozesId: "",
                zadachaId: "",
                steps:[]
            }
        };
    },
    actions: {
        async select(prozesId: string, zadachaId: string) {
            const response = await UnitiService.poluchitShagiZadachiRunnera({ prozesId, zadachaId });

            this.loader = false;
            if (response.status === "success") {
                this.selectJob = {
                    prozesId,
                    zadachaId,
                    steps: response.data,
                };
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
                if (this.spisok.length > 0) {
                    this.select(this.spisok[0].id, this.spisok[0].jobs[0].id);
                }
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }
        },
    }
});
