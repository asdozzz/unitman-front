import {defineStore} from "pinia";
import ProektiService from "@/modules/unit/services/ProektiService";
import type {Schema} from "@/api/types";

export type VipolnenayaZadacha = Schema<"ProjectRunnerJob">;

type VipolnenayaZadachaSPShagami = Schema<"ProjectRunnerJobDetailed">;


type StorVipolnenihZadachRunneraState = {
    loader: boolean;
    spisok: VipolnenayaZadacha[],
    selectJob: VipolnenayaZadachaSPShagami | null,
    oshibkaOtBackenda: string | null;
    projectId: string | null;
}

/**
 * Стор окна задач runner'а на странице проекта.
 *
 * ID стора ОБЯЗАН отличаться от ID стора страницы юнита
 * (`SpisokUnitov/StorVipolnenihZadachRunnera.ts`): Pinia ищет инстанс по ID,
 * поэтому при совпадении второй экран получал бы уже созданный чужой стор —
 * с другим набором полей. В результате `selectJob` оказывался объектом
 * `{prozesId, zadachaId, steps}`, а `selectJob.value?.steps` на странице
 * проекта был `undefined`, и никакие изменения туда не попадали.
 */
export const storVipolnenihZadachRunneraProekta = defineStore('StorVipolnenihZadachRunneraProekta', {
    state: (): StorVipolnenihZadachRunneraState => {
        return {
            loader: false,
            oshibkaOtBackenda: null,
            spisok: [],
            projectId: null,
            selectJob: null
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
