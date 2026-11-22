import { defineStore } from "pinia";
import UnitSessionService from "@/modules/opencode/services/UnitSessionService";
import UnitiService from "@/modules/unit/services/UnitiService";
import type { UnitSession } from "@/modules/opencode/model/UnitSession";

type StorSpiskaSessiyUnitaState = {
    spisok: UnitSession[];
    loaderSpiska: boolean;
    oshibkaZagruzki: string | null;
    arhiviruemiId: string | null;
    nazvaniyaUnitov: Record<string, string>;
};

/**
 * Список unit-сессий. Не содержит workspace и не фильтрует по `type`.
 */
export const useStorSpiskaSessiyUnita = defineStore("StorSpiskaSessiyUnita", {
    state: (): StorSpiskaSessiyUnitaState => {
        return {
            spisok: [],
            loaderSpiska: false,
            oshibkaZagruzki: null,
            arhiviruemiId: null,
            nazvaniyaUnitov: {},
        };
    },

    getters: {
        pust(state): boolean {
            return !state.loaderSpiska && state.spisok.length === 0 && state.oshibkaZagruzki === null;
        },

        estArhivnie(state): boolean {
            return state.spisok.some((session) => session.archived);
        },

        nazvanieUnitaPoId(state) {
            return (unitId: string): string => state.nazvaniyaUnitov[unitId] ?? unitId;
        },
    },

    actions: {
        async poluchitSpisok() {
            this.loaderSpiska = true;
            this.oshibkaZagruzki = null;

            const response = await UnitSessionService.spisok();

            this.loaderSpiska = false;

            if (response.status === "success") {
                this.spisok = response.data;
                this.poluchitNazvaniyaUnitov();
            } else if (response.status === "fail") {
                this.oshibkaZagruzki = response.data.message;
            } else {
                this.oshibkaZagruzki = response.message;
            }
        },

        async poluchitNazvaniyaUnitov() {
            const izvestnie = new Set(Object.keys(this.nazvaniyaUnitov));
            const nuzhnie = new Set<string>();

            this.spisok.forEach((session) => {
                if (!izvestnie.has(session.unitId)) {
                    nuzhnie.add(session.unitId);
                }
            });

            if (nuzhnie.size === 0) {
                return;
            }

            const response = await UnitiService.list({
                filter: { unitIds: [...nuzhnie] },
                limit: nuzhnie.size,
                offset: 0,
            });

            if (response.status === "success") {
                const novie = { ...this.nazvaniyaUnitov };
                response.data.forEach((unit) => {
                    novie[unit.id] = unit.name;
                });
                this.nazvaniyaUnitov = novie;
            }
        },

        dobavitSessiyu(session: UnitSession) {
            this.spisok = [session, ...this.spisok];
        },

        /**
         * Найти активную сессию юнита. Используется кнопкой в списке юнитов.
         */
        async najtiPoUnitu(unitId: string): Promise<UnitSession | null> {
            const response = await UnitSessionService.sessiyaPoUnitu({ unitId });

            return response.status === "success" ? response.data : null;
        },

        async arhivirovat(sessionId: string) {
            this.arhiviruemiId = sessionId;
            this.oshibkaZagruzki = null;

            const response = await UnitSessionService.arhivirovat({ sessionId });

            this.arhiviruemiId = null;

            if (response.status === "success") {
                this.spisok = this.spisok.map((session) => session.id === sessionId
                    ? { ...session, archived: true, archiveReason: "manual" }
                    : session);
                await this.poluchitSpisok();
            } else if (response.status === "fail") {
                this.oshibkaZagruzki = response.data.message;
            } else {
                this.oshibkaZagruzki = response.message;
            }

            return response;
        },
    },
});
