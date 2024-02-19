import {defineStore} from "pinia";
import HranilishaService from "@/modules/unit/services/HranilishaService";

export class EditForm {
    repoId: string;
    token: string;

    constructor(repoId: string = "", token: string = "") {
        this.repoId = repoId;
        this.token = token;
    }
}

type EditFormState = {
    enable: boolean;
    form:EditForm;
    loader: boolean;
    oshibkaOtBackenda: string | null;
}
export const useEditFormStore = defineStore('EditFormStore', {
    state: (): EditFormState => {
        return {
            enable: false,
            form: new EditForm(),
            loader: false,
            oshibkaOtBackenda: null
        }
    },
    actions: {
        otkritFormu(form: EditForm) {
            this.form = form;
            this.enable = true;
            this.oshibkaOtBackenda = null;
            this.loader = false;
        },
        zakritFormu() {
            this.form = new EditForm();
            this.enable = false;
        },
        async otpravitFormu() {
            this.loader = true;
            const response = await HranilishaService.changeCredentials(this.form);

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
