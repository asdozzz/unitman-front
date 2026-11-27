import { defineStore } from "pinia";
import OpenCodeService from "@/modules/opencode/services/OpenCodeService";
import { useStorSpiskaRekvizitovOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/StorSpiskaRekvizitovOpenCode";
import { useStorSpiskaWorkspace } from "@/modules/opencode/store/StorSpiskaWorkspace";
import ProektiService from "@/modules/unit/services/ProektiService";
import MediatekaService, { type ChernovikFayla } from "@/modules/unit/services/MediatekaService";
import LichniyTokenService from "@/modules/account/services/LichniyTokenService";
import type { Proekt } from "@/modules/unit/store/SpisokProektov/model/Proekt";
import type { Schema } from "@/api/types";
import type { RekvizityOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/model/OpenCodeRekvizity";
import {
    modeliRekvizitov,
    modelPoUmolchaniyu,
    normalizovatModel,
} from "@/modules/opencode/model/ModeliOpenCode";
import { estTokenSPushomProekta } from "@/modules/unit/utils/lichnieTokeni";
import { proveritNazvanieVetki } from "@/modules/unit/utils/vetki";

/** Лимит проектов workspace на бэкенде (`MAX_WORKSPACE_PROJECTS`). */
export const MAX_PROEKTOV_WORKSPACE = 20;

/** Этап двухфазного сохранения: создание веток или создание workspace. */
type EtapSozdaniya = "vetki" | "workspace" | null;

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
    credentialId: string;
    /** Выбранная модель хода; пустая строка — дефолт реквизитов. */
    model: string;
    /** Проекты в выбранном порядке: он же порядок папок в workspace. */
    projectIds: string[];
    /** Загруженные файлы workspace (изображения и текстовые). */
    files: ChernovikFayla[];
    zagruzkaFaylov: boolean;
    oshibkaFaylov: string | null;
    /** Первый промпт: запускается после успешного старта контейнера. */
    prompt: string;
    proekti: Proekt[];
    loaderProektov: boolean;
    oshibkaZagruzkiProektov: string | null;
    loader: boolean;
    oshibkaOtBackenda: string | null;
    /** Базовая ветка проекта, от которой создаётся локальная: ключ — `projectId`. */
    bazovieVetki: Record<string, string>;
    /** Имя создаваемой локальной ветки проекта: ключ — `projectId`. */
    lokalnieVetki: Record<string, string>;
    /** Текущий этап сохранения или `null`, если сохранение не идёт. */
    etapSozdaniya: EtapSozdaniya;
    /** Личные токены пользователя для проверки прав на создание веток. */
    tokeni: {
        spisok: Schema<"LichniyTokenPublic">[];
        loader: boolean;
    };
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
 * Отличия от сессии: вместо юнитов выбираются проекты, для каждого из
 * которых создаётся локальная ветка в хранилище. Порядок проектов важен,
 * обязательны имя и первый промпт. Реквизиты берутся из уже загруженного
 * списка, как и в форме сессии.
 */
export const useStorFormiSozdaniyaWorkspace = defineStore("StorFormiSozdaniyaWorkspace", {
    state: (): StorFormiSozdaniyaWorkspaceState => {
        return {
            otkrita: false,
            name: "",
            credentialId: "",
            model: "",
            projectIds: [],
            files: [],
            zagruzkaFaylov: false,
            oshibkaFaylov: null,
            prompt: "",
            proekti: [],
            loaderProektov: false,
            oshibkaZagruzkiProektov: null,
            loader: false,
            oshibkaOtBackenda: null,
            bazovieVetki: {},
            lokalnieVetki: {},
            etapSozdaniya: null,
            tokeni: {
                spisok: [],
                loader: false,
            },
            vetkiProektov: {},
            oshibkiVetokProektov: {},
        };
    },

    getters: {
        /** Реквизиты для выпадающего списка. */
        rekvizity(): Schema<"OpenCodeCredential">[] {
            return useStorSpiskaRekvizitovOpenCode().spisok;
        },

        /** Полные реквизиты выбранного ключа (с моделями провайдера). */
        vybrannieRekvizity(state): RekvizityOpenCode | null {
            return useStorSpiskaRekvizitovOpenCode().rekvizityPoId(state.credentialId);
        },

        /** Модели, доступные для выбранных реквизитов. */
        dostupnieModeli(): string[] {
            return modeliRekvizitov(this.vybrannieRekvizity);
        },

        /** Модель по умолчанию выбранных реквизитов. */
        modelPoUmolchaniyu(): string {
            return modelPoUmolchaniyu(this.vybrannieRekvizity);
        },

        /**
         * Выбранные проекты, для которых нет личного токена с правом push.
         *
         * Создание локальной ветки требует токена, привязанного к тому же
         * репозиторию, что и проект. Проект, отсутствующий в загруженном
         * списке, считаем непокрытым: проверить `repoId` нельзя.
         */
        proektiBezPushTokena(state): string[] {
            return state.projectIds.filter((projectId) => {
                const proekt = state.proekti.find((item) => item.id === projectId);

                if (!proekt) {
                    return true;
                }

                return !estTokenSPushomProekta(state.tokeni.spisok, {
                    id: proekt.id,
                    repoId: proekt.repoId,
                });
            });
        },

        /**
         * Сохранение возможно, когда заполнены обязательные поля, выбран
         * хотя бы один проект в пределах лимита, у каждого проекта задана
         * базовая ветка, имя локальной ветки корректно и есть токен с
         * правом push для всех выбранных проектов.
         */
        mozhnoSohranit(state): boolean {
            if (state.loader
                || state.credentialId === ""
                || state.name.trim() === ""
                || state.prompt.trim() === ""
                || state.projectIds.length < 1
                || state.projectIds.length > MAX_PROEKTOV_WORKSPACE) {
                return false;
            }

            const vetkiZapolneni = state.projectIds.every((projectId) => {
                const bazovaya = (state.bazovieVetki[projectId] ?? "").trim();
                const lokalnaya = state.lokalnieVetki[projectId] ?? "";

                return bazovaya !== "" && proveritNazvanieVetki(lokalnaya) === "";
            });

            if (!vetkiZapolneni) {
                return false;
            }

            return this.proektiBezPushTokena.length === 0;
        },
    },

    actions: {
        /** Открыть диалог с чистой формой. */
        otkrit() {
            const rekvizity = useStorSpiskaRekvizitovOpenCode().spisok;
            const pervaya = rekvizity.length > 0 ? rekvizity[0] : null;

            this.otkrita = true;
            this.name = "";
            this.credentialId = pervaya?.id ?? "";
            this.model = modelPoUmolchaniyu(pervaya);
            this.projectIds = [];
            this.files = [];
            this.zagruzkaFaylov = false;
            this.oshibkaFaylov = null;
            this.prompt = "";
            this.oshibkaOtBackenda = null;
            this.loader = false;
            this.bazovieVetki = {};
            this.lokalnieVetki = {};
            this.etapSozdaniya = null;
            this.tokeni.spisok = [];
            this.tokeni.loader = false;
            this.vetkiProektov = {};
            this.oshibkiVetokProektov = {};
            posledniyZaprosVetok.clear();

            // Токены нужны для проверки прав на создание веток: грузим их
            // при открытии формы, не блокируя её.
            void this.zagruzitTokeni();

            if (this.proekti.length === 0) {
                void this.poluchitProekti();
            }
        },

        zakrit() {
            this.otkrita = false;
            this.oshibkaOtBackenda = null;
            this.loader = false;
            this.etapSozdaniya = null;
        },

        /**
         * Сменить реквизиты и сбросить модель на их дефолт.
         *
         * Модель предыдущих реквизитов может быть недоступна новым, поэтому
         * при смене ключа выбор всегда сбрасывается на `defaultModel`.
         */
        ustanovitRekvizity(credentialId: string) {
            this.credentialId = credentialId;
            this.model = modelPoUmolchaniyu(
                useStorSpiskaRekvizitovOpenCode().rekvizityPoId(credentialId),
            );
        },

        /** Записать выбранную модель; `null` очищает выбор до дефолта. */
        ustanovitModel(model: string | null) {
            this.model = model ?? "";
        },

        /**
         * Загрузить личные токены пользователя.
         *
         * Ошибка загрузки не блокирует форму: она лишь оставляет список
         * токенов пустым, из-за чего кнопка сохранения блокируется
         * геттером `proektiBezPushTokena`.
         */
        async zagruzitTokeni(): Promise<void> {
            this.tokeni.loader = true;

            try {
                const response = await LichniyTokenService.spisok();

                if (response.status === "success") {
                    this.tokeni.spisok = response.data;
                } else {
                    this.tokeni.spisok = [];
                }
            } catch {
                this.tokeni.spisok = [];
            } finally {
                this.tokeni.loader = false;
            }
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

        /** Загрузить файл workspace как черновик. */
        async zagruzitFayl(file: File): Promise<void> {
            this.zagruzkaFaylov = true;
            this.oshibkaFaylov = null;

            try {
                const response = await MediatekaService.zagruzitChernovikWorkspace(file);

                if (response.status === "success") {
                    this.files = [...this.files, response.data];
                    return;
                }

                this.oshibkaFaylov = response.status === "fail"
                    ? response.data.message
                    : response.message;
            } finally {
                this.zagruzkaFaylov = false;
            }
        },

        /** Удалить ранее загруженный черновик файла workspace. */
        async udalitFayl(fileId: string): Promise<void> {
            const response = await MediatekaService.udalitFayl(fileId);

            if (response.status === "success") {
                this.files = this.files.filter((file) => file.id !== fileId);
            }
        },

        /**
         * Включить или выключить проект в форме.
         *
         * При включении проекту сразу задаётся базовая ветка по умолчанию
         * (`mainBranch`) и пустое имя локальной ветки. При выключении
         * данные проекта удаляются из всех map'ов.
         */
        perekluchitProekt(id: string, vklyuchen: boolean) {
            const est = this.projectIds.includes(id);

            if (vklyuchen) {
                if (!est) {
                    this.projectIds = [...this.projectIds, id];
                }

                const proekt = this.proekti.find((item) => item.id === id);
                this.bazovieVetki[id] = proekt?.mainBranch ?? "";
                this.lokalnieVetki[id] = "";

                return;
            }

            if (est) {
                this.projectIds = this.projectIds.filter((projectId) => projectId !== id);
            }

            delete this.bazovieVetki[id];
            delete this.lokalnieVetki[id];
        },

        /** Записать или очистить базовую ветку проекта. */
        ustanovitBazovuyuVetku(projectId: string, vetka: string | null) {
            if (!projectId) {
                return;
            }

            if (vetka === null || vetka.trim() === "") {
                delete this.bazovieVetki[projectId];
            } else {
                this.bazovieVetki[projectId] = vetka;
            }
        },

        /** Записать или очистить имя локальной ветки проекта. */
        ustanovitLokalnuyuVetku(projectId: string, nazvanie: string | null) {
            if (!projectId) {
                return;
            }

            if (nazvanie === null || nazvanie.trim() === "") {
                delete this.lokalnieVetki[projectId];
            } else {
                this.lokalnieVetki[projectId] = nazvanie;
            }
        },

        /**
         * Сбросить данные для снятых проектов и подготовить новые.
         *
         * Вызывается после изменения `projectIds`: держим в памяти только
         * ветки выбранных проектов. Для проектов, появившихся в списке
         * выбора, выставляем базовую ветку по умолчанию.
         */
        sbalansirovatVetkiProektov() {
            const vibran = new Set(this.projectIds);

            Object.keys(this.bazovieVetki).forEach((projectId) => {
                if (!vibran.has(projectId)) {
                    delete this.bazovieVetki[projectId];
                }
            });

            Object.keys(this.lokalnieVetki).forEach((projectId) => {
                if (!vibran.has(projectId)) {
                    delete this.lokalnieVetki[projectId];
                }
            });

            Object.keys(this.vetkiProektov).forEach((projectId) => {
                if (!vibran.has(projectId)) {
                    delete this.vetkiProektov[projectId];
                    delete this.oshibkiVetokProektov[projectId];
                    posledniyZaprosVetok.delete(projectId);
                }
            });

            // Новые проекты в выбранном списке получают значения по умолчанию.
            this.projectIds.forEach((projectId) => {
                if (!(projectId in this.bazovieVetki)) {
                    const proekt = this.proekti.find((item) => item.id === projectId);
                    this.bazovieVetki[projectId] = proekt?.mainBranch ?? "";
                }

                if (!(projectId in this.lokalnieVetki)) {
                    this.lokalnieVetki[projectId] = "";
                }
            });
        },

        /**
         * Создать workspace в два этапа.
         *
         * 1. Последовательно создать локальные ветки во всех выбранных
         *    проектах через `POST /project/sozdatVetku`.
         * 2. Создать workspace, передав для каждого проекта переопределение
         *    ветки (`projectBranches`); общая `branch` бэкендом игнорируется,
         *    но обязана быть непустой — передаём первую локальную ветку.
         *
         * ВАЖНО: эндпоинта удаления ветки нет. Если часть веток уже создана,
         * а следующая упала — созданные останутся в хранилище. Повторный
         * сабмит с теми же именами получит ошибку «уже существует», и
         * пользователю придётся переименовать локальные ветки. Это известное
         * ограничение контракта.
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

            try {
                // Фаза 1: создание локальных веток во всех проектах.
                this.etapSozdaniya = "vetki";

                for (const projectId of this.projectIds) {
                    const response = await ProektiService.sozdatVetku({
                        projectId,
                        nazvanie: (this.lokalnieVetki[projectId] ?? "").trim(),
                        otVetki: (this.bazovieVetki[projectId] ?? "").trim(),
                    });

                    if (response.status !== "success") {
                        const message = response.status === "fail"
                            ? response.data.message
                            : response.message;
                        const imya = this.proekti.find(
                            (proekt) => proekt.id === projectId,
                        )?.name ?? projectId;

                        this.oshibkaOtBackenda = `${imya}: ${message}`;

                        return null;
                    }
                }

                // Фаза 2: создание workspace с готовыми ветками.
                this.etapSozdaniya = "workspace";

                const payload: Schema<"SozdatWorkspace"> & {
                    model?: string | null;
                    fileIds?: string[];
                } = {
                    name: this.name.trim(),
                    credentialId: this.credentialId,
                    projectIds: [...this.projectIds],
                    fileIds: this.files.map((file) => file.id),
                    prompt: this.prompt.trim(),
                    // Пустую модель не отправляем: бэкенд возьмёт дефолт реквизитов.
                    model: normalizovatModel(this.model) ?? undefined,
                    // Все проекты получают переопределение, поэтому общая
                    // ветка бэкендом игнорируется; поле обязано быть непустым.
                    branch: (this.lokalnieVetki[this.projectIds[0]] ?? "").trim(),
                    projectBranches: this.projectIds.map((projectId) => ({
                        projectId,
                        branch: (this.lokalnieVetki[projectId] ?? "").trim(),
                    })),
                };

                const response = await OpenCodeService.sozdatWorkspace(payload);

                if (response.status === "success") {
                    this.otkrita = false;

                    return response.data.id;
                }

                this.oshibkaOtBackenda = response.status === "fail"
                    ? response.data.message
                    : response.message;

                return null;
            } finally {
                this.loader = false;
                this.etapSozdaniya = null;
            }
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
