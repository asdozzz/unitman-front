import { defineStore } from "pinia";
import UnitSessionService from "@/modules/opencode/services/UnitSessionService";
import { useStorSpiskaRekvizitovOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/StorSpiskaRekvizitovOpenCode";
import { useStorSpiskaSessiyUnita } from "@/modules/opencode/store/StorSpiskaSessiyUnita";
import type { Schema } from "@/api/types";

type StorFormiSozdaniyaSessiiUnitaState = {
    otkrita: boolean;
    unitId: string;
    unitLabel: string;
    unitDescription: string;
    title: string;
    credentialId: string;
    loader: boolean;
    oshibkaOtBackenda: string | null;
};

/**
 * Форма создания unit-сессии.
 *
 * Юнит задаётся контекстом открытия и не выбирается в форме: сессия создаётся
 * из карточки конкретного юнита. Один юнит — одна активная сессия.
 */
export const useStorFormiSozdaniyaSessiiUnita = defineStore("StorFormiSozdaniyaSessiiUnita", {
    state: (): StorFormiSozdaniyaSessiiUnitaState => {
        return {
            otkrita: false,
            unitId: "",
            unitLabel: "",
            unitDescription: "",
            title: "",
            credentialId: "",
            loader: false,
            oshibkaOtBackenda: null,
        };
    },

    getters: {
        rekvizity(): Schema<"OpenCodeCredential">[] {
            return useStorSpiskaRekvizitovOpenCode().spisok;
        },

        mozhnoSohranit(state): boolean {
            return !state.loader
                && state.unitId !== ""
                && state.credentialId !== "";
        },
    },

    actions: {
        /**
         * Открыть форму для конкретного юнита.
         */
        otkrit(params: {
            unitId: string;
            unitLabel: string;
            unitDescription: string;
        }) {
            const rekvizity = useStorSpiskaRekvizitovOpenCode().spisok;

            this.otkrita = true;
            this.unitId = params.unitId;
            this.unitLabel = params.unitLabel;
            this.unitDescription = params.unitDescription;
            this.title = "";
            this.credentialId = rekvizity.length > 0 ? rekvizity[0].id : "";
            this.oshibkaOtBackenda = null;
            this.loader = false;
        },

        zakrit() {
            this.otkrita = false;
            this.oshibkaOtBackenda = null;
            this.loader = false;
        },

        async sohranit(): Promise<string | null> {
            if (!this.mozhnoSohranit) {
                return null;
            }

            this.loader = true;
            this.oshibkaOtBackenda = null;

            const title = this.title.trim();

            const response = await UnitSessionService.sozdat({
                credentialId: this.credentialId,
                title: title === "" ? null : title,
                unitId: this.unitId,
            });

            this.loader = false;

            if (response.status === "success") {
                this.otkrita = false;

                return response.data.id;
            }

            this.oshibkaOtBackenda = response.status === "fail"
                ? response.data.message
                : response.message;

            return null;
        },

        async sozdatIDobavitVSpiske(): Promise<string | null> {
            const id = await this.sohranit();

            if (id !== null) {
                await useStorSpiskaSessiyUnita().poluchitSpisok();
            }

            return id;
        },
    },
});
