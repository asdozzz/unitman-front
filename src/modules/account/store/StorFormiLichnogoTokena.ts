import { defineStore } from "pinia";
import HranilishaService from "@/modules/unit/services/HranilishaService";
import LichniyTokenService from "@/modules/account/services/LichniyTokenService";
import type { Schema } from "@/api/types";

export type SostoyanieFormiLichnogoTokena = {
    /** `true`, пока открыт диалог добавления токена. */
    otkryta: boolean;
    /** Выбранное хранилище, к которому привязывается токен. */
    repoId: string;
    /** Открытый секрет токена: наружу не показывается и не сохраняется. */
    token: string;
    /** Название токена для списка. */
    nazvanie: string;
    /** Ошибка бэкенда (`lichniy_token.*`), показывается как есть. */
    oshibkaOtBackenda: string | null;
    loader: boolean;
    /** Доступные активные хранилища для выбора. */
    spisokRepo: Schema<"Repo">[];
    loaderRepo: boolean;
    /** Ошибка загрузки списка хранилищ. */
    oshibkaRepo: string | null;
};

export const useStorFormiLichnogoTokena = defineStore('StorFormiLichnogoTokena', {
    state: (): SostoyanieFormiLichnogoTokena => {
        return {
            otkryta: false,
            repoId: "",
            token: "",
            nazvanie: "",
            oshibkaOtBackenda: null,
            loader: false,
            spisokRepo: [],
            loaderRepo: false,
            oshibkaRepo: null,
        };
    },
    getters: {
        /** Все обязательные поля заполнены и запрос ещё не идёт. */
        mozhnoDobavit: (state): boolean => {
            return !state.loader
                && state.repoId !== ""
                && state.token.trim() !== ""
                && state.nazvanie.trim() !== "";
        },
    },
    actions: {
        /** Открытие диалога: форма очищается, список хранилищ перезапрашивается. */
        otkryt() {
            this.repoId = "";
            this.token = "";
            this.nazvanie = "";
            this.oshibkaOtBackenda = null;
            this.otkryta = true;
            void this.poluchitRepo();
        },

        zakryt() {
            this.otkryta = false;
            this.repoId = "";
            this.token = "";
            this.nazvanie = "";
            this.oshibkaOtBackenda = null;
        },

        /** Активные хранилища, к которым можно привязать личный токен. */
        async poluchitRepo() {
            this.loaderRepo = true;
            const response = await HranilishaService.poluchitSpisokActivnih();

            if (response.status === "success") {
                this.spisokRepo = response.data;
                this.oshibkaRepo = null;
            } else if (response.status === "fail") {
                this.spisokRepo = [];
                this.oshibkaRepo = response.data.message;
            } else if (response.status === "error") {
                this.spisokRepo = [];
                this.oshibkaRepo = response.message;
            }

            this.loaderRepo = false;

            return response;
        },

        /**
         * Отправка формы добавления.
         *
         * Секрет токена уходит только в запросе; после успеха форма закрывается,
         * а результат определения прав забирает стор списка.
         */
        async dobavit() {
            if (!this.otkryta) {
                return null;
            }

            this.loader = true;
            this.oshibkaOtBackenda = null;

            const response = await LichniyTokenService.dobavit({
                repoId: this.repoId,
                token: this.token.trim(),
                nazvanie: this.nazvanie.trim(),
            });

            if (response.status === "success") {
                this.zakryt();
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }

            this.loader = false;

            return response;
        },
    },
});
