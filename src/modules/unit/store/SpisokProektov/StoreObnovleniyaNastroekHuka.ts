import {defineStore} from "pinia";
import ProektiService from "@/modules/unit/services/ProektiService";

export class HookSettingsForm {
    id: string;
    avtosozdanie: boolean;
    avtoobnovlenie: boolean;
    avtoudalenie: boolean;
    obnovlenieBezSbrosaPodgotovki: boolean;

    constructor(id: string = "", avtosozdanie: boolean = false, avtoobnovlenie: boolean = true, avtoudalenie: boolean = true, obnovlenieBezSbrosaPodgotovki: boolean = false) {
        this.id = id;
        this.avtosozdanie = avtosozdanie;
        this.avtoobnovlenie = avtoobnovlenie;
        this.avtoudalenie = avtoudalenie;
        this.obnovlenieBezSbrosaPodgotovki = obnovlenieBezSbrosaPodgotovki;
    }
}

type HookSettingsFormState = {
    enable: boolean;
    form:HookSettingsForm;
    loader: boolean;
    oshibkaOtBackenda: string | null;
}
export const storeObnovleniyaNastroekHuka = defineStore('StoreObnovleniyaNastroekHuka', {
    state: (): HookSettingsFormState => {
        return {
            enable: false,
            form: new HookSettingsForm(),
            loader: false,
            oshibkaOtBackenda: null
        }
    },
    actions: {
        otkritFormu(form: HookSettingsForm) {
            this.form = form;
            this.enable = true;
            this.oshibkaOtBackenda = null;
            this.loader = false;
        },
        zakritFormu() {
            this.form = new HookSettingsForm();
            this.enable = false;
        },
        async otpravitFormu() {
            this.loader = true;
            const response = await ProektiService.obnovitNastroikiHuka(this.form);

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
