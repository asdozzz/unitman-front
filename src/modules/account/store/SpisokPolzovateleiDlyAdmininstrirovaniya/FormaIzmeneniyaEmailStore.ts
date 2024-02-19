import {defineStore} from "pinia";
import AccountService from "@/modules/account/services/AccountService";

export class FormaIzmeneniyaEmailStore {
    accountId: string;
    newEmail: string;

    constructor(accountId: string = "", newEmail: string = "") {
        this.accountId = accountId;
        this.newEmail = newEmail;
    }
}


type FormaIzmeneniyaEmailState = {
    enable: boolean,
    form: FormaIzmeneniyaEmailStore;
    loader: boolean;
    oshibkaOtBackenda: string | null,
}
export const useFormaIzmeneniyaEmail = defineStore('FormaIzmeneniyaEmail', {
    state: (): FormaIzmeneniyaEmailState => {
        return {
            enable: false,
            form: new FormaIzmeneniyaEmailStore(),
            loader: false,
            oshibkaOtBackenda: null,
        };
    },
    actions: {
        otkritFormu(accountId: string, oldEmail: string) {
            this.enable = true;
            this.oshibkaOtBackenda = null;
            this.loader = false;
            this.form = new FormaIzmeneniyaEmailStore(accountId, oldEmail)
        },
        zakritFormu() {
            this.enable = false;
            this.form = new FormaIzmeneniyaEmailStore()
        },
        async otpravitFormu() {
            this.loader = true;
            const response = await AccountService.izmenitEmail(this.form);

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
