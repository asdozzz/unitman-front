import {defineStore} from "pinia";
import ProektiService from "@/modules/unit/services/ProektiService";
import UnitiService from "@/modules/unit/services/UnitiService";
import ModelDlySpiskaVetok from "@/modules/unit/services/ProektiServices/model/ModelDlySpiskaVetok";

export class FormaDobavleniyaUnita {
    projectId: string;
    unitName: string;
    branch: string;

    constructor(projectId: string = "", unitName: string = "", branch: string = "") {
        this.projectId = projectId;
        this.unitName = unitName;
        this.branch = branch;
    }
}

class Vetka {
    value: string;
    label: string;

    constructor(value: string, label: string) {
        this.value = value;
        this.label = label;
    }
}

type FormaDobavleniyaUnitaState = {
    enable: boolean;
    form:FormaDobavleniyaUnita;
    loader: boolean;
    oshibkaOtBackenda: string | null;

    vetki: {
        query: string | null;
        spisok: Vetka[];
        loader: boolean;
    }
}


export const useFormaDobavleniyaUnitaStore = defineStore('FormaDobavleniyaUnitaStore', {
    state: (): FormaDobavleniyaUnitaState => {
        return {
            enable: false,
            form: new FormaDobavleniyaUnita(),
            loader: false,
            oshibkaOtBackenda: null,

            vetki: {
                query: null,
                spisok: [],
                loader: false
            }
        }
    },
    actions: {
        otkritFormu() {
            this.form = new FormaDobavleniyaUnita();
            this.enable = true;
            this.oshibkaOtBackenda = null;
            this.loader = false;
        },
        zakritFormu() {
            this.form = new FormaDobavleniyaUnita();
            this.enable = false;
        },

        async poluchitVetki() {
            this.vetki.loader = true;
            this.vetki.spisok = [];
            if (!this.form.projectId) {
                throw new Error('proekt ne vibran');
            }
            const response = await ProektiService.poluchitVetkiProekta({ id: this.form.projectId, query: this.vetki.query });

            this.vetki.loader = false;
            if (response.status === "success") {
                this.vetki.spisok = response.data.map((item: ModelDlySpiskaVetok) => new Vetka(item.name, item.name));
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }
        },
        async otpravitFormu() {
            this.loader = true;
            const response = await UnitiService.sozdat(this.form);

            this.loader = false;
            if (response.status === "success") {
                this.oshibkaOtBackenda = null;
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }

            return response;
        },
    }
})
