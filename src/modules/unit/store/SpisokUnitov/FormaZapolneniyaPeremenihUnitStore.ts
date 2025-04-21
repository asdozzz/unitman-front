import {defineStore} from "pinia";
import UnitiService from "@/modules/unit/services/UnitiService";
import {
    OtvetNaPolucheniePeremenihUnita
} from "@/modules/unit/services/UnitiService/model/OtvetNaPolucheniePeremenihUnita";
import { PeremenayaKonfiga} from "@/modules/unit/store/SpisokUnitov/model/Unit";



class FormaZapolneniyaPeremenih {
    id: string;
    values: PeremenayaKonfiga[];
    constructor(id: string = "", values: PeremenayaKonfiga[] = []) {
        this.id = id;
        this.values = values;
    }
}

type FormaZapolneniyaPeremenihUnitaState = {
    enable: boolean;
    loader: boolean;
    form: FormaZapolneniyaPeremenih,
    oshibkaOtBackenda: string | null;
}

export const useFormaZapolneniyaPeremenihUnitaStore = defineStore('FormaZapolneniyaPeremenihUnita', {
    state: (): FormaZapolneniyaPeremenihUnitaState => {
        return {
            enable: false,
            loader: false,
            oshibkaOtBackenda: null,
            form: new FormaZapolneniyaPeremenih(),
        };
    },
    actions: {
        otkritFormu(id: string) {
            this.form = new FormaZapolneniyaPeremenih(id);
            this.enable = true;
            this.oshibkaOtBackenda = null;
            this.loader = false;
        },
        zakritFormu() {
            this.form = new FormaZapolneniyaPeremenih();
            this.enable = false;
        },
        async poluchitPeremenieUnita() {
            this.loader = true;
            this.form.values = [];
            const response = await UnitiService.poluchitPeremenieUnita({ id: this.form.id });

            this.loader = false;
            if (response.status === "success") {
                this.form.values = response.data.map((item:OtvetNaPolucheniePeremenihUnita) => new PeremenayaKonfiga(item.konfig, item.value));
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }
        },
        async otpravitFormu() {
            this.loader = true;

            const values: Record<string, string>  = {};
            this.form.values.forEach((item: PeremenayaKonfiga) => {
                values[item.konfig.id] = item.value;
            })
            const sendData = {
                id: this.form.id,
                values
            }
            const response = await UnitiService.zapolnitPeremenie(sendData);

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
