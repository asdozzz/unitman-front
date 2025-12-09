import {defineStore} from "pinia";
import AccountService from "@/modules/account/services/AccountService";
import ProektiService from "@/modules/unit/services/ProektiService";

export class FormaDobavleniyaPolzovatelya {
    email: string;
    password: string;
    roles: string;
    locale: string;
    nickname: string | null;

    constructor(locale: string = "", email: string = "", password: string = "", roles: string = "", nickname: string | null = null) {
        this.email = email;
        this.password = password;
        this.roles = roles;
        this.locale = locale;
        this.nickname = nickname;
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

type Proekt = {
    id: string;
    name: string;
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
    },
    proekti: Proekt[],
    idPosleSozdaniya: string | null,
    vibranieProekti: string[],
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
            },
            proekti: [],
            idPosleSozdaniya: null,
            vibranieProekti: [],
        };
    },
    actions: {
        async poluchitSpisokActivnihProektov() {
            this.loader = true;
            const response = await ProektiService.poluchitAktivnieProekti();

            this.loader = false;
            if (response.status === "success") {
                this.oshibkaOtBackenda = null;
                this.proekti = response.data;
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }

            return response;
        },
        otkritFormu(defaultLocale: "en" | "ru") {
            this.enable = true;
            this.oshibkaOtBackenda = null;
            this.idPosleSozdaniya = null;
            this.vibranieProekti = [];
            this.loader = false;
            this.form = new FormaDobavleniyaPolzovatelya(defaultLocale)
        },
        zakritFormu() {
            this.enable = false;
            this.idPosleSozdaniya = null;
            this.vibranieProekti = [];
            this.form = new FormaDobavleniyaPolzovatelya()
        },
        async otpravitFormu() {
            this.loader = true;
            const response = await AccountService.registraziyaPolzovatelya(this.form);

            this.loader = false;
            if (response.status === "success") {
                this.oshibkaOtBackenda = null;
                this.idPosleSozdaniya = response.data.id;
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }

            return response;
        },
        async dobavitVProekti() {
            this.loader = true;

            if (this.idPosleSozdaniya === null) {
                throw new Error('accountId not found');
            }

            this.vibranieProekti.forEach(async (id: string) => {
                await ProektiService.dobavitPolzovatelyaKProektu({id, userId: this.idPosleSozdaniya as string})
            })

            this.loader = false;
        }
    }
});
