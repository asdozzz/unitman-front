import { defineStore } from "pinia";
import OpenCodeCredentialService from "@/modules/account/services/OpenCodeCredentialService";
import {
    etoKodProvayderaOpenCode,
    type IstochnikModeleiOpenCode,
    type KodProvayderaOpenCode,
    type ProvayderOpenCode,
    type RekvizityOpenCode,
    type ZaprosIzmeneniyaRekvizitovOpenCode,
} from "@/modules/account/store/SpisokRekvizitovOpenCode/model/OpenCodeRekvizity";

/** Провайдер по умолчанию для новых реквизитов (совпадает с прежним URL). */
const PROVAYDER_PO_UMOLCHANIYU: KodProvayderaOpenCode = "opencode";
const BASE_URL_PO_UMOLCHANIYU = "https://api.opencode.ai";

/** Убирает пустые значения и дубликаты, сохраняя порядок. */
function unikalnieModeli(models: string[]): string[] {
    const rezultat: string[] = [];

    for (const model of models) {
        const znachenie = model.trim();

        if (znachenie !== "" && !rezultat.includes(znachenie)) {
            rezultat.push(znachenie);
        }
    }

    return rezultat;
}

/**
 * Поля формы реквизитов.
 *
 * `apiKey` наружу не отдаётся и при изменении может быть пустым (пустое
 * значение означает «оставить прежний ключ»).
 */
export class FormaRekvizitovOpenCode {
    name: string;
    provider: KodProvayderaOpenCode;
    url: string;
    models: string[];
    defaultModel: string;
    apiKey: string;

    constructor(
        name: string = "",
        provider: KodProvayderaOpenCode = PROVAYDER_PO_UMOLCHANIYU,
        url: string = BASE_URL_PO_UMOLCHANIYU,
        models: string[] = [],
        defaultModel: string = "",
        apiKey: string = "",
    ) {
        this.name = name;
        this.provider = provider;
        this.url = url;
        this.models = models;
        this.defaultModel = defaultModel;
        this.apiKey = apiKey;
    }
}

export type SostoyanieFormiRekvizitovOpenCode = {
    /** `null` — форма закрыта; пустая строка — создание; иначе id изменяемых реквизитов. */
    redaktiruemiId: string | null;
    forma: FormaRekvizitovOpenCode;
    loader: boolean;
    oshibkaOtBackenda: string | null;
    /** Подсказка по существующей маске ключа при изменении. */
    maskaTekushegoKlyucha: string | null;

    /** Каталог провайдеров с бэкенда. */
    provaydery: ProvayderOpenCode[];
    zagruzkaProvayderov: boolean;
    oshibkaProvayderov: string | null;
    /** Провайдер, для которого в форме заполнен `baseUrl` — для автоподстановки. */
    posledniyProvayder: KodProvayderaOpenCode | null;

    /** Модели, полученные live-запросом или из статического списка каталога. */
    dostupnieModeli: string[];
    zagruzkaModelei: boolean;
    istochnikModelei: IstochnikModeleiOpenCode | null;
    /** `errorKey` бэкенда либо текст ошибки транспорта. */
    oshibkaModelei: string | null;
    /** HTTP-статус ответа провайдера; null, если ответа не было. */
    statusModelei: number | null;
};

export const useFormaRekvizitovOpenCodeStore = defineStore('FormaRekvizitovOpenCodeStore', {
    state: (): SostoyanieFormiRekvizitovOpenCode => {
        return {
            redaktiruemiId: null,
            forma: new FormaRekvizitovOpenCode(),
            loader: false,
            oshibkaOtBackenda: null,
            maskaTekushegoKlyucha: null,
            provaydery: [],
            zagruzkaProvayderov: false,
            oshibkaProvayderov: null,
            posledniyProvayder: null,
            dostupnieModeli: [],
            zagruzkaModelei: false,
            istochnikModelei: null,
            oshibkaModelei: null,
            statusModelei: null,
        };
    },
    getters: {
        /** `true`, когда открыто создание новых реквизитов. */
        etoSozdanie: (state): boolean => state.redaktiruemiId === "",
        otkrita: (state): boolean => state.redaktiruemiId !== null,

        /** Выбранный провайдер из каталога (если уже загружен). */
        tekuschiyProvayder: (state): ProvayderOpenCode | null =>
            state.provaydery.find((provayder) => provayder.code === state.forma.provider) ?? null,

        /** Для `custom` URL вводится вручную, для известных провайдеров — из каталога. */
        etoCustom: (state): boolean => state.forma.provider === "custom",

        /**
         * Ручной ввод моделей: провайдер не поддерживает live-список либо
         * последний запрос завершился ошибкой и вернул `source: manual`.
         */
        ruchnoyRezhimModelei: (state): boolean => {
            if (state.istochnikModelei === "manual") {
                return true;
            }

            const provayder = state.provaydery.find(
                (item) => item.code === state.forma.provider,
            );

            return provayder !== undefined && !provayder.supportsModelList;
        },

        /**
         * Live-список моделей можно запросить, если провайдер это поддерживает
         * и у нас есть ключ: сохранённый (режим изменения) либо введённый.
         */
        mozhnoZagruzitModeli: (state): boolean => {
            const provayder = state.provaydery.find(
                (item) => item.code === state.forma.provider,
            );

            if (provayder === undefined || !provayder.supportsModelList) {
                return false;
            }

            return state.redaktiruemiId !== "" || state.forma.apiKey.trim() !== "";
        },

        /**
         * Модели заблокированы, пока нет ключа: при создании ключ обязателен и
         * запрашивать список без него бессмысленно; при изменении ключ уже
         * сохранён на бэкенде, поэтому поле остаётся доступным.
         */
        modeliZablokirovany: (state): boolean =>
            state.redaktiruemiId === "" && state.forma.apiKey.trim() === "",

        /** Опции для GhSelect моделей: live-ответ + уже выбранные вручную. */
        modeliDlyaVibora: (state): string[] =>
            unikalnieModeli([
                ...state.dostupnieModeli,
                ...state.forma.models,
            ]),

        mozhnoSohranit: (state): boolean => {
            if (state.loader) {
                return false;
            }

            const models = unikalnieModeli(state.forma.models);
            const estImya = state.forma.name.trim() !== "";
            const estUrl = state.forma.url.trim() !== "";
            const estModeli = models.length > 0;
            const defoltVhodyt = models.includes(state.forma.defaultModel.trim());
            const estKlyuch = state.forma.apiKey.trim() !== "";

            // Ключ обязателен только при создании: при изменении пустое поле — «не менять».
            return (
                estImya &&
                estUrl &&
                estModeli &&
                defoltVhodyt &&
                (estKlyuch || state.redaktiruemiId !== "")
            );
        },
    },
    actions: {
        otkritSozdanie() {
            this.redaktiruemiId = "";
            this.forma = new FormaRekvizitovOpenCode();
            this.posledniyProvayder = PROVAYDER_PO_UMOLCHANIYU;
            this.maskaTekushegoKlyucha = null;
            this.oshibkaOtBackenda = null;
            this.sbrositSostoyanieModelei();
        },

        /**
         * Открытие формы на изменение.
         *
         * Из списка известна только маска ключа, поэтому `apiKey` остаётся
         * пустым: пустое значение бэкенд трактует как «оставить прежний ключ».
         */
        otkritIzmenenie(rekvizity: RekvizityOpenCode) {
            const provider: KodProvayderaOpenCode = etoKodProvayderaOpenCode(rekvizity.provider)
                ? rekvizity.provider
                : "custom";
            const models = unikalnieModeli(rekvizity.models);
            const defaultModel = models.includes(rekvizity.defaultModel)
                ? rekvizity.defaultModel
                : (models[0] ?? "");

            this.redaktiruemiId = rekvizity.id;
            this.forma = new FormaRekvizitovOpenCode(
                rekvizity.name,
                provider,
                rekvizity.url,
                models,
                defaultModel,
                "",
            );
            this.posledniyProvayder = provider;
            this.maskaTekushegoKlyucha = rekvizity.apiKeyHint;
            this.oshibkaOtBackenda = null;
            this.sbrositSostoyanieModelei();
            void this.avtozagruzitModeli();
        },

        zakrit() {
            this.redaktiruemiId = null;
            this.forma = new FormaRekvizitovOpenCode();
            this.posledniyProvayder = null;
            this.maskaTekushegoKlyucha = null;
            this.oshibkaOtBackenda = null;
            this.sbrositSostoyanieModelei();
        },

        sbrositSostoyanieModelei() {
            this.dostupnieModeli = [];
            this.zagruzkaModelei = false;
            this.istochnikModelei = null;
            this.oshibkaModelei = null;
            this.statusModelei = null;
        },

        /** Загрузка каталога провайдеров (кэшируется до принудительного обновления). */
        async zagruzitProvayderov(prinuditelno: boolean = false) {
            if (this.zagruzkaProvayderov) {
                return null;
            }

            if (!prinuditelno && this.provaydery.length > 0) {
                return null;
            }

            this.zagruzkaProvayderov = true;
            const response = await OpenCodeCredentialService.providers();

            if (response.status === "success") {
                this.provaydery = response.data;
                this.oshibkaProvayderov = null;
                this.sinhronizirovatUrlPosleZagruzki();
            } else if (response.status === "fail") {
                this.oshibkaProvayderov = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaProvayderov = response.message;
            }

            this.zagruzkaProvayderov = false;

            // Автозагрузка моделей — после сброса флага каталога: иначе
            // собственный guard `avtozagruzitModeli` видит активную загрузку
            // каталога и молча пропускает запрос.
            if (response.status === "success") {
                await this.avtozagruzitModeli();
            }

            return response;
        },

        /**
         * Если каталог пришёл позже открытия формы, подставляет `baseUrl`
         * провайдера, когда поле URL пустое или равно дефолтному значению.
         */
        sinhronizirovatUrlPosleZagruzki() {
            if (this.posledniyProvayder !== null) {
                return;
            }

            const provayder = this.tekuschiyProvayder;

            if (provayder !== null && provayder.code !== "custom" && provayder.baseUrl !== "") {
                if (this.forma.url.trim() === "" || this.forma.url.trim() === BASE_URL_PO_UMOLCHANIYU) {
                    this.forma.url = provayder.baseUrl;
                }

                // В сгенерированной схеме `code` — просто `string`; форма хранит
                // известный код, поэтому сужаем тип без изменения поведения.
                if (etoKodProvayderaOpenCode(provayder.code)) {
                    this.posledniyProvayder = provayder.code;
                }
            }
        },

        /**
         * Смена провайдера.
         *
         * `baseUrl` подставляется из каталога, если поле пустое или совпадает с
         * URL предыдущего провайдера. Для `custom` поле очищается и вводится
         * вручную. Дефолтная модель сбрасывается на первую из выбранных.
         */
        vybratProvaydera(kod: string | number | null | Array<string | number>) {
            if (typeof kod !== "string" || !etoKodProvayderaOpenCode(kod)) {
                return;
            }

            if (kod === this.forma.provider) {
                return;
            }

            const stariyProvayder = this.tekuschiyProvayder;
            const noviyProvayder = this.provaydery.find((provayder) => provayder.code === kod) ?? null;
            const stariyBaseUrl = stariyProvayder?.baseUrl ?? BASE_URL_PO_UMOLCHANIYU;
            const urlMozhnoZamenit =
                this.forma.url.trim() === "" || this.forma.url.trim() === stariyBaseUrl;

            this.forma.provider = kod;

            if (kod === "custom") {
                if (urlMozhnoZamenit) {
                    this.forma.url = "";
                }
            } else if (noviyProvayder !== null && urlMozhnoZamenit) {
                this.forma.url = noviyProvayder.baseUrl;
            }

            // Модели предыдущего провайдера к новому не относятся.
            this.forma.models = [];
            this.forma.defaultModel = "";
            this.posledniyProvayder = kod;
            this.sbrositSostoyanieModelei();

            void this.avtozagruzitModeli();
        },

        /**
         * Автоматическая загрузка live-списка, когда это возможно.
         *
         * Вызывается при открытии изменения, после загрузки каталога и при
         * смене провайдера. Повторный ручной запрос доступен отдельной кнопкой.
         */
        async avtozagruzitModeli(): Promise<void> {
            if (this.zagruzkaModelei || !this.mozhnoZagruzitModeli) {
                return;
            }

            await this.zagruzitModeli();
        },

        /**
         * Загрузка моделей у провайдера.
         *
         * При ошибке провайдера бэкенд отвечает HTTP 200 со статическим списком
         * и `errorKey` — форма не блокируется, ручной ввод сохраняется.
         */
        async zagruzitModeli() {
            if (this.zagruzkaModelei) {
                return null;
            }

            this.zagruzkaModelei = true;
            this.oshibkaModelei = null;
            this.statusModelei = null;

            const apiKey = this.forma.apiKey.trim();
            const credentialId = this.redaktiruemiId !== null && this.redaktiruemiId !== ""
                ? this.redaktiruemiId
                : null;

            const response = await OpenCodeCredentialService.spisokModelei({
                provider: this.forma.provider,
                // Введённый ключ приоритетнее сохранённых реквизитов: при смене
                // провайдера прежний ключ может не подходить, и список нужно
                // запрашивать именно новым ключом.
                ...(apiKey !== "" ? { apiKey } : {}),
                ...(apiKey === "" && credentialId !== null ? { credentialId } : {}),
            });

            if (response.status === "success") {
                this.dostupnieModeli = unikalnieModeli(response.data.models);
                this.istochnikModelei = response.data.source;
                this.oshibkaModelei = response.data.errorKey;
                this.statusModelei = response.data.providerStatus ?? null;

                // Live-модели не выбираются автоматически: пользователь
                // отмечает нужные сам. В manual-режиме дефолт появляется
                // после добавления первой модели.
                if (this.forma.defaultModel === "" && this.forma.models.length > 0) {
                    this.forma.defaultModel = this.forma.models[0] ?? "";
                }
            } else if (response.status === "fail") {
                this.oshibkaModelei = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaModelei = response.message;
            }

            this.zagruzkaModelei = false;

            return response;
        },

        /** Ручное добавление модели (без дублей и пустых значений). */
        dobavitModel(model: string) {
            const znachenie = model.trim();

            if (znachenie === "") {
                return;
            }

            this.forma.models = unikalnieModeli([...this.forma.models, znachenie]);

            if (!this.dostupnieModeli.includes(znachenie)) {
                this.dostupnieModeli = [...this.dostupnieModeli, znachenie];
            }

            if (this.forma.defaultModel === "") {
                this.forma.defaultModel = znachenie;
            }
        },

        /** Удаление модели; дефолт переезжает на первую оставшуюся. */
        udalitModel(model: string) {
            this.forma.models = this.forma.models.filter((znachenie) => znachenie !== model);

            if (this.forma.defaultModel === model) {
                this.forma.defaultModel = this.forma.models[0] ?? "";
            }
        },

        /**
         * Сохранение формы.
         *
         * При изменении в запрос попадают всегда провайдер, URL, модели и
         * дефолт; `apiKey` — только если заполнен.
         */
        async sohranit() {
            if (this.redaktiruemiId === null) {
                return null;
            }

            this.loader = true;
            this.oshibkaOtBackenda = null;

            const models = unikalnieModeli(this.forma.models);
            const defaultModel = models.includes(this.forma.defaultModel)
                ? this.forma.defaultModel
                : (models[0] ?? "");
            const url = this.forma.url.trim();

            const response = this.redaktiruemiId === ""
                ? await OpenCodeCredentialService.sozdatRekvizity({
                    name: this.forma.name.trim(),
                    provider: this.forma.provider,
                    url,
                    models,
                    defaultModel,
                    apiKey: this.forma.apiKey.trim(),
                    model: defaultModel,
                })
                : await OpenCodeCredentialService.izmenitRekvizity(
                    this.sostavitIzmenenie(models, defaultModel, url),
                );

            if (response.status === "success") {
                this.zakrit();
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }

            this.loader = false;

            return response;
        },

        /** Тело частичного изменения: ключ отправляется только заполненным. */
        sostavitIzmenenie(
            models: string[],
            defaultModel: string,
            url: string,
        ): ZaprosIzmeneniyaRekvizitovOpenCode {
            const parametry: ZaprosIzmeneniyaRekvizitovOpenCode = {
                id: this.redaktiruemiId ?? "",
                provider: this.forma.provider,
                url,
                models,
                defaultModel,
                model: defaultModel,
            };

            const name = this.forma.name.trim();

            if (name !== "") {
                parametry.name = name;
            }

            // Пустой ключ означает «оставить прежний», поэтому поле не отправляется.
            const apiKey = this.forma.apiKey.trim();

            if (apiKey !== "") {
                parametry.apiKey = apiKey;
            }

            return parametry;
        },
    },
});
