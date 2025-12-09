import {defineStore} from "pinia";
import AccountService from "@/modules/account/services/AccountService";

export class FormaIzmeneniyaRoliStore {
    accountId: string;
    newRole: string;

    constructor(accountId: string = "", newRoli: string = "") {
        this.accountId = accountId;
        this.newRole = newRoli;
    }
}

class Role {
    value: string;
    label: string;

    constructor(value: string, label: string) {
        this.value = value;
        this.label = label;
    }
}

type FormaIzmeneniyaRoliState = {
    enable: boolean,
    form: FormaIzmeneniyaRoliStore;
    loader: boolean;
    roles: Role[],
    oshibkaOtBackenda: string | null,
}
export const useFormaIzmeneniyaRoli = defineStore('FormaIzmeneniyaRoli', {
    state: (): FormaIzmeneniyaRoliState => {
        return {
            enable: false,
            roles: [
                new Role("ROLE_ADMIN", 'Admin'),
                new Role("ROLE_USER", 'User'),
            ],
            form: new FormaIzmeneniyaRoliStore(),
            loader: false,
            oshibkaOtBackenda: null,
        };
    },
    actions: {
        otkritFormu(accountId: string, oldRoli: string | null) {
            this.enable = true;
            this.oshibkaOtBackenda = null;
            this.loader = false;
            this.form = new FormaIzmeneniyaRoliStore(accountId, oldRoli || "")
        },
        zakritFormu() {
            this.enable = false;
            this.form = new FormaIzmeneniyaRoliStore()
        },
        async otpravitFormu() {
            this.loader = true;
            const response = await AccountService.izmenitRoleAdminom(this.form);

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
