import { defineStore } from "pinia";
import LichniyTokenService from "@/modules/account/services/LichniyTokenService";
import { useStorFormiLichnogoTokena } from "@/modules/account/store/StorFormiLichnogoTokena";
import type { Schema } from "@/api/types";

export type SostoyanieStoraLichnihTokenov = {
    spisok: Schema<"LichniyTokenPublic">[];
    loaderSpiska: boolean;
    oshibkaZagruzki: string | null;
    /** id токена, по которому выполняется перепроверка или удаление. */
    dejstvieId: string | null;
    /** Ошибка последней перепроверки/удаления. */
    oshibkaDejstviya: string | null;
    /** Результат добавления/перепроверки — для показа определённого объёма прав. */
    poslednijRezultat: Schema<"LichniyTokenPublic"> | null;
};

export const useStorLichnihTokenov = defineStore('StorLichnihTokenov', {
    state: (): SostoyanieStoraLichnihTokenov => {
        return {
            spisok: [],
            loaderSpiska: false,
            oshibkaZagruzki: null,
            dejstvieId: null,
            oshibkaDejstviya: null,
            poslednijRezultat: null,
        };
    },
    getters: {
        /** `true`, если токенов ещё нет. */
        pust: (state): boolean => state.spisok.length === 0,
    },
    actions: {
        async poluchitSpisok() {
            this.loaderSpiska = true;
            const response = await LichniyTokenService.spisok();

            if (response.status === "success") {
                this.spisok = response.data;
                this.oshibkaZagruzki = null;
            } else if (response.status === "fail") {
                this.spisok = [];
                this.oshibkaZagruzki = response.data.message;
            } else if (response.status === "error") {
                this.spisok = [];
                this.oshibkaZagruzki = response.message;
            }

            this.loaderSpiska = false;

            return response;
        },

        /**
         * Добавление идёт через форму; после успеха запоминается результат
         * определения прав и список перезапрашивается.
         */
        async dobavitToken() {
            const forma = useStorFormiLichnogoTokena();
            const response = await forma.dobavit();

            if (response !== null && response.status === "success") {
                this.poslednijRezultat = response.data;
                this.oshibkaDejstviya = null;
                await this.poluchitSpisok();
            }

            return response;
        },

        /** Перепроверка прав: обновлённая запись заменяется прямо в списке. */
        async pereproverit(id: string) {
            this.dejstvieId = id;
            this.oshibkaDejstviya = null;

            const response = await LichniyTokenService.pereproverit({ id });

            if (response.status === "success") {
                const indeks = this.spisok.findIndex((token) => token.id === id);

                if (indeks !== -1) {
                    this.spisok.splice(indeks, 1, response.data);
                }

                this.poslednijRezultat = response.data;
            } else if (response.status === "fail") {
                this.oshibkaDejstviya = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaDejstviya = response.message;
            }

            this.dejstvieId = null;

            return response;
        },

        /** Удаление: после успеха запись убирается из списка локально. */
        async udalit(id: string) {
            this.dejstvieId = id;
            this.oshibkaDejstviya = null;

            const response = await LichniyTokenService.udalit({ id });

            if (response.status === "success") {
                this.spisok = this.spisok.filter((token) => token.id !== id);

                if (this.poslednijRezultat?.id === id) {
                    this.poslednijRezultat = null;
                }
            } else if (response.status === "fail") {
                this.oshibkaDejstviya = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaDejstviya = response.message;
            }

            this.dejstvieId = null;

            return response;
        },

        /** Скрытие блока с результатом определения прав. */
        ochistitRezultat() {
            this.poslednijRezultat = null;
        },
    },
});
