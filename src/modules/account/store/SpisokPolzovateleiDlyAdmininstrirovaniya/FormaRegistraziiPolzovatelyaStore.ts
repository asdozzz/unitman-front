import {defineStore} from "pinia";
import AccountService from "@/modules/account/services/AccountService";

export class FormaDobavleniyaPolzovatelya {
    email: string;
    password: string;
    roles: string;
    locale: string;

    constructor(locale: string = "", email: string = "", password: string = "", roles: string = "") {
        this.email = email;
        this.password = password;
        this.roles = roles;
        this.locale = locale;
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

class Locale {
    value: string;
    label: string;

    constructor(value: string, label: string) {
        this.value = value;
        this.label = label;
    }
}

type FormaRegistraziiPolzovatelyaState = {
    enable: boolean,
    form: FormaDobavleniyaPolzovatelya;
    loader: boolean;
    oshibkaOtBackenda: string | null,
    roles: {
        spisok: Role[],
        loader: boolean
    },
    locales: {
        spisok: Locale[],
    }
}
export const useFormaRegistraziiPolzovatelya = defineStore('FormaRegistraziiPolzovatelya', {
    state: (): FormaRegistraziiPolzovatelyaState => {
        return {
            enable: false,
            form: new FormaDobavleniyaPolzovatelya(),
            loader: false,
            oshibkaOtBackenda: null,
            roles: {
                spisok: [
                    new Role("ROLE_ADMIN", 'Admin'),
                    new Role("ROLE_USER", 'User'),
                ],
                loader: false
            },
            locales: {
                spisok: [
                    new Locale('ru', 'ru'),
                    new Locale('en', 'en'),
                ]
            }
        };
    },
    actions: {
        otkritFormu(defaultLocale: "en" | "ru") {
            this.enable = true;
            this.oshibkaOtBackenda = null;
            this.loader = false;
            this.form = new FormaDobavleniyaPolzovatelya(defaultLocale)
        },
        zakritFormu() {
            this.enable = false;
            this.form = new FormaDobavleniyaPolzovatelya()
        },
        async otpravitFormu() {
            this.loader = true;
            const response = await AccountService.registraziyaPolzovatelya(this.form);

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
