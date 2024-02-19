import { defineStore } from 'pinia';
import AccountService from "@/modules/account/services/AccountService";
import router from "@/bootstrap/router";
import LoginView from "@/modules/account/store/auth/LoginView";

const LOCAL_STORAGE_KEY = 'tokenData';

interface TokenData {
    token: string | null;
    expired: string | null;
    user: {
        email: string;
        roles: string[];
    }
}


interface State {
    tokenData: TokenData | null,
    returnUrl: string | null,
    loginView: LoginView
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
            returnUrl: null,
            loginView: new LoginView()
        };

    },
    getters: {
        isAuth(state: State): boolean {
            return state.tokenData != null && state.tokenData.token != null;
        },
        email(state: State): string | null {
            return state.tokenData && state.tokenData.user.email || null;
        },
        getRoles(state: State): string[] {
            if (!state.tokenData) {
                return [];
            }

            return state.tokenData.user.roles;
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
        async login() {
            const response = await AccountService.login(this.loginView.form.login, this.loginView.form.pass);

            if (response.status === "success") {
                // update pinia state
                this.tokenData = response.data;
                // store user details and jwt in local storage to keep user logged in between page refreshes
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(response.data));

                let defaultRoute = '/unit/moi';
                if (this.isAdmin) {
                    defaultRoute = '/unit/list';
                }
                // redirect to previous url or default to home page
                router.push(this.returnUrl || defaultRoute);
            }

            return response;
        },
        logout() {
            this.tokenData = null;
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            router.push('/login');
        }
    }
});
