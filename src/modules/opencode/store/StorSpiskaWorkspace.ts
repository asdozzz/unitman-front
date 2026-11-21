import { defineStore } from "pinia";
import OpenCodeService from "@/modules/opencode/services/OpenCodeService";
import {
    DEFAULT_FILTRI_WORKSPACE,
    type FiltriWorkspace,
} from "@/modules/opencode/model/WorkspaceFiltri";
import {
    statusTranzitniy,
    type Workspace,
} from "@/modules/opencode/model/Workspace";
import type { Schema } from "@/api/types";

type DejstvieWorkspace = "archive" | "restore" | "delete";

type StorSpiskaWorkspaceState = {
    spisok: Workspace[];
    loaderSpiska: boolean;
    oshibkaZagruzki: string | null;
    filtr: FiltriWorkspace;
    /** Ид workspace, по которому сейчас выполняется архив/восстановление/удаление. */
    dejstvieId: string | null;
    dejstvie: DejstvieWorkspace | null;
    /** Ошибка последнего действия: её показывает список или диалог. */
    oshibkaDejstviya: string | null;
};

/**
 * Не реактивный таймер опроса транзитных статусов.
 *
 * Пока хотя бы один workspace в `CREATING/STARTING/ARCHIVING/DELETING`,
 * список перечитывается: так интерфейс сам ловит переход в `RUNNING`,
 * `ARCHIVED` или `ERROR`, не требуя ручного обновления.
 */
let tajmerOprosa: ReturnType<typeof setTimeout> | null = null;

/** Поколение загрузки: опоздавшие ответы старого фильтра отбрасываются. */
let pokolenie = 0;

/** Пауза между опросами списка в транзитном статусе, мс. */
const PAUZA_OPROSA = 4000;

/**
 * Стор списка workspace-сессий.
 *
 * Список и фильтры совпадают с контрактом `GET /opencode/workspace/spisok`,
 * поэтому клиентской фильтрации нет. Действия архива/восстановления/удаления
 * выполняются на бэкенде, клиент лишь перечитывает список и показывает
 * ошибку из конверта.
 */
export const useStorSpiskaWorkspace = defineStore("StorSpiskaWorkspace", {
    state: (): StorSpiskaWorkspaceState => {
        return {
            spisok: [],
            loaderSpiska: false,
            oshibkaZagruzki: null,
            filtr: { ...DEFAULT_FILTRI_WORKSPACE },
            dejstvieId: null,
            dejstvie: null,
            oshibkaDejstviya: null,
        };
    },

    getters: {
        /** Есть workspace, у которых сервер ещё доделывает операцию. */
        estTranzitnie(state): boolean {
            return state.spisok.some((workspace) => statusTranzitniy(workspace.status));
        },

        /** Список пуст, и это не ошибка загрузки. */
        pust(state): boolean {
            return !state.loaderSpiska && state.spisok.length === 0 && state.oshibkaZagruzki === null;
        },
    },

    actions: {
        /**
         * Загрузить список с учётом текущего фильтра.
         *
         * После ответа заново планируется опрос, если остались транзитные
         * статусы. Ошибка фонового опроса не затирает уже показанный список.
         */
        async poluchitSpisok() {
            const nomer = ++pokolenie;

            this.loaderSpiska = true;
            this.oshibkaZagruzki = null;

            const response = await OpenCodeService.spisokWorkspace({
                onlyActive: this.filtr.onlyActive,
                search: this.filtr.search,
            });

            if (nomer !== pokolenie) {
                return;
            }

            this.loaderSpiska = false;

            if (response.status === "success") {
                this.spisok = response.data;
            } else if (response.status === "fail") {
                this.oshibkaZagruzki = response.data.message;
            } else {
                this.oshibkaZagruzki = response.message;
            }

            this.zaplanirovatOpros();
        },

        /** Применить фильтр и перечитать список. */
        async primenitFiltr(filtr: FiltriWorkspace) {
            this.filtr = { ...filtr };
            await this.poluchitSpisok();
        },

        /**
         * Архивировать workspace.
         *
         * Первый вызов идёт без `force`. Если приходят незакоммиченные
         * изменения, возвращается результат с `requiresConfirmation = true`:
         * UI показывает диалог и повторяет вызов с `force = true`.
         */
        async arhivirovat(id: string, force = false): Promise<Schema<"RezultatArhivaciiWorkspace"> | null> {
            this.nachatDejstvie(id, "archive");

            const response = await OpenCodeService.arhivirovatWorkspace({
                workspaceId: id,
                force,
            });

            this.zavershitDejstvie();

            if (response.status !== "success") {
                this.oshibkaDejstviya = response.status === "fail" ? response.data.message : response.message;
                return null;
            }

            // Пока ждём подтверждения, список не трогаем: workspace ещё RUNNING.
            if (!response.data.requiresConfirmation) {
                await this.poluchitSpisok();
            }

            return response.data;
        },

        /** Восстановить архивный workspace или workspace в ошибке. */
        async vosstanovit(id: string): Promise<boolean> {
            this.nachatDejstvie(id, "restore");

            const response = await OpenCodeService.vosstanovitWorkspace({ workspaceId: id });

            this.zavershitDejstvie();

            if (response.status !== "success") {
                this.oshibkaDejstviya = response.status === "fail" ? response.data.message : response.message;
                return false;
            }

            await this.poluchitSpisok();

            return true;
        },

        /**
         * Удалить workspace.
         *
         * Удаление выполняет фоновая задача после остановки контейнера,
         * поэтому после успеха список перечитывается: карточка сначала
         * покажет `DELETING`, а затем исчезнет.
         */
        async udalit(id: string): Promise<boolean> {
            this.nachatDejstvie(id, "delete");

            const response = await OpenCodeService.udalitWorkspace({ workspaceId: id });

            this.zavershitDejstvie();

            if (response.status !== "success") {
                this.oshibkaDejstviya = response.status === "fail" ? response.data.message : response.message;
                return false;
            }

            await this.poluchitSpisok();

            return true;
        },

        /** Запустить опрос, если он ещё не идёт. */
        zaplanirovatOpros() {
            this.ostanovitOpros();

            if (!this.estTranzitnie) {
                return;
            }

            tajmerOprosa = setTimeout(() => {
                tajmerOprosa = null;
                void this.poluchitSpisok();
            }, PAUZA_OPROSA);
        },

        /**
         * Снять таймер: экран списка мог быть закрыт.
         *
         * Поколение увеличивается, чтобы ответ уже отправленного запроса не
         * запланировал новый опрос после ухода со страницы.
         */
        ostanovitOpros() {
            pokolenie += 1;

            if (tajmerOprosa !== null) {
                clearTimeout(tajmerOprosa);
                tajmerOprosa = null;
            }
        },

        /** Очистить ошибку действия (например, после закрытия диалога). */
        sbrositOshibkuDejstviya() {
            this.oshibkaDejstviya = null;
        },

        nachatDejstvie(id: string, dejstvie: DejstvieWorkspace) {
            this.dejstvieId = id;
            this.dejstvie = dejstvie;
            this.oshibkaDejstviya = null;
        },

        zavershitDejstvie() {
            this.dejstvieId = null;
            this.dejstvie = null;
        },
    },
});
