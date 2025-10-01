import {defineStore} from "pinia";
import ProektiService from "@/modules/unit/services/ProektiService";
import UnitiService from "@/modules/unit/services/UnitiService";
import ModelDlySpiskaVetok from "@/modules/unit/services/ProektiServices/model/ModelDlySpiskaVetok";
import Unit, { PeremenayaKonfiga} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import {
    OtvetNaPolucheniePeremenihUnita
} from "@/modules/unit/services/UnitiService/model/OtvetNaPolucheniePeremenihUnita";

export class FormaDobavleniyaUnita {
    projectId: string;
    unitName: string;
    branch: string;
    peremenieKonfiga: PeremenayaKonfiga[];

    constructor(projectId: string = "", unitName: string = "", branch: string = "", peremenieKonfiga: PeremenayaKonfiga[] = []) {
        this.projectId = projectId;
        this.unitName = unitName;
        this.branch = branch;
        this.peremenieKonfiga = peremenieKonfiga;
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
    initPeremenie: boolean;

    vetki: {
        query: string | null;
        spisok: Vetka[];
        loader: boolean;
    },
    polucheniePeremenih: {
        loader: boolean;
    },
    dubli: {
        loader: boolean;
        spisok: Unit[];
    }
}


export const useFormaDobavleniyaUnitaStore = defineStore('FormaDobavleniyaUnitaStore', {
    state: (): FormaDobavleniyaUnitaState => {
        return {
            enable: false,
            form: new FormaDobavleniyaUnita(),
            loader: false,
            oshibkaOtBackenda: null,
            initPeremenie: false,

            vetki: {
                query: null,
                spisok: [],
                loader: false
            },
            polucheniePeremenih: {
                loader: false
            },
            dubli: {
                loader: false,
                spisok: []
            }
        }
    },
    actions: {
        otkritFormu() {
            this.form = new FormaDobavleniyaUnita();
            this.enable = true;
            this.oshibkaOtBackenda = null;
            this.loader = false;
            this.initPeremenie = false;
        },
        zakritFormu() {
            this.form = new FormaDobavleniyaUnita();
            this.enable = false;
            this.initPeremenie = false;
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
        async naitiDubliUnita() {
            if (!this.form.projectId) {
                throw new Error('proekt ne vibran');
            }
            this.dubli.loader = true;
            this.dubli.spisok = [];

            const response = await UnitiService.naitiDubliUnita({ projectId: this.form.projectId, branch: this.form.branch });

            this.dubli.loader = false;
            if (response.status === "success") {
                this.dubli.spisok = response.data;
            } else if (response.status === "fail") {
                //this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                //this.oshibkaOtBackenda = response.message;
            }
        },
        ochistitDubliUnita() {
          this.dubli.spisok = [];
          this.dubli.loader = false;
        },
        async poluchitPeremenieKonfiga() {
            if (!this.form.branch) {
                this.form.peremenieKonfiga = [];
                return;
            }

            this.polucheniePeremenih.loader = true;
            this.initPeremenie = false;
            if (!this.form.projectId) {
                throw new Error('proekt ne vibran');
            }
            const response = await UnitiService.poluchitKonfigPoNazvaniyuVetki(
                { projectId: this.form.projectId, branch: this.form.branch });

            this.polucheniePeremenih.loader = false;
            if (response.status === "success") {
                this.form.peremenieKonfiga = response.data.map((item:OtvetNaPolucheniePeremenihUnita) => new PeremenayaKonfiga(item.konfig, item.konfig.defaultValue));
                this.initPeremenie = true;
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }
        },
        async otpravitFormu() {
            this.loader = true;

            const response = await UnitiService.sozdat({
                projectId: this.form.projectId,
                branch: this.form.branch,
                unitName: this.form.unitName,
                znacheniePeremenoi: this.form.peremenieKonfiga.map((item) => {
                    return {
                        "id": item.konfig.id,
                        "value": item.value,
                        "type": item.konfig.type
                    }
                })
            });

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
