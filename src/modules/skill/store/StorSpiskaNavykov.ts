import { defineStore } from "pinia";
import SkillService from "@/modules/skill/services/SkillService";
import {
    normalizovatKratkuyu,
    type NavykKratko,
    type OblastNavyka,
} from "@/modules/skill/model/Navyk";

export type FiltrNavykov = {
    /** Клиентский поиск: бэкенд списка навыков фильтр по строке не принимает. */
    search: string;
    includeArchived: boolean;
};

export type KontekstSpiskaNavykov = {
    scope?: OblastNavyka | null;
    projectId?: string | null;
    includeArchived?: boolean;
};

type DejstvieNavyka = "archive" | "attach" | "detach";

type StorSpiskaNavykovState = {
    spisok: NavykKratko[];
    loaderSpiska: boolean;
    oshibkaZagruzki: string | null;
    filtr: FiltrNavykov;
    scope: OblastNavyka | null;
    projectId: string | null;
    dejstvieId: string | null;
    dejstvie: DejstvieNavyka | null;
    oshibkaDejstviya: string | null;
};

/** Поколение загрузки: опоздавший ответ старого контекста отбрасывается. */
let pokolenie = 0;

function soobshchenieOshibki(response: {
    status: "fail" | "error";
    data?: { message: string };
    message?: string;
}): string {
    return response.status === "fail"
        ? (response.data?.message ?? "")
        : (response.message ?? "");
}

/**
 * Стор списка навыков.
 *
 * Контекст (`scope`/`projectId`) задаёт вызывающая страница: глобальный список
 * администратора или проектный список. Поиск выполняется на клиенте, потому
 * что контракт `/skill/spisok` не содержит строкового фильтра. После мутаций
 * список перечитывается — оптимистичных изменений нет.
 */
export const useStorSpiskaNavykov = defineStore("StorSpiskaNavykov", {
    state: (): StorSpiskaNavykovState => ({
        spisok: [],
        loaderSpiska: false,
        oshibkaZagruzki: null,
        filtr: {
            search: "",
            includeArchived: false,
        },
        scope: null,
        projectId: null,
        dejstvieId: null,
        dejstvie: null,
        oshibkaDejstviya: null,
    }),

    getters: {
        /** Список с учётом клиентского поиска по имени, slug и описанию. */
        otfiltrovanniy(state): NavykKratko[] {
            const igla = state.filtr.search.trim().toLowerCase();

            if (igla === "") {
                return state.spisok;
            }

            return state.spisok.filter((navyk: NavykKratko) =>
                navyk.name.toLowerCase().includes(igla)
                || navyk.slug.toLowerCase().includes(igla)
                || navyk.description.toLowerCase().includes(igla),
            );
        },

        /** Список пуст и это не ошибка загрузки. */
        pust(state): boolean {
            return !state.loaderSpiska
                && state.spisok.length === 0
                && state.oshibkaZagruzki === null;
        },

        /** Поиск не дал результатов при непустом исходном списке. */
        pustPoisk(state): boolean {
            return !state.loaderSpiska
                && state.spisok.length > 0
                && state.filtr.search.trim() !== ""
                && this.otfiltrovanniy.length === 0;
        },
    },

    actions: {
        /**
         * Загрузить список в заданном контексте.
         *
         * Повторный вызов без контекста перечитывает текущий. Смена контекста
         * сбрасывает список, чтобы на экране не мелькали чужие навыки.
         */
        async zagruzit(kontekst: KontekstSpiskaNavykov = {}) {
            const smenilsyaKontekst = kontekst.scope !== undefined
                || kontekst.projectId !== undefined;

            if (kontekst.scope !== undefined) {
                this.scope = kontekst.scope;
            }

            if (kontekst.projectId !== undefined) {
                this.projectId = kontekst.projectId;
            }

            if (kontekst.includeArchived !== undefined) {
                this.filtr.includeArchived = kontekst.includeArchived;
            }

            if (smenilsyaKontekst) {
                this.spisok = [];
            }

            const nomer = ++pokolenie;
            this.loaderSpiska = true;
            this.oshibkaZagruzki = null;

            const response = await SkillService.spisok({
                scope: this.scope,
                projectId: this.projectId,
                includeArchived: this.filtr.includeArchived,
            });

            if (nomer !== pokolenie) {
                return;
            }

            this.loaderSpiska = false;

            if (response.status === "success") {
                this.spisok = (response.data ?? []).map((navyk) =>
                    normalizovatKratkuyu(navyk),
                );
                return;
            }

            this.oshibkaZagruzki = soobshchenieOshibki(response);
        },

        /** Применить строку поиска без запроса к бэкенду. */
        primenitPoisk(search: string) {
            this.filtr.search = search;
        },

        /** Переключить показ архивных навыков и перечитать список. */
        async pereklyuchitArhivnie(includeArchived: boolean) {
            this.filtr.includeArchived = includeArchived;
            await this.zagruzit();
        },

        /** Архивировать навык. После успеха список перечитывается. */
        async arhivirovat(id: string): Promise<boolean> {
            this.nachatDejstvie(id, "archive");

            const response = await SkillService.udalit({ id });

            this.zavershitDejstvie();

            if (response.status !== "success") {
                this.oshibkaDejstviya = soobshchenieOshibki(response);
                return false;
            }

            await this.zagruzit();

            return true;
        },

        /** Прикрепить проектный навык к проектам. */
        async prikrepit(id: string, projectIds: string[]): Promise<boolean> {
            this.nachatDejstvie(id, "attach");

            const response = await SkillService.prikrepit({ id, projectIds });

            this.zavershitDejstvie();

            if (response.status !== "success") {
                this.oshibkaDejstviya = soobshchenieOshibki(response);
                return false;
            }

            await this.zagruzit();

            return true;
        },

        /** Открепить проектный навык от проекта. */
        async otkrepit(id: string, projectId: string): Promise<boolean> {
            this.nachatDejstvie(id, "detach");

            const response = await SkillService.otkrepit({ id, projectId });

            this.zavershitDejstvie();

            if (response.status !== "success") {
                this.oshibkaDejstviya = soobshchenieOshibki(response);
                return false;
            }

            await this.zagruzit();

            return true;
        },

        nachatDejstvie(id: string, dejstvie: DejstvieNavyka) {
            this.dejstvieId = id;
            this.dejstvie = dejstvie;
            this.oshibkaDejstviya = null;
        },

        zavershitDejstvie() {
            this.dejstvieId = null;
            this.dejstvie = null;
        },

        sbrOsitOshibkuDejstviya() {
            this.oshibkaDejstviya = null;
        },
    },
});
