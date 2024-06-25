import {defineStore} from "pinia";
import ProektiService from "@/modules/unit/services/ProektiService";
import UnitiService from "@/modules/unit/services/UnitiService";
import ModelDlySpiskaVetok from "@/modules/unit/services/ProektiServices/model/ModelDlySpiskaVetok";
import Unit from "@/modules/unit/store/SpisokUnitov/model/Unit";

export class FormaIzmeneniyaVetkiUnita {
    id: string;
    newBranch: string;

    constructor(id: string = "", newBranch: string = "") {
        this.id = id;
        this.newBranch = newBranch;
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

type FormaIzmeneniyaVetkiUnitaState = {
    unit: Unit | null;
    enable: boolean;
    form:FormaIzmeneniyaVetkiUnita;
    loader: boolean;
    oshibkaOtBackenda: string | null;
    vetki: {
        spisok: Vetka[];
        loader: boolean;
    }
}

export const storFormiIzmeneniyaVetkiUnita = defineStore('StorFormiIzmeneniyaVetkiUnita', {
    state: (): FormaIzmeneniyaVetkiUnitaState => {
        return {
            unit: null,
            enable: false,
            form: new FormaIzmeneniyaVetkiUnita(),
            loader: false,
            oshibkaOtBackenda: null,
            vetki: {
                spisok: [],
                loader: false
            }
        };
    },
    actions: {
        otkritFormu(unit: Unit) {
            this.unit = unit;
            this.form = new FormaIzmeneniyaVetkiUnita(unit.id, unit.branch);
            this.enable = true;
            this.oshibkaOtBackenda = null;
            this.loader = false;
        },
        zakritFormu() {
            this.unit = null;
            this.form = new FormaIzmeneniyaVetkiUnita();
            this.enable = false;
            this.oshibkaOtBackenda = null;
            this.loader = false;
        },
        async poluchitVetki() {
            this.vetki.loader = true;
            this.vetki.spisok = [];
            if (!this.unit) {
                throw new Error('unit ne vibran');
            }
            const response = await ProektiService.poluchitVetkiProekta({ id: this.unit.projectId });

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
            const response = await UnitiService.izmenitVetkuUnita(this.form);

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
});
