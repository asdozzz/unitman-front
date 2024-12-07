import {defineStore} from "pinia";
import AccountService from "@/modules/account/services/AccountService";

export class FormaIzmeneniyaParolyaStore {
    accountId: string;
    newPassword: string;

    constructor(accountId: string = "", newPassword: string = "") {
        this.accountId = accountId;
        this.newPassword = newPassword;
    }
}


type FormaIzmeneniyaParolyaState = {
    enable: boolean,
    form: FormaIzmeneniyaParolyaStore;
    loader: boolean;
    oshibkaOtBackenda: string | null,
}
export const useFormaIzmeneniyaParolya = defineStore('FormaIzmeneniyaParolya', {
    state: (): FormaIzmeneniyaParolyaState => {
        return {
            enable: false,
            form: new FormaIzmeneniyaParolyaStore(),
            loader: false,
            oshibkaOtBackenda: null,
        };
    },
    actions: {
        otkritFormu(accountId: string) {
            this.enable = true;
            this.oshibkaOtBackenda = null;
            this.loader = false;
            this.form = new FormaIzmeneniyaParolyaStore(accountId)
        },
        zakritFormu() {
            this.enable = false;
            this.form = new FormaIzmeneniyaParolyaStore()
        },
        async otpravitFormu() {
            this.loader = true;
            const response = await AccountService.izmenitParolAdminom(this.form);

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
