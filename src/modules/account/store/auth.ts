import { defineStore } from 'pinia';
import AccountService from "@/modules/account/services/AccountService";
import LoginView from "@/modules/account/store/auth/LoginView";
import {Notify} from "quasar";
import i18n from "@/bootstrap/translator";

const LOCAL_STORAGE_KEY = 'tokenData';

interface TokenData {
    token: string | null;
    expired: string | null;
    user: {
        id: string;
        email: string;
        roles: string[];
        locale: "en" | "ru";
    }
}


interface State {
    tokenData: TokenData | null,
    returnUrl: string | null,
    defaultRoute: string,
    loginView: LoginView,
    loaderIzmemeniyaYazika: boolean
}

enum Roles {
    Admin = 'ROLE_ADMIN',
    User = 'ROLE_USER'
}

export const useAuthStore = defineStore('auth', {
    state: (): State => {
        const json: string | null = localStorage.getItem(LOCAL_STORAGE_KEY);
        return {
            // initialize state from local storage to enable user to stay logged in
            tokenData: json ? JSON.parse(json) : null,
            defaultRoute : '/unit/list',
            returnUrl: null,
            loginView: new LoginView(),
            loaderIzmemeniyaYazika: false
        };

    },
    getters: {
        isAuth(state: State): boolean {
            return state.tokenData != null && state.tokenData.token != null;
        },
        userId(state: State): string | null {
            return state.tokenData && state.tokenData.user.id || null;
        },
        email(state: State): string | null {
            return state.tokenData && state.tokenData.user.email || null;
        },
        getToken(state: State): string | null {
            return state.tokenData && state.tokenData.token || null;
        },
        getRoles(state: State): string[] {
            if (!state.tokenData) {
                return [];
            }

            return state.tokenData.user.roles;
        },
        getLocale(state: State): "en" | "ru" {
            if (!state.tokenData) {
                return import.meta.env.VITE_DEFAULT_LOCALE;
            }

            return state.tokenData.user.locale
        },
        checkRole() {
            const _this = this;
            return (role: string): boolean => _this.getRoles.includes(role);
        },
        checkRoles() {
            const _this = this;
            return (roles: string[]): boolean => {
                roles.forEach((role: string) => {
                    if (!_this.checkRole(role)) {
                        return false;
                    }
                })

                return true;
            }
        },
        isAdmin(): boolean {
            return this.checkRole(Roles.Admin);
        },
    },
    actions: {
        updateLocale(locale: "en" | "ru") {
            if (this.tokenData) {
                this.tokenData.user.locale = locale;
            }
            console.log("www", locale);
            i18n.global.locale.value = locale;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.tokenData));
        },
        async login() {
            const response = await AccountService.login(this.loginView.form.login, this.loginView.form.pass);

            if (response.status === "success") {
                this.tokenData = response.data;
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(response.data));
                const locale = response.data.user.locale as ("en" | "ru") || "ru";
                this.updateLocale(locale);
            }

            return response;
        },
        logout() {
            this.tokenData = null;
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        },
        async izmeniyYazik(locale: string) {
            this.loaderIzmemeniyaYazika = true;

            const response = await AccountService.izmenitYazik({locale});

            if (response.status === "fail") {
                Notify.create(response.data.message);
            } else if (response.status === "error") {
                Notify.create(response.message);
            } else {
                if (this.tokenData) {
                    this.updateLocale(locale as "en" | "ru");
                }
            }

            this.loaderIzmemeniyaYazika = false;
        }
    }
});
