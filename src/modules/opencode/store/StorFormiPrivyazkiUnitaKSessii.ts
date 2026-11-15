import {defineStore} from "pinia";
import OpenCodeService from "@/modules/opencode/services/OpenCodeService";
import {useStorSpiskaSessiyOpenCode} from "@/modules/opencode/store/StorSpiskaSessiyOpenCode";
import UnitiService from "@/modules/unit/services/UnitiService";
import type {Unit} from "@/modules/unit/store/SpisokUnitov/model/Unit";

type StorFormiPrivyazkiUnitaKSessiiState = {
    otkrita: boolean;
    /** Сессия, к которой привязываются юниты. */
    sessionId: string;
    /** Уже привязанные юниты: их нельзя выбрать повторно. */
    privyazannieUnitIds: string[];
    /** Выбранные для привязки юниты. */
    unitIds: string[];
    uniti: Unit[];
    loaderUnitov: boolean;
    oshibkaZagruzkiUnitov: string | null;
    loader: boolean;
    oshibkaOtBackenda: string | null;
};

/**
 * Стор диалога привязки юнитов к уже существующей сессии.
 *
 * Привязка идемпотентна и дополняет список: уже привязанные юниты бэкенд
 * повторно не добавит, поэтому в выборе они скрыты. Рабочая директория сессии
 * при этом не меняется — новые юниты подключаются дополнительными корнями.
 */
export const useStorFormiPrivyazkiUnitaKSessii = defineStore("StorFormiPrivyazkiUnitaKSessii", {
    state: (): StorFormiPrivyazkiUnitaKSessiiState => {
        return {
            otkrita: false,
            sessionId: "",
            privyazannieUnitIds: [],
            unitIds: [],
            uniti: [],
            loaderUnitov: false,
            oshibkaZagruzkiUnitov: null,
            loader: false,
            oshibkaOtBackenda: null,
        };
    },

    getters: {
        /** Юниты, доступные для привязки (уже привязанные исключены). */
        dostupnieUniti(state): Unit[] {
            const privyazannie = new Set(state.privyazannieUnitIds);

            return state.uniti.filter((unit) => !privyazannie.has(unit.id));
        },

        mozhnoSohranit(state): boolean {
            return !state.loader && state.unitIds.length > 0;
        },
    },

    actions: {
        /**
         * Открыть диалог.
         *
         * @param sessionId сессия, к которой привязываем юниты;
         * @param privyazannieUnitIds уже привязанные юниты — исключаются из выбора.
         */
        otkrit(sessionId: string, privyazannieUnitIds: string[] = []) {
            this.otkrita = true;
            this.sessionId = sessionId;
            this.privyazannieUnitIds = [...privyazannieUnitIds];
            this.unitIds = [];
            this.oshibkaOtBackenda = null;
            this.loader = false;

            if (this.uniti.length === 0) {
                this.poluchitUniti();
            }
        },

        zakrit() {
            this.otkrita = false;
            this.oshibkaOtBackenda = null;
            this.loader = false;
        },

        async poluchitUniti() {
            this.loaderUnitov = true;
            this.oshibkaZagruzkiUnitov = null;

            const response = await UnitiService.list({ limit: 200, offset: 0 });

            this.loaderUnitov = false;

            if (response.status === "success") {
                this.uniti = response.data;
            } else if (response.status === "fail") {
                this.oshibkaZagruzkiUnitov = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaZagruzkiUnitov = response.message;
            }
        },

        /**
         * Привязать выбранные юниты.
         *
         * @returns `true`, если бэкенд подтвердил привязку.
         */
        async sohranit(): Promise<boolean> {
            if (!this.mozhnoSohranit) {
                return false;
            }

            this.loader = true;
            this.oshibkaOtBackenda = null;

            const response = await OpenCodeService.privezatKUnitu({
                sessionId: this.sessionId,
                unitIds: [...this.unitIds],
            });

            this.loader = false;

            if (response.status === "success") {
                this.otkrita = false;
                // Ответ — `data: null`, поэтому состав юнитов сессии
                // перезапрашивается вместе со списком.
                await useStorSpiskaSessiyOpenCode().poluchitSpisok();
                return true;
            }

            this.oshibkaOtBackenda = response.status === "fail" ? response.data.message : response.message;

            return false;
        },
    },
});
