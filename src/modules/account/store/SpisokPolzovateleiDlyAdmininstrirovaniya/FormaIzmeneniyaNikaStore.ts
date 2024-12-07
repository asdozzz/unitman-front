import {defineStore} from "pinia";
import AccountService from "@/modules/account/services/AccountService";

export class FormaIzmeneniyaNicknameStore {
    accountId: string;
    newNickname: string;

    constructor(accountId: string = "", newNickname: string = "") {
        this.accountId = accountId;
        this.newNickname = newNickname;
    }
}


type FormaIzmeneniyaNicknameState = {
    enable: boolean,
    form: FormaIzmeneniyaNicknameStore;
    loader: boolean;
    oshibkaOtBackenda: string | null,
}
export const useFormaIzmeneniyaNickname = defineStore('FormaIzmeneniyaNickname', {
    state: (): FormaIzmeneniyaNicknameState => {
        return {
            enable: false,
            form: new FormaIzmeneniyaNicknameStore(),
            loader: false,
            oshibkaOtBackenda: null,
        };
    },
    actions: {
        otkritFormu(accountId: string, oldNickname: string | null) {
            this.enable = true;
            this.oshibkaOtBackenda = null;
            this.loader = false;
            this.form = new FormaIzmeneniyaNicknameStore(accountId, oldNickname || "")
        },
        zakritFormu() {
            this.enable = false;
            this.form = new FormaIzmeneniyaNicknameStore()
        },
        async otpravitFormu() {
            this.loader = true;
            const response = await AccountService.izmenitNickAdminom(this.form);

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
