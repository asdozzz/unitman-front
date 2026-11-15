import {defineStore} from "pinia";
import OpenCodeService from "@/modules/opencode/services/OpenCodeService";
import UnitiService from "@/modules/unit/services/UnitiService";
import type {Schema} from "@/api/types";

type StorSpiskaSessiyOpenCodeState = {
    spisok: Schema<"OpenCodeSession">[];
    loaderSpiska: boolean;
    oshibkaZagruzki: string | null;
    /** id сессии, по которой выполняется архивация. */
    arhiviruemiId: string | null;
    /**
     * Кеш имён привязанных юнитов.
     *
     * В сессии хранятся только идентификаторы (`units[].unitId`), а показывать
     * нужно человекочитаемые названия. Имена догружаются одним запросом на
     * список и переиспользуются между списком сессий и чатом.
     */
    nazvaniyaUnitov: Record<string, string>;
};

/**
 * Стор списка сессий OpenCode.
 *
 * Сессии принадлежат аккаунту: бэкенд сам отбирает их по токену, поэтому
 * фильтровать по пользователю на клиенте не нужно.
 */
export const useStorSpiskaSessiyOpenCode = defineStore("StorSpiskaSessiyOpenCode", {
    state: (): StorSpiskaSessiyOpenCodeState => {
        return {
            spisok: [],
            loaderSpiska: false,
            oshibkaZagruzki: null,
            arhiviruemiId: null,
            nazvaniyaUnitov: {},
        };
    },
    getters: {
        /** Сессий нет, и это не ошибка загрузки. */
        pust(state): boolean {
            return !state.loaderSpiska && state.spisok.length === 0 && state.oshibkaZagruzki === null;
        },

        /** Есть хотя бы одна архивная сессия: показываем переключатель фильтра. */
        estArhivnie(state): boolean {
            return state.spisok.some((sessiya) => sessiya.archived);
        },

        /** Подпись юнита по id: имя из кеша либо сам идентификатор. */
        nazvanieUnitaPoId(state) {
            return (unitId: string): string => state.nazvaniyaUnitov[unitId] ?? unitId;
        },
    },
    actions: {
        async poluchitSpisok() {
            this.loaderSpiska = true;
            this.oshibkaZagruzki = null;

            const response = await OpenCodeService.spisokSessiy();

            this.loaderSpiska = false;

            if (response.status === "success") {
                this.spisok = response.data;
                // Имена юнитов нужны для подписей; список уже отрисован,
                // поэтому не ждём этот запрос.
                this.poluchitNazvaniyaUnitov();
            } else if (response.status === "fail") {
                this.oshibkaZagruzki = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaZagruzki = response.message;
            }
        },

        /**
         * Догрузить имена всех привязанных к сессиям юнитов.
         *
         * Запрашиваем только те id, которых ещё нет в кеше, чтобы не дёргать
         * бэкенд при каждом обновлении списка.
         */
        async poluchitNazvaniyaUnitov() {
            const izvestnie = new Set(Object.keys(this.nazvaniyaUnitov));
            const nuzhnie = new Set<string>();

            this.spisok.forEach((sessiya) => {
                (sessiya.units ?? []).forEach((unit) => {
                    if (!izvestnie.has(unit.unitId)) {
                        nuzhnie.add(unit.unitId);
                    }
                });
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
                const novie = {...this.nazvaniyaUnitov};
                response.data.forEach((unit) => {
                    novie[unit.id] = unit.name;
                });
                this.nazvaniyaUnitov = novie;
            }
        },

        /** Сессия создана: сразу подставляем её в список, чтобы не ждать перезагрузки. */
        dobavitSessiyu(sessiya: Schema<"OpenCodeSession">) {
            this.spisok = [sessiya, ...this.spisok];
        },

        /**
         * Архивация сессии.
         *
         * Полного удаления на бэкенде нет: `arhivirovatSessiyu` оставляет и
         * сессию, и историю, выставляя `archived: true` и
         * `archiveReason: "manual"`. Новые ходы для такой сессии запрещены.
         *
         * Ответ — `data: null`, поэтому флаг проставляется локально сразу
         * (список не «прыгает»), а затем список перезапрашивается, чтобы
         * получить состояние с бэкенда.
         */
        async arhivirovatSessiyu(id: string) {
            this.arhiviruemiId = id;
            this.oshibkaZagruzki = null;

            const response = await OpenCodeService.arhivirovatSessiyu({ sessionId: id });

            this.arhiviruemiId = null;

            if (response.status === "success") {
                this.spisok = this.spisok.map((sessiya) => sessiya.id === id
                    ? { ...sessiya, archived: true, archiveReason: "manual" }
                    : sessiya);

                // Ответ не содержит данных: актуальное состояние — только в списке.
                await this.poluchitSpisok();
            } else if (response.status === "fail") {
                this.oshibkaZagruzki = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaZagruzki = response.message;
            }

            return response;
        },
    },
});
