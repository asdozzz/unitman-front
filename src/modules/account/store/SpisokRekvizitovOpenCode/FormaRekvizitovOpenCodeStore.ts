import { defineStore } from "pinia";
import OpenCodeCredentialService from "@/modules/account/services/OpenCodeCredentialService";
import type { Schema } from "@/api/types";

/** Поля формы реквизитов; `apiKey` наружу не отдаётся и при изменении может быть пустым. */
export class FormaRekvizitovOpenCode {
    name: string;
    url: string;
    model: string;
    apiKey: string;

    constructor(
        name: string = "",
        url: string = "https://api.opencode.ai",
        model: string = "claude-sonnet-4",
        apiKey: string = "",
    ) {
        this.name = name;
        this.url = url;
        this.model = model;
        this.apiKey = apiKey;
    }
}

export type SostoyanieFormiRekvizitovOpenCode = {
    /** `null` — форма закрыта; пустая строка — создание; иначе id изменяемых реквизитов. */
    redaktiruemiId: string | null;
    forma: FormaRekvizitovOpenCode;
    loader: boolean;
    oshibkaOtBackenda: string | null;
    /** Подсказка по существующей маске ключа при изменении. */
    maskaTekushegoKlyucha: string | null;
};

export const useFormaRekvizitovOpenCodeStore = defineStore('FormaRekvizitovOpenCodeStore', {
    state: (): SostoyanieFormiRekvizitovOpenCode => {
        return {
            redaktiruemiId: null,
            forma: new FormaRekvizitovOpenCode(),
            loader: false,
            oshibkaOtBackenda: null,
            maskaTekushegoKlyucha: null,
        };
    },
    getters: {
        /** `true`, когда открыто создание новых реквизитов. */
        etoSozdanie: (state): boolean => state.redaktiruemiId === "",
        otkrita: (state): boolean => state.redaktiruemiId !== null,
    },
    actions: {
        otkritSozdanie() {
            this.redaktiruemiId = "";
            this.forma = new FormaRekvizitovOpenCode();
            this.maskaTekushegoKlyucha = null;
            this.oshibkaOtBackenda = null;
        },

        /**
         * Открытие формы на изменение.
         *
         * Из списка известна только маска ключа, поэтому `apiKey` остаётся
         * пустым: пустое значение бэкенд трактует как «оставить прежний ключ».
         */
        otkritIzmenenie(rekvizity: Schema<"OpenCodeCredential">) {
            this.redaktiruemiId = rekvizity.id;
            this.forma = new FormaRekvizitovOpenCode(
                rekvizity.name,
                rekvizity.url,
                rekvizity.model,
                "",
            );
            this.maskaTekushegoKlyucha = rekvizity.apiKeyHint;
            this.oshibkaOtBackenda = null;
        },

        zakrit() {
            this.redaktiruemiId = null;
            this.forma = new FormaRekvizitovOpenCode();
            this.maskaTekushegoKlyucha = null;
            this.oshibkaOtBackenda = null;
        },

        /**
         * Сохранение формы.
         *
         * При изменении в запрос попадают только заполненные поля: `null` в
         * `IzmenitRekvizityOpenCode` означает «не менять».
         */
        async sohranit() {
            if (this.redaktiruemiId === null) {
                return null;
            }

            this.loader = true;
            this.oshibkaOtBackenda = null;

            const response = this.redaktiruemiId === ""
                ? await OpenCodeCredentialService.sozdatRekvizity({
                    name: this.forma.name.trim(),
                    url: this.forma.url.trim(),
                    model: this.forma.model.trim(),
                    apiKey: this.forma.apiKey.trim(),
                })
                : await OpenCodeCredentialService.izmenitRekvizity(this.sostavitIzmenenie());

            if (response.status === "success") {
                this.zakrit();
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }

            this.loader = false;

            return response;
        },

        /** Тело частичного изменения: пустые поля не отправляются. */
        sostavitIzmenenie(): Schema<"IzmenitRekvizityOpenCode"> {
            const parametry: Schema<"IzmenitRekvizityOpenCode"> = {
                id: this.redaktiruemiId ?? "",
            };
            const name = this.forma.name.trim();
            const url = this.forma.url.trim();
            const model = this.forma.model.trim();
            const apiKey = this.forma.apiKey.trim();

            if (name !== "") {
                parametry.name = name;
            }

            if (url !== "") {
                parametry.url = url;
            }

            if (model !== "") {
                parametry.model = model;
            }

            // Пустой ключ означает «оставить прежний», поэтому поле не отправляется.
            if (apiKey !== "") {
                parametry.apiKey = apiKey;
            }

            return parametry;
        },
    },
});
