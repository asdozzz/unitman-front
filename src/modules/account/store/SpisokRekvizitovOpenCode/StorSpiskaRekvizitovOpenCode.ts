import { defineStore } from "pinia";
import OpenCodeCredentialService from "@/modules/account/services/OpenCodeCredentialService";
import { useFormaRekvizitovOpenCodeStore } from "@/modules/account/store/SpisokRekvizitovOpenCode/FormaRekvizitovOpenCodeStore";
import type { Schema } from "@/api/types";

export type SostoyanieSpiskaRekvizitovOpenCode = {
    spisok: Schema<"OpenCodeCredential">[];
    loaderSpiska: boolean;
    oshibkaZagruzki: string | null;
    /** id реквизитов, по которым выполняется удаление. */
    udalyaemiId: string | null;
};

export const useStorSpiskaRekvizitovOpenCode = defineStore('StorSpiskaRekvizitovOpenCode', {
    state: (): SostoyanieSpiskaRekvizitovOpenCode => {
        return {
            spisok: [],
            loaderSpiska: false,
            oshibkaZagruzki: null,
            udalyaemiId: null,
        };
    },
    getters: {
        /** `true`, если реквизитов ещё нет — настройки сессии создать не получится. */
        pust: (state): boolean => state.spisok.length === 0,
    },
    actions: {
        async poluchitSpisok() {
            this.loaderSpiska = true;
            const response = await OpenCodeCredentialService.spisokRekvizitov();

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

        /** Создание и изменение идут через форму; после успеха список перезапрашивается. */
        async sohranitRekvizity() {
            const forma = useFormaRekvizitovOpenCodeStore();
            const response = await forma.sohranit();

            if (response !== null && response.status === "success") {
                await this.poluchitSpisok();
            }

            return response;
        },

        /** Бэкенд отвечает `data: null`, поэтому список перезапрашивается. */
        async udalitRekvizity(id: string) {
            this.udalyaemiId = id;
            const response = await OpenCodeCredentialService.udalitRekvizity({ id });
            this.udalyaemiId = null;

            if (response.status === "success") {
                this.oshibkaZagruzki = null;
                await this.poluchitSpisok();
            } else if (response.status === "fail") {
                this.oshibkaZagruzki = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaZagruzki = response.message;
            }

            return response;
        },

        /** Название реквизитов по id — для подписи выбранного ключа в чате. */
        imyaRekvizitov(id: string): string | null {
            return this.spisok.find((rekvizity) => rekvizity.id === id)?.name ?? null;
        },
    },
});
