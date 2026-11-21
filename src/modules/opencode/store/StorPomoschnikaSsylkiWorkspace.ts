import { defineStore } from "pinia";
import i18n from "@/bootstrap/translator";
import OpenCodeService from "@/modules/opencode/services/OpenCodeService";
import type { Workspace } from "@/modules/opencode/model/Workspace";

/**
 * Приводит суффикс ссылки к виду, который ожидает бэкенд.
 *
 * Пустая строка и строка из пробелов равнозначны отсутствию суффикса, поэтому
 * они нормализуются в `null`. Ведущий `/` бэкенд нормализует сам.
 */
export function normalizovatSuffiks(suffix: string | null | undefined): string | null {
    const znachenie = suffix?.trim();

    return znachenie ? znachenie : null;
}

/** Проверяет, что порт — целое число в допустимом диапазоне TCP/UDP. */
export function portKorrektniy(port: number | null): port is number {
    return port !== null && Number.isInteger(port) && port >= 1 && port <= 65535;
}

type StorPomoschnikaSsylkiWorkspaceState = {
    /** Видимость диалога формирования ссылки. */
    otkrita: boolean;
    /** Workspace, для которого формируется ссылка. */
    workspaceId: string | null;
    /** Порт внутри workspace-контейнера. */
    port: number | null;
    /** Необязательный хвост, дописываемый к ссылке. */
    suffix: string;
    /** Идёт запрос формирования ссылки. */
    loader: boolean;
    /** Текст ошибки валидации или запроса. */
    oshibka: string | null;
    /** Готовая ссылка после успешного запроса. */
    ssylka: string | null;
};

/**
 * Стор помощника формирования ссылки на порт workspace.
 *
 * Открывается из карточки workspace, запоминает его идентификатор и по запросу
 * получает готовую ссылку через `ssylkaWorkspacePoPortu`.
 */
export const useStorPomoschnikaSsylkiWorkspace = defineStore("StorPomoschnikaSsylkiWorkspace", {
    state: (): StorPomoschnikaSsylkiWorkspaceState => {
        return {
            otkrita: false,
            workspaceId: null,
            port: null,
            suffix: "",
            loader: false,
            oshibka: null,
            ssylka: null,
        };
    },
    actions: {
        /**
         * Открывает диалог для выбранного workspace и сбрасывает прошлый результат.
         *
         * Принимает только `id`: карточка передаёт полный `Workspace`, а чат —
         * `SostoyanieWorkspace` (у него нет `createdAt`/`updatedAt`), и обоим
         * достаточно идентификатора.
         */
        otkrit(workspace: Pick<Workspace, "id">): void {
            this.workspaceId = workspace.id;
            this.port = null;
            this.suffix = "";
            this.oshibka = null;
            this.ssylka = null;
            this.loader = false;
            this.otkrita = true;
        },
        /** Закрывает диалог и очищает состояние. */
        zakrit(): void {
            this.otkrita = false;
            this.workspaceId = null;
            this.port = null;
            this.suffix = "";
            this.oshibka = null;
            this.ssylka = null;
            this.loader = false;
        },
        /**
         * Валидирует ввод и запрашивает ссылку на порт workspace.
         *
         * Возвращает готовую ссылку либо `null`; текст ошибки при этом кладётся
         * в `oshibka`.
         */
        async sformirovat(): Promise<string | null> {
            const workspaceId = this.workspaceId;
            const port = this.port;

            if (workspaceId === null) {
                this.oshibka = i18n.global.t("opencode.workspace.helper.errors.workspace_not_selected");

                return null;
            }

            if (!portKorrektniy(port)) {
                this.oshibka = i18n.global.t("opencode.workspace.helper.errors.invalid_port");

                return null;
            }

            this.loader = true;
            this.oshibka = null;
            this.ssylka = null;

            const response = await OpenCodeService.ssylkaWorkspacePoPortu({
                workspaceId,
                port,
                suffix: normalizovatSuffiks(this.suffix),
            });

            this.loader = false;
            if (response.status === "success") {
                this.ssylka = response.data.link;

                return this.ssylka;
            }

            const fallback = i18n.global.t("opencode.workspace.helper.errors.request_failed");

            if (response.status === "fail") {
                this.oshibka = response.data.message || fallback;
            } else if (response.status === "error") {
                this.oshibka = response.message || fallback;
            }

            return null;
        },
    },
});
