import {defineStore} from 'pinia';
import RedaktorService from "@/modules/unit/services/RedaktorService";
import {useSpisokUnitovStore} from "@/modules/unit/store/SpisokUnitovStore";
import type {Schema} from "@/api/types";
import type {ApiResponse} from "@/bootstrap/apiClient/ApiResponse";
import type {Unit} from "@/modules/unit/store/SpisokUnitov/model/Unit";

/**
 * Достаёт текст ошибки из конверта ответа.
 *
 * Бэкенд присылает ключ перевода (`unit.redaktor.*`) в `message`; стор хранит
 * его как есть, а перевод выполняется на слое отображения.
 */
function oshibkaIzOtveta(response: ApiResponse<unknown>): string | null {
    if (response.status === "fail") {
        return response.data.message;
    }

    if (response.status === "error") {
        return response.message;
    }

    return null;
}

export type StorRedaktorovUnitaState = {
    unitId: string | null;
    otkryt: boolean;
    loader: boolean;
    redaktirovanieVklucheno: boolean;
    redaktory: Schema<"RedaktorUnita">[];
    oshibka: string | null;
    ssylka: Schema<"SsylkaRedaktora"> | null;
    loaderSsylki: boolean;
    dejstvieUserId: string | null;
}

export const useStorRedaktorovUnita = defineStore('StorRedaktorovUnita', {
    state: (): StorRedaktorovUnitaState => {
        return {
            unitId: null,
            otkryt: false,
            loader: false,
            redaktirovanieVklucheno: false,
            redaktory: [],
            oshibka: null,
            ssylka: null,
            loaderSsylki: false,
            dejstvieUserId: null,
        };
    },
    actions: {
        /** Открывает диалог для юнита и подгружает список редакторов. */
        async otkrytDlya(unit: Unit): Promise<void> {
            this.sbrosit();
            this.unitId = unit.id;
            this.otkryt = true;

            await this.zagruzit();
        },
        /** Закрывает диалог и очищает состояние. */
        zakryt(): void {
            this.sbrosit();
        },
        /** Перечитывает состояние редактирования и список редакторов. */
        async zagruzit(): Promise<boolean> {
            if (!this.unitId) {
                return false;
            }

            this.loader = true;
            this.oshibka = null;

            const response = await RedaktorService.redaktory({unitId: this.unitId});

            this.loader = false;

            if (response.status === "success") {
                this.redaktirovanieVklucheno = response.data.redaktirovanieVklucheno;
                this.redaktory = response.data.redaktory;

                return true;
            }

            this.oshibka = oshibkaIzOtveta(response);

            return false;
        },
        /** Включает режим редактирования и обновляет карточку юнита. */
        async vklyuchit(): Promise<boolean> {
            if (!this.unitId) {
                return false;
            }

            this.loader = true;
            this.oshibka = null;

            const response = await RedaktorService.vklyuchitRedaktirovanie({unitId: this.unitId});

            if (response.status !== "success") {
                this.loader = false;
                this.oshibka = oshibkaIzOtveta(response);

                return false;
            }

            this.redaktirovanieVklucheno = true;
            await this.zagruzit();
            await this.obnovitKartochku();

            return true;
        },
        /** Выключает режим редактирования и обновляет карточку юнита. */
        async vykluchit(): Promise<boolean> {
            if (!this.unitId) {
                return false;
            }

            this.loader = true;
            this.oshibka = null;

            const response = await RedaktorService.vykluchitRedaktirovanie({unitId: this.unitId});

            if (response.status !== "success") {
                this.loader = false;
                this.oshibka = oshibkaIzOtveta(response);

                return false;
            }

            this.redaktirovanieVklucheno = false;
            await this.zagruzit();
            await this.obnovitKartochku();

            return true;
        },
        /** Прикрепляет пользователя к юниту. */
        async prikrepit(userId: string): Promise<boolean> {
            if (!this.unitId) {
                return false;
            }

            this.dejstvieUserId = userId;
            this.oshibka = null;

            const response = await RedaktorService.prikrepitRedaktora({
                unitId: this.unitId,
                userId,
            });

            this.dejstvieUserId = null;

            if (response.status !== "success") {
                this.oshibka = oshibkaIzOtveta(response);

                return false;
            }

            await this.zagruzit();
            await this.obnovitKartochku();

            return true;
        },
        /** Открепляет редактора от юнита. */
        async otkrepit(userId: string): Promise<boolean> {
            if (!this.unitId) {
                return false;
            }

            this.dejstvieUserId = userId;
            this.oshibka = null;

            const response = await RedaktorService.otkrepitRedaktora({
                unitId: this.unitId,
                userId,
            });

            this.dejstvieUserId = null;

            if (response.status !== "success") {
                this.oshibka = oshibkaIzOtveta(response);

                return false;
            }

            await this.zagruzit();
            await this.obnovitKartochku();

            return true;
        },
        /** Запрашивает персональную ссылку редактора. */
        async poluchitSsylku(): Promise<boolean> {
            if (!this.unitId) {
                return false;
            }

            this.loaderSsylki = true;
            this.oshibka = null;

            const response = await RedaktorService.poluchitSsylkuRedaktora({unitId: this.unitId});

            this.loaderSsylki = false;

            if (response.status === "success") {
                this.ssylka = response.data;

                return true;
            }

            this.oshibka = oshibkaIzOtveta(response);

            return false;
        },
        /**
         * Просит стор списка юнитов перечитать карточку, чтобы обновились
         * бейдж режима и признак включённого редактирования.
         */
        async obnovitKartochku(): Promise<void> {
            if (!this.unitId) {
                return;
            }

            await useSpisokUnitovStore().obnovitUnit(this.unitId);
        },
        /** Полный сброс состояния. */
        sbrosit(): void {
            this.unitId = null;
            this.otkryt = false;
            this.loader = false;
            this.redaktirovanieVklucheno = false;
            this.redaktory = [];
            this.oshibka = null;
            this.ssylka = null;
            this.loaderSsylki = false;
            this.dejstvieUserId = null;
        },
    },
});
