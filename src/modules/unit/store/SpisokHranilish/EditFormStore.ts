import {defineStore} from "pinia";
import HranilishaService from "@/modules/unit/services/HranilishaService";

export class EditForm {
    repoId: string;
    /**
     * Только НОВОЕ значение токена. Никогда не заполняется из API: бэкенд
     * отдаёт лишь `tokenHint`, а пустое поле означает «не менять токен».
     */
    token: string;

    constructor(repoId: string = "") {
        this.repoId = repoId;
        this.token = "";
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

            // Контракт WS-2: `token` необязателен. Пустая строка означает
            // «оставить существующий токен», поэтому поле не отправляется.
            const payload: {repoId: string; token?: string} = {repoId: this.form.repoId};
            const newToken = this.form.token.trim();

            if (newToken !== "") {
                payload.token = newToken;
            }

            const response = await HranilishaService.changeCredentials(payload);

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
