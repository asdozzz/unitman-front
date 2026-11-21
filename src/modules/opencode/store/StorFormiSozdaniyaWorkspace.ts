import { defineStore } from "pinia";
import OpenCodeService from "@/modules/opencode/services/OpenCodeService";
import { useStorSpiskaRekvizitovOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/StorSpiskaRekvizitovOpenCode";
import { useStorSpiskaWorkspace } from "@/modules/opencode/store/StorSpiskaWorkspace";
import ProektiService from "@/modules/unit/services/ProektiService";
import type { Proekt } from "@/modules/unit/store/SpisokProektov/model/Proekt";
import type { Schema } from "@/api/types";

/** Лимит проектов workspace на бэкенде (`MAX_WORKSPACE_PROJECTS`). */
export const MAX_PROEKTOV_WORKSPACE = 20;

/**
 * Кеш веток одного проекта для `q-select` переопределения.
 *
 * `query` хранит последний запрос фильтра: по нему форма понимает, что
 * список уже загружен под текущий ввод.
 */
type VetkiProektaCache = {
    spisok: string[];
    loader: boolean;
    query: string;
};

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
    /** Переопределения ветки по проектам: ключ — `projectId`, значение — ветка. */
    vetkiPereopredeleniya: Record<string, string>;
    /** Кеш списков веток по проектам для выпадающих списков. */
    vetkiProektov: Record<string, VetkiProektaCache>;
    /** Ошибки загрузки веток по проектам. */
    oshibkiVetokProektov: Record<string, string | null>;
};

/**
 * Последний номер запроса веток по каждому проекту.
 *
 * Нужен, чтобы «медленный» ответ устаревшего запроса не перетёр свежий
 * результат: применяется только ответ с актуальным номером.
 */
const posledniyZaprosVetok = new Map<string, number>();

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
            vetkiPereopredeleniya: {},
            vetkiProektov: {},
            oshibkiVetokProektov: {},
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
            this.vetkiPereopredeleniya = {};
            this.vetkiProektov = {};
            this.oshibkiVetokProektov = {};
            posledniyZaprosVetok.clear();

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
         * Загрузить ветки конкретного проекта для выпадающего списка.
         *
         * Ответы нумеруются по проекту: «медленный» ответ устаревшего
         * запроса не применяется, чтобы не перетереть свежий результат.
         */
        async poluchitVetkiProekta(projectId: string, query: string) {
            if (!projectId) {
                return;
            }

            const normalizovanniy = (query ?? "").trim();
            const nomerZaprosa = (posledniyZaprosVetok.get(projectId) ?? 0) + 1;
            posledniyZaprosVetok.set(projectId, nomerZaprosa);

            const kes: VetkiProektaCache = this.vetkiProektov[projectId] ?? {
                spisok: [],
                loader: false,
                query: "",
            };

            kes.loader = true;
            kes.query = normalizovanniy;
            this.vetkiProektov[projectId] = kes;
            this.oshibkiVetokProektov[projectId] = null;

            const response = await ProektiService.poluchitVetkiProekta({
                id: projectId,
                query: normalizovanniy === "" ? null : normalizovanniy,
            });

            // Пока шёл запрос, для проекта могли запустить более свежий.
            if (posledniyZaprosVetok.get(projectId) !== nomerZaprosa) {
                return;
            }

            const tekushiyKes = this.vetkiProektov[projectId];

            if (tekushiyKes) {
                tekushiyKes.loader = false;
            }

            if (response.status === "success") {
                if (tekushiyKes) {
                    tekushiyKes.spisok = response.data.map(
                        (item: Schema<"ProjectBranch">) => item.name,
                    );
                }
            } else if (response.status === "fail") {
                this.oshibkiVetokProektov[projectId] = response.data.message;
            } else {
                this.oshibkiVetokProektov[projectId] = response.message;
            }
        },

        /** Записать или очистить переопределение ветки конкретного проекта. */
        ustanovitVetkuProekta(projectId: string, branch: string | null) {
            if (!projectId) {
                return;
            }

            if (branch === null || branch.trim() === "") {
                delete this.vetkiPereopredeleniya[projectId];
            } else {
                this.vetkiPereopredeleniya[projectId] = branch;
            }
        },

        /**
         * Сбросить переопределения и кеш веток для снятых проектов.
         *
         * Вызывается после изменения `projectIds`: держим в памяти только
         * данные выбранных проектов.
         */
        sbalansirovatVetkiProektov() {
            const vibran = new Set(this.projectIds);

            Object.keys(this.vetkiPereopredeleniya).forEach((projectId) => {
                if (!vibran.has(projectId)) {
                    delete this.vetkiPereopredeleniya[projectId];
                }
            });

            Object.keys(this.vetkiProektov).forEach((projectId) => {
                if (!vibran.has(projectId)) {
                    delete this.vetkiProektov[projectId];
                    delete this.oshibkiVetokProektov[projectId];
                    posledniyZaprosVetok.delete(projectId);
                }
            });
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

            const obshayaVetka = this.branch.trim();

            /**
             * Отправляем только непустые переопределения, которые реально
             * отличаются от общей ветки: остальные бэкенд трактует как
             * «ветка проекта = общая ветка».
             */
            const projectBranches = this.projectIds
                .map((projectId) => ({
                    projectId,
                    branch: (this.vetkiPereopredeleniya[projectId] ?? "").trim(),
                }))
                .filter((item) => item.branch !== "" && item.branch !== obshayaVetka);

            const payload: Schema<"SozdatWorkspace"> = {
                name: this.name.trim(),
                branch: obshayaVetka,
                projectIds: [...this.projectIds],
                prompt: this.prompt.trim(),
                credentialId: this.credentialId,
            };

            if (projectBranches.length > 0) {
                payload.projectBranches = projectBranches;
            }

            const response = await OpenCodeService.sozdatWorkspace(payload);

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
