import {defineStore} from "pinia";
import AccountService from "@/modules/account/services/AccountService";

export type FormaParolya = {
    newPassword: string;
}

export type FormaNicknama = {
    newNickname: string ;
}

export type StateNastroekPolzovatelya = {
    formPassword: FormaParolya,
    formNickname: FormaNicknama,
    loader: boolean;
    oshibkaOtBackenda: string | null;
    oshibkaOtBackendaNick: string | null;
};

export const storNastroekPolzovatelya = defineStore('StorNastroekPolzovatelya',  {
    state: (): StateNastroekPolzovatelya => {
        return {
            formPassword: {
                newPassword: ""
            },
            formNickname: {
                newNickname: ""
            },
            loader: false,
            oshibkaOtBackenda: null,
            oshibkaOtBackendaNick: null
        };
    },
    actions: {
        async poluchitNastroiki() {
            this.loader = true;
            const response = await AccountService.poluchitNastroikiPolzovatelya();

            if (response.status === "success") {
                this.oshibkaOtBackenda = null;
                this.formNickname.newNickname = response.data.nickname || "";
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }

            this.loader = false;

            return response;
        },
        async izmenitParol() {
            this.loader = true;
            const response = await AccountService.izmenitSvoiParol(this.formPassword);

            if (response.status === "success") {
                this.oshibkaOtBackenda = null;
                this.formPassword.newPassword = "";
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }

            this.loader = false;

            return response;
        },
        async izmenitNick() {
            this.loader = true;
            const response = await AccountService.izmenitSvoiNick(this.formNickname);

            if (response.status === "success") {
                this.oshibkaOtBackendaNick = null;
            } else if (response.status === "fail") {
                this.oshibkaOtBackendaNick = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackendaNick = response.message;
            }

            this.loader = false;

            return response;
        }
    }
});
