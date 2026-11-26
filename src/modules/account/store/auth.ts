import { defineStore } from 'pinia';
import AccountService from "@/modules/account/services/AccountService";
import LoginView from "@/modules/account/store/auth/LoginView";
import {Notify} from "quasar";
import i18n from "@/bootstrap/translator";
import dayjs from "dayjs";
import type {ApiResponseData} from "@/api/types";
import {isTokenExpired as isJwtExpired} from "@/utils/jwt";

const LOCAL_STORAGE_KEY = 'tokenData';

/**
 * Запас времени (мс), на который токен должен быть валиден, чтобы считаться
 * живым. Позволяет обновить токен заранее, не отправляя запрос с уже
 * просроченным JWT.
 */
const TOKEN_EXPIRY_LEEWAY_MS = 30_000;

/**
 * Данные пользователя, которые бэкенд добавляет в ответ `/login`
 * (`AuthenticationSuccessListener`). В спецификации объявлен только `token`,
 * поэтому `user` описывается здесь как дополнение к сгенерированному типу.
 */
export type LoginUser = {
    id: string;
    email: string;
    roles: string[];
    locale: string;
    /** Аккаунт создан, но ещё не активирован администратором. */
    activationPending?: boolean;
    /** Email подтверждён кодом или OAuth-провайдером. */
    emailVerified?: boolean;
}

/** Ответ `/login` из схемы плюс добавленный бэкендом `user`. */
export type TokenData = ApiResponseData<"/login", "post"> & {
    expired?: string | null;
    user: LoginUser;
}

/**
 * Пара токенов, которую возвращает `/account/refreshToken`.
 *
 * `user` в ответе на обновление не приходит, поэтому данные пользователя
 * переносятся из текущего `tokenData`.
 */
type RefreshTokenData = ApiResponseData<"/account/refreshToken", "post">;

/**
 * Единственное обновление токена в полёте.
 *
 * Refresh-токен одноразовый: параллельные запросы, получившие 401, не должны
 * обменивать один и тот же токен повторно — иначе первый из них отзовёт его
 * и остальные получат ошибку. Все ожидающие подписываются на один промис.
 */
let obnovlenieTokenaPromise: Promise<boolean> | null = null;

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
            return state.tokenData?.user?.id || null;
        },
        email(state: State): string | null {
            return state.tokenData?.user?.email || null;
        },
        getToken(state: State): string | null {
            return state.tokenData && state.tokenData.token || null;
        },
        getRefreshToken(state: State): string | null {
            return state.tokenData?.refreshToken || null;
        },
        /**
         * Истёк (или вот-вот истечёт) ли access-токен.
         *
         * Решение принимается по `exp` из JWT. Токены без разбираемого `exp`
         * считаются валидными — тогда обновление произойдёт по ответу 401.
         */
        isTokenExpired(): boolean {
            return isJwtExpired(this.getToken, TOKEN_EXPIRY_LEEWAY_MS);
        },
        getRoles(state: State): string[] {
            return state.tokenData?.user?.roles ?? [];
        },
        getLocale(state: State): "en" | "ru" {
            if (!state.tokenData?.user?.locale) {
                return import.meta.env.VITE_DEFAULT_LOCALE;
            }

            return state.tokenData.user.locale as "en" | "ru";
        },
        /**
         * Проверка одной роли.
         *
         * Геттер возвращает функцию для обратной совместимости с шаблонами,
         * где роль проверяется как `checkRole(role)`.
         */
        checkRole() {
            return (role: string): boolean => this.getRoles.includes(role);
        },
        /**
         * Проверка, что у пользователя есть все перечисленные роли.
         *
         * Возвращает функцию (геттер вызывается как `checkRoles(roles)`),
         * поэтому результат должен вычисляться через `every`, а не `forEach`:
         * `return` из колбэка `forEach` не влияет на результат.
         */
        checkRoles() {
            return (roles: string[]): boolean =>
                roles.every((role: string) => this.getRoles.includes(role));
        },
        /** Является ли текущий пользователь администратором. */
        isAdmin(): boolean {
            return this.getRoles.includes(Roles.Admin);
        },
        /** Ожидает ли текущий аккаунт активации администратором. */
        isPendingActivation(state: State): boolean {
            return state.tokenData?.user?.activationPending === true;
        },
        /**
         * Подтверждён ли email.
         *
         * Для старых сессий без поля считаем email подтверждённым, иначе
         * пользователь после обновления фронтенда попал бы на форму кода.
         */
        isEmailVerified(state: State): boolean {
            return state.tokenData?.user?.emailVerified !== false;
        },
    },
    actions: {
        updateLocale(locale: "en" | "ru") {
            if (this.tokenData?.user) {
                this.tokenData.user.locale = locale;
            }
            i18n.global.locale.value = locale;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.tokenData));
            dayjs.locale(locale)
        },
        /**
         * Сохраняет готовую пару токенов и данные пользователя.
         *
         * Используется обычным входом и OAuth-exchange.
         */
        prinyatTokenData(tokenData: TokenData) {
            this.tokenData = tokenData;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tokenData));
            const locale = (tokenData.user?.locale || "ru") as "en" | "ru";
            this.updateLocale(locale);
        },
        async login() {
            const response = await AccountService.login(this.loginView.form.login, this.loginView.form.pass);

            if (response.status === "success") {
                // Бэкенд дополняет ответ /login полем user (см. LoginUser).
                this.prinyatTokenData(response.data as TokenData);
            }

            return response;
        },
        /**
         * Обновление пары токенов по refresh-токену.
         *
         * Бэкенд отзывает использованный refresh-токен, поэтому новый
         * сохраняется сразу. Если обновить не удалось (refresh-токен истёк
         * или уже был использован), сессия сбрасывается.
         *
         * @returns `true`, если токены обновлены.
         */
        async obnovitToken(): Promise<boolean> {
            const refreshToken = this.getRefreshToken;

            if (!refreshToken) {
                // Обновить нечем (refresh-токена нет) — сессия невосстановима.
                this.logout();
                return false;
            }

            // Один и тот же одноразовый токен нельзя обменять дважды.
            if (obnovlenieTokenaPromise) {
                return obnovlenieTokenaPromise;
            }

            const promise = (async (): Promise<boolean> => {
                const response = await AccountService.obnovitToken(refreshToken);

                if (response.status !== "success") {
                    this.logout();
                    return false;
                }

                const data = response.data as RefreshTokenData;
                this.ustanovitToken(data.token, data.refreshToken);
                return true;
            })();

            obnovlenieTokenaPromise = promise;

            try {
                return await promise;
            } finally {
                if (obnovlenieTokenaPromise === promise) {
                    obnovlenieTokenaPromise = null;
                }
            }
        },
        /**
         * Гарантирует, что перед запросом будет валидный access-токен:
         * если текущий истёк — обновляет его по refresh-токену.
         *
         * @returns `true`, если после вызова есть рабочий токен.
         */
        async obespechitAktualniyToken(): Promise<boolean> {
            if (!this.getToken) {
                return false;
            }

            if (!this.isTokenExpired) {
                return true;
            }

            return this.obnovitToken();
        },
        /**
         * Сохраняет новую пару токенов, сохраняя данные пользователя
         * (их в ответе на обновление нет).
         */
        ustanovitToken(token: string, refreshToken: string) {
            if (!this.tokenData) {
                return;
            }

            this.tokenData = {
                ...this.tokenData,
                token,
                refreshToken,
            };
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.tokenData));
        },
        logout() {
            this.tokenData = null;
            obnovlenieTokenaPromise = null;
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        },
        /**
         * Проверяет активацию аккаунта на сервере и обновляет локальные роли.
         *
         * @returns `true`, если аккаунт уже активирован.
         */
        async obnovitStatusAktivacii(): Promise<boolean> {
            const response = await AccountService.moiStatus();

            if (response.status !== 'success' || !this.tokenData?.user) {
                return false;
            }

            this.tokenData.user.activationPending = response.data.activationPending;
            this.tokenData.user.emailVerified = response.data.emailVerified;
            this.tokenData.user.roles = response.data.roles;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.tokenData));

            return !response.data.activationPending;
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
