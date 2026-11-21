import { defineStore } from "pinia";
import OpenCodeService from "@/modules/opencode/services/OpenCodeService";
import { useStorSpiskaRekvizitovOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/StorSpiskaRekvizitovOpenCode";
import { useStorSpiskaWorkspace } from "@/modules/opencode/store/StorSpiskaWorkspace";
import ProektiService from "@/modules/unit/services/ProektiService";
import type { Proekt } from "@/modules/unit/store/SpisokProektov/model/Proekt";
import type { Schema } from "@/api/types";

/** Лимит проектов workspace на бэкенде (`MAX_WORKSPACE_PROJECTS`). */
export const MAX_PROEKTOV_WORKSPACE = 20;

type StorFormiSozdaniyaWorkspaceState = {
    otkrita: boolean;
    name: string;
    branch: string;
    credentialId: string;
    /** Проекты в выбранном порядке: он же порядок папок в workspace. */
    projectIds: string[];
    /** Первый промпт: запускается после успешного старта контейнера. */
    prompt: string;
    proekti: Proekt[];
    loaderProektov: boolean;
    oshibkaZagruzkiProektov: string | null;
    loader: boolean;
    oshibkaOtBackenda: string | null;
};

/**
 * Стор диалога создания workspace.
 *
 * Отличия от сессии: вместо юнитов выбираются проекты (одна общая ветка,
 * порядок важен), обязательны имя и первый промпт. Реквизиты берутся из уже
 * загруженного списка, как и в форме сессии.
 */
export const useStorFormiSozdaniyaWorkspace = defineStore("StorFormiSozdaniyaWorkspace", {
    state: (): StorFormiSozdaniyaWorkspaceState => {
        return {
            otkrita: false,
            name: "",
            branch: "",
            credentialId: "",
            projectIds: [],
            prompt: "",
            proekti: [],
            loaderProektov: false,
            oshibkaZagruzkiProektov: null,
            loader: false,
            oshibkaOtBackenda: null,
        };
    },

    getters: {
        /** Реквизиты для выпадающего списка. */
        rekvizity(): Schema<"OpenCodeCredential">[] {
            return useStorSpiskaRekvizitovOpenCode().spisok;
        },

        /**
         * Сохранение возможно, когда заполнены обязательные поля и выбран
         * хотя бы один проект в пределах лимита.
         */
        mozhnoSohranit(state): boolean {
            return !state.loader
                && state.credentialId !== ""
                && state.name.trim() !== ""
                && state.branch.trim() !== ""
                && state.prompt.trim() !== ""
                && state.projectIds.length >= 1
                && state.projectIds.length <= MAX_PROEKTOV_WORKSPACE;
        },
    },

    actions: {
        /** Открыть диалог с чистой формой. */
        otkrit() {
            const rekvizity = useStorSpiskaRekvizitovOpenCode().spisok;

            this.otkrita = true;
            this.name = "";
            this.branch = "";
            this.credentialId = rekvizity.length > 0 ? rekvizity[0].id : "";
            this.projectIds = [];
            this.prompt = "";
            this.oshibkaOtBackenda = null;
            this.loader = false;

            if (this.proekti.length === 0) {
                void this.poluchitProekti();
            }
        },

        zakrit() {
            this.otkrita = false;
            this.oshibkaOtBackenda = null;
            this.loader = false;
        },

        /**
         * Загрузить доступные пользователю проекты.
         *
         * Берём максимальную доступную страницу: в диалоге нужен обзорный
         * список. `canPush` в публичной модели проекта нет — режим только-
         * чтение станет известен после создания и будет показан в карточке.
         */
        async poluchitProekti() {
            this.loaderProektov = true;
            this.oshibkaZagruzkiProektov = null;

            const response = await ProektiService.list({ limit: 200, offset: 0 });

            this.loaderProektov = false;

            if (response.status === "success") {
                this.proekti = response.data;
            } else if (response.status === "fail") {
                this.oshibkaZagruzkiProektov = response.data.message;
            } else {
                this.oshibkaZagruzkiProektov = response.message;
            }
        },

        /**
         * Создать workspace.
         *
         * @returns идентификатор созданного workspace или `null`, если бэкенд
         *          отказал. Ошибка старта не мешает созданию: бэкенд всё равно
         *          вернёт ид, а статус станет `ERROR`.
         */
        async sohranit(): Promise<string | null> {
            if (!this.mozhnoSohranit) {
                return null;
            }

            this.loader = true;
            this.oshibkaOtBackenda = null;

            const response = await OpenCodeService.sozdatWorkspace({
                name: this.name.trim(),
                branch: this.branch.trim(),
                projectIds: [...this.projectIds],
                prompt: this.prompt.trim(),
                credentialId: this.credentialId,
            });

            this.loader = false;

            if (response.status === "success") {
                this.otkrita = false;
                return response.data.id;
            }

            this.oshibkaOtBackenda = response.status === "fail" ? response.data.message : response.message;

            return null;
        },

        /**
         * Создать workspace и обновить список.
         *
         * `sozdat` возвращает только `{id, status}`, поэтому список
         * перезапрашивается — иначе карточка появилась бы без названия.
         */
        async sozdatIDobavitVSpiske(): Promise<string | null> {
            const id = await this.sohranit();

            if (id !== null) {
                await useStorSpiskaWorkspace().poluchitSpisok();
            }

            return id;
        },
    },
});
