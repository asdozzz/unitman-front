import {defineStore} from "pinia";
import ProektiService from "@/modules/unit/services/ProektiService";
import UnitiService from "@/modules/unit/services/UnitiService";
import ModelDlySpiskaProektov from "@/modules/unit/services/ProektiServices/model/ModelDlySpiskaProektov";
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

class Proekt {
    value: string;
    label: string;

    constructor(value: string, label: string) {
        this.value = value;
        this.label = label;
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
    proekti: {
        spisok: Proekt[];
        loader: boolean;
    },
    vetki: {
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
            proekti: {
                spisok: [],
                loader: false
            },
            vetki: {
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
        async poluchitMoiProekti() {
            this.proekti.loader = true;
            this.proekti.spisok = [];
            const response = await ProektiService.poluchitMoiProekti();

            this.proekti.loader = false;
            if (response.status === "success") {
                this.proekti.spisok = response.data.map((item: ModelDlySpiskaProektov) => new Proekt(item.id, item.name));
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }
        },
        async poluchitVetki() {
            this.vetki.loader = true;
            this.vetki.spisok = [];
            if (!this.form.projectId) {
                throw new Error('proekt ne vibran');
            }
            const response = await ProektiService.poluchitVetkiProekta({ id: this.form.projectId });

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
