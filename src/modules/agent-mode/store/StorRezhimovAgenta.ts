import { defineStore } from "pinia";
import AgentModeService from "@/modules/agent-mode/services/AgentModeService";
import {
    dostupnyeRezhimy,
    rezhimPoUmolchaniyu,
    type AgentMode,
    type DefaultyRezhimovAgenta,
    type TipChataAgenta,
} from "@/modules/agent-mode/model/AgentMode";

type State = {
    modes: AgentMode[];
    defaults: DefaultyRezhimovAgenta;
    loading: boolean;
    loaded: boolean;
    error: string | null;
};

export const useStorRezhimovAgenta = defineStore("StorRezhimovAgenta", {
    state: (): State => ({
        modes: [],
        defaults: { unit: "", workspace: "" },
        loading: false,
        loaded: false,
        error: null,
    }),

    getters: {
        dostupnye(state): AgentMode[] {
            return dostupnyeRezhimy(state.modes);
        },

        poId(state): (id: string) => AgentMode | null {
            return (id: string) => state.modes.find((mode) => mode.id === id) ?? null;
        },

        poUmolchaniyu(state): (tip: TipChataAgenta) => AgentMode | null {
            return (tip: TipChataAgenta) => rezhimPoUmolchaniyu(state.modes, state.defaults, tip);
        },
    },

    actions: {
        async zagruzit(force = false) {
            if (this.loading || (this.loaded && !force)) {
                return;
            }

            this.loading = true;
            this.error = null;

            const response = await AgentModeService.spisok();

            this.loading = false;

            if (response.status !== "success") {
                this.error = response.status === "fail" ? response.data.message : response.message;

                return;
            }

            this.modes = response.data.modes;
            this.defaults = response.data.defaults;
            this.loaded = true;
        },

        sbalansirovat() {
            this.modes = [];
            this.defaults = { unit: "", workspace: "" };
            this.loaded = false;
            this.error = null;
        },

        /** Применить персональные настройки мода: реквизиты и модель. */
        nastroykiModa(id: string): { credentialId: string; model: string } {
            const mode = this.modes.find((item) => item.id === id);

            return {
                credentialId: mode?.credentialId ?? "",
                model: mode?.model ?? "",
            };
        },
    },
});
