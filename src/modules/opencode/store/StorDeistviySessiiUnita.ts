import { defineStore } from "pinia";
import router from "@/bootstrap/router";
import UnitSessionService from "@/modules/opencode/services/UnitSessionService";
import { useStorFormiSozdaniyaSessiiUnita } from "@/modules/opencode/store/StorFormiSozdaniyaSessiiUnita";

type ParametryOtkrytiya = {
    unitId: string;
    unitLabel: string;
    unitDescription: string;
};

type StorDeistviySessiiUnitaState = {
    loaderUnitId: string | null;
    oshibka: string | null;
};

/**
 * Действие кнопки сессии в списке юнитов.
 *
 * Если у юнита уже есть активная сессия — она открывается в новом окне.
 * Если сессии нет — открывается форма создания с фиксированным юнитом.
 */
export const useStorDeistviySessiiUnita = defineStore("StorDeistviySessiiUnita", {
    state: (): StorDeistviySessiiUnitaState => {
        return {
            loaderUnitId: null,
            oshibka: null,
        };
    },

    actions: {
        async otkritIliSozdat(params: ParametryOtkrytiya): Promise<void> {
            if (this.loaderUnitId !== null) {
                return;
            }

            this.loaderUnitId = params.unitId;
            this.oshibka = null;

            const response = await UnitSessionService.sessiyaPoUnitu({ unitId: params.unitId });

            this.loaderUnitId = null;

            if (response.status !== "success") {
                this.oshibka = response.status === "fail"
                    ? response.data.message
                    : response.message;

                return;
            }

            if (response.data !== null) {
                const url = router.resolve({
                    name: "opencode_unit_session_chat",
                    params: { id: response.data.id },
                }).href;

                window.open(url, "_blank", "noopener,noreferrer");

                return;
            }

            useStorFormiSozdaniyaSessiiUnita().otkrit(params);
        },

        otkritVNovomOkne(sessionId: string): void {
            const url = router.resolve({
                name: "opencode_unit_session_chat",
                params: { id: sessionId },
            }).href;

            window.open(url, "_blank", "noopener,noreferrer");
        },
    },
});
