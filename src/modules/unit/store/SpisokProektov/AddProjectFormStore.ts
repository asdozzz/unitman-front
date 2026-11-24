import {defineStore} from "pinia";
import ProektiService from "@/modules/unit/services/ProektiService";
import HranilishaService from "@/modules/unit/services/HranilishaService";
import type {Schema} from "@/api/types";

export class AddForm {
    repoId: string;
    projectName: string;
    projectCode: string;
    mainBranch: string;
    memoryLimit: number;
    zashishennieVetki: string[] = [];
    constructor(repoId: string = "", projectName: string = "", projectCode: string = "", mainBranch: string = "master", memoryLimit: number | null = null) {
        this.repoId = repoId;
        this.projectName = projectName;
        this.projectCode = projectCode;
        this.mainBranch = mainBranch;
        this.memoryLimit = memoryLimit ?? 0;
    }
}

class Hranilishe {
    value: string;
    label: string;

    constructor(value: string, label: string) {
        this.value = value;
        this.label = label;
    }
}

class Proekt {
    value: string;
    label: string;

    constructor(value: string, label: string) {
        this.value = value;
        this.label = label;
    }
}

class Vetka {
    value: string;
    label: string;

    constructor(value: string, label: string) {
        this.value = value;
        this.label = label;
    }
}

type AddFormState = {
    enable: boolean;
    form:AddForm;
    loader: boolean;
    oshibkaOtBackenda: string | null;
    hranilisha: {
        spisok: Hranilishe[];
        loader: boolean;
    },
    proekti: {
        spisok: Proekt[];
        loader: boolean;
    },
    vetki: {
        spisok: Vetka[];
        loader: boolean;
        query: string;
    },
}

/**
 * Номер последнего запроса списка проектов.
 *
 * Нужен, чтобы поздний ответ на запрос, отправленный для другого репозитория,
 * не перезаписал актуальный список. Каждый новый запрос (и каждый сброс)
 * увеличивает счётчик, а устаревшие ответы игнорируются.
 */
let nomerZaprosaProektov = 0;

/**
 * Номер последнего запроса списка веток хранилища.
 *
 * Аналогичен `nomerZaprosaProektov`: защищает от перезаписи актуального
 * списка поздним ответом по другому репозиторию/проекту или по другому
 * поисковому запросу.
 */
let nomerZaprosaVetok = 0;

export const useAddProjectFormStore = defineStore('AddProjectFormState', {
    state: (): AddFormState => {
        return {
            enable: false,
            form: new AddForm(),
            loader: false,
            oshibkaOtBackenda: null,
            hranilisha: {
                spisok: [],
                loader: false
            },
            proekti: {
                spisok: [],
                loader: false
            },
            vetki: {
                spisok: [],
                loader: false,
                query: ""
            },
        }
    },
    actions: {
        otkritFormu() {
            this.form = new AddForm();
            this.enable = true;
            this.oshibkaOtBackenda = null;
            this.loader = false;
            this.sbrositProekti();
            this.sbrositVetki();
        },
        zakritFormu() {
            this.form = new AddForm();
            this.enable = false;
            this.loader = false;
            this.sbrositProekti();
            this.sbrositVetki();
        },
        /** Очистить список проектов и отменить учёт незавершённых запросов. */
        sbrositProekti() {
            nomerZaprosaProektov += 1;
            this.proekti.spisok = [];
            this.proekti.loader = false;
        },
        /** Очистить список веток хранилища и отменить учёт незавершённых запросов. */
        sbrositVetki() {
            nomerZaprosaVetok += 1;
            this.vetki.spisok = [];
            this.vetki.loader = false;
            this.vetki.query = "";
        },
        async poluchitActivnieHranilisha() {
            this.hranilisha.loader = true;
            this.hranilisha.spisok = [];
            const response = await HranilishaService.poluchitSpisokActivnih();

            this.hranilisha.loader = false;
            if (response.status === "success") {
                this.hranilisha.spisok = response.data.map((item: Schema<"Repo">) => ({value: item.id, label: item.name}));
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }
        },
        /**
         * Загрузить все проекты выбранного репозитория.
         *
         * Список загружается один раз при выборе репозитория, а поиск по нему
         * выполняется локально в GhSelect. Поэтому опции не очищаются перед
         * запросом: иначе QSelect теряет выбранное значение и повторно
         * запускает фильтрацию, что приводило к бесконечным запросам.
         */
        async poluchitProektiRepi() {
            const repoId = this.form.repoId;

            if (!repoId) {
                this.sbrositProekti();
                return;
            }

            const nomerZaprosa = ++nomerZaprosaProektov;
            this.oshibkaOtBackenda = null;
            this.proekti.loader = true;

            try {
                const response = await HranilishaService.poluchitProektiHranilisha({id: repoId});

                if (nomerZaprosa !== nomerZaprosaProektov) {
                    return;
                }

                if (response.status === "success") {
                    this.proekti.spisok = response.data.map((item: Schema<"RepoProject">) => new Proekt(item.value, item.name));
                } else if (response.status === "fail") {
                    this.oshibkaOtBackenda = response.data.message;
                } else if (response.status === "error") {
                    this.oshibkaOtBackenda = response.message;
                }
            } catch (oshibka) {
                if (nomerZaprosa === nomerZaprosaProektov) {
                    this.oshibkaOtBackenda = oshibka instanceof Error ? oshibka.message : String(oshibka);
                }
            } finally {
                if (nomerZaprosa === nomerZaprosaProektov) {
                    this.proekti.loader = false;
                }
            }
        },
        /**
         * Загрузить ветки проекта напрямую из хранилища.
         *
         * Проект в Unitman ещё не создан, поэтому ветки запрашиваются по паре
         * «репозиторий + код проекта». Поиск выполняется на сервере через
         * `query` (как в форме создания юнита).
         */
        async poluchitVetkiHranilisha() {
            const repoId = this.form.repoId;
            const projectCode = this.form.projectCode;

            if (!repoId || !projectCode) {
                this.sbrositVetki();
                return;
            }

            const nomerZaprosa = ++nomerZaprosaVetok;
            this.vetki.loader = true;

            try {
                const response = await ProektiService.poluchitVetkiHranilisha({
                    repoId,
                    projectCode,
                    query: this.vetki.query || null,
                });

                if (nomerZaprosa !== nomerZaprosaVetok) {
                    return;
                }

                if (response.status === "success") {
                    this.vetki.spisok = response.data.map((item: Schema<"ProjectBranch">) => new Vetka(item.name, item.name));
                } else if (response.status === "fail") {
                    this.oshibkaOtBackenda = response.data.message;
                } else if (response.status === "error") {
                    this.oshibkaOtBackenda = response.message;
                }
            } catch (oshibka) {
                if (nomerZaprosa === nomerZaprosaVetok) {
                    this.oshibkaOtBackenda = oshibka instanceof Error ? oshibka.message : String(oshibka);
                }
            } finally {
                if (nomerZaprosa === nomerZaprosaVetok) {
                    this.vetki.loader = false;
                }
            }
        },
        async otpravitFormu() {
            this.loader = true;
            const response = await ProektiService.add(this.form);

            this.loader = false;
            if (response.status === "success") {
                this.oshibkaOtBackenda = null;
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }

            return response;
        }
    }
})
