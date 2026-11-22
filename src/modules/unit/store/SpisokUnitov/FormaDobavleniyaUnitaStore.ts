import {defineStore} from "pinia";
import ProektiService from "@/modules/unit/services/ProektiService";
import UnitiService from "@/modules/unit/services/UnitiService";
import MediatekaService from "@/modules/unit/services/MediatekaService";
import VolumeTypesService from "@/modules/unit/services/VolumeTypesService";
import LichniyTokenService from "@/modules/account/services/LichniyTokenService";
import type {Schema} from "@/api/types";
import type {Unit, TomKonfiga, TomUnita} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import {PeremenayaKonfiga, sozdatTomUnita} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import type {FaylTipaToma, TipToma} from "@/modules/unit/store/SpisokProektov/model/TipToma";
import {useSpisokUnitovStore} from "@/modules/unit/store/SpisokUnitovStore";
import {soderzhitZashishennuyuVetku} from "@/modules/unit/utils/zashishennieVetki";
import {estTokenSPushomProekta} from "@/modules/unit/utils/lichnieTokeni";

export class FormaDobavleniyaUnita {
    projectId: string;
    unitName: string;
    branch: string;
    memoryLimit: number;
    peremenieKonfiga: PeremenayaKonfiga[];
    /**
     * Тома из блока конфига `unitman_volumes` с состоянием загрузки файлов.
     *
     * Иды загруженных черновиков живут в `volumes[].volume.fileId`: отдельный
     * список `fileIds` не нужен, потому что бэкенд принимает ид файла прямо
     * в томе (`SozdatUnit.volumes`).
     */
    volumes: TomUnita[];

    constructor(
        projectId: string = "",
        unitName: string = "",
        branch: string = "",
        memoryLimit: number = 3072,
        peremenieKonfiga: PeremenayaKonfiga[] = [],
        volumes: TomUnita[] = [],
    ) {
        this.projectId = projectId;
        this.unitName = unitName;
        this.branch = branch;
        this.peremenieKonfiga = peremenieKonfiga;
        this.volumes = volumes;
        this.memoryLimit = memoryLimit;
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

type FormaDobavleniyaUnitaState = {
    enable: boolean;
    form:FormaDobavleniyaUnita;
    loader: boolean;
    oshibkaOtBackenda: string | null;
    initPeremenie: boolean;

    vetki: {
        query: string | null;
        spisok: Vetka[];
        loader: boolean;
    },
    polucheniePeremenih: {
        loader: boolean;
    },
    dubli: {
        loader: boolean;
        spisok: Unit[];
    },
    /** Личные токены пользователя для проверки прав на создание ветки. */
    tokeni: {
        spisok: Schema<"LichniyTokenPublic">[];
        loader: boolean;
        oshibka: string | null;
    },
    /** Открыт ли диалог создания новой ветки. */
    dialogOtkrit: boolean;
    /** Данные формы диалога создания ветки. */
    novayaVetka: {
        nazvanie: string;
        osnova: string;
    };
    /** Идёт ли создание ветки через хранилище. */
    loaderSozdaniyaVetki: boolean;
    /** Ошибка создания ветки для показа в диалоге. */
    oshibkaSozdaniyaVetki: string | null;
}


export const useFormaDobavleniyaUnitaStore = defineStore('FormaDobavleniyaUnitaStore', {
    state: (): FormaDobavleniyaUnitaState => {
        return {
            enable: false,
            form: new FormaDobavleniyaUnita(),
            loader: false,
            oshibkaOtBackenda: null,
            initPeremenie: false,

            vetki: {
                query: null,
                spisok: [],
                loader: false
            },
            polucheniePeremenih: {
                loader: false
            },
            dubli: {
                loader: false,
                spisok: []
            },
            tokeni: {
                spisok: [],
                loader: false,
                oshibka: null,
            },
            dialogOtkrit: false,
            novayaVetka: {
                nazvanie: "",
                osnova: "",
            },
            loaderSozdaniyaVetki: false,
            oshibkaSozdaniyaVetki: null,
        }
    },
    getters: {
        /**
         * Попадает ли выбранная в форме ветка под маски защищённых веток
         * выбранного проекта.
         *
         * Геттер реактивен: пересчитывается при смене проекта, ветки или
         * загрузке списка проектов. Используется только для информационного
         * предупреждения — отправку формы не блокирует.
         */
        vetkaZashishenaDlyaFormi(state): boolean {
            if (!state.form.projectId || !state.form.branch) {
                return false;
            }

            const proekt = useSpisokUnitovStore().proekti.spisok.find(
                (item) => item.value === state.form.projectId,
            );

            if (!proekt) {
                return false;
            }

            return soderzhitZashishennuyuVetku(proekt.zashishennieVetki, state.form.branch) !== null;
        },
        /**
         * Есть ли у пользователя личный токен, который покрывает выбранный
         * проект и привязан к тому же репозиторию.
         *
         * Проект ищется в том же списке `proekti.spisok`, что и в селекте
         * формы; этот список несёт `repoId` проекта. Без выбранного проекта
         * или без `repoId` создавать ветку нельзя.
         */
        estTokenSPushomDlyaVibrannogoProekta(state): boolean {
            if (!state.form.projectId) {
                return false;
            }

            const proekt = useSpisokUnitovStore().proekti.spisok.find(
                (item) => item.value === state.form.projectId,
            );

            if (!proekt || !proekt.repoId) {
                return false;
            }

            return estTokenSPushomProekta(state.tokeni.spisok, {
                id: proekt.value,
                repoId: proekt.repoId,
            });
        },
    },
    actions: {
        otkritFormu() {
            this.form = new FormaDobavleniyaUnita();
            this.enable = true;
            this.oshibkaOtBackenda = null;
            this.loader = false;
            this.initPeremenie = false;
            this.dubli.loader = false;
            this.dubli.spisok = [];
            this.zakritDialogSozdaniyaVetki();
            // Токены нужны для подсказки о правах на создание ветки:
            // грузим их при открытии формы, не блокируя её.
            void this.zagruzitTokeni();
        },
        /**
         * Загрузить личные токены пользователя.
         *
         * Ошибка загрузки не блокирует создание юнита: она только
         * отключает подсказку о правах на создание ветки.
         */
        async zagruzitTokeni(): Promise<void> {
            this.tokeni.loader = true;
            this.tokeni.oshibka = null;

            try {
                const response = await LichniyTokenService.spisok();

                if (response.status === "success") {
                    this.tokeni.spisok = response.data;
                } else if (response.status === "fail") {
                    this.tokeni.spisok = [];
                    this.tokeni.oshibka = response.data.message;
                } else if (response.status === "error") {
                    this.tokeni.spisok = [];
                    this.tokeni.oshibka = response.message;
                }
            } catch (error) {
                this.tokeni.spisok = [];
                this.tokeni.oshibka = error instanceof Error
                    ? error.message
                    : String(error);
            } finally {
                this.tokeni.loader = false;
            }
        },
        zakritFormu() {
            this.otchistitChernoviki();
            this.form = new FormaDobavleniyaUnita();
            this.enable = false;
            this.initPeremenie = false;
            this.dubli.loader = true;
            this.dubli.spisok = [];
            this.zakritDialogSozdaniyaVetki();
        },
        /**
         * Удалить из медиатеки все ещё не привязанные черновики.
         *
         * Иды берутся из томов: после успешного создания юнита бэкенд уже
         * привязал файлы, поэтому форма сбрасывает их перед закрытием.
         *
         * Архивы каталога проекта — не черновики: они принадлежат проекту
         * и могут использоваться другими юнитами, поэтому не удаляются.
         */
        otchistitChernoviki() {
            const fileIds = this.form.volumes
                .filter((volume) => !volume.izProekta)
                .map((volume) => volume.volume.fileId)
                .filter((fileId): fileId is string => Boolean(fileId));

            this.form.volumes.forEach((volume) => {
                volume.volume.fileId = null;
                volume.izProekta = false;
            });

            fileIds.forEach((fileId) => {
                MediatekaService.udalitFayl(fileId);
            });
        },
        /**
         * Получить архивы каталога типов томов проекта.
         *
         * `code` типа тома совпадает с `dir` тома конфига, поэтому файлы
         * раскладываются по томам: каждый том видит только архивы своего
         * типа. Ошибка загрузки каталога не блокирует создание юнита:
         * тома останутся без бейджей проекта.
         */
        async poluchitFaylyTipovTomov(): Promise<TipToma[]> {
            if (!this.form.projectId) {
                return [];
            }

            const response = await VolumeTypesService.list(this.form.projectId);

            if (response.status === "success") {
                return response.data;
            }

            if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }

            return [];
        },
        /**
         * Применить архивы каталога проекта к томам формы по `dir`/`code`.
         *
         * Если том уже ссылается на архив проекта (файл совпал с одним из
         * архивов каталога), он помечается `izProekta`: такой файл
         * запрещено удалять.
         */
        primenitFaylyTipovTomov(tipiTomov: TipToma[]) {
            const faylyPoKodu = new Map<string, FaylTipaToma[]>(
                tipiTomov.map((tip) => [tip.code, tip.files]));

            this.form.volumes.forEach((volume) => {
                const fayly = faylyPoKodu.get(volume.volume.dir) ?? [];
                volume.faylyProekta = fayly;

                if (volume.volume.fileId) {
                    volume.izProekta = fayly.some((file) => file.fileId === volume.volume.fileId);
                }
            });
        },
        async poluchitVetki() {
            this.vetki.loader = true;
            this.vetki.spisok = [];

            if (!this.form.projectId) {
                throw new Error('proekt ne vibran');
            }
            const response = await ProektiService.poluchitVetkiProekta({ id: this.form.projectId, query: this.vetki.query });

            this.vetki.loader = false;
            if (response.status === "success") {
                this.vetki.spisok = response.data.map((item: Schema<"ProjectBranch">) => new Vetka(item.name, item.name));
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }
        },
        /** Открыть диалог создания новой ветки. */
        otkritDialogSozdaniyaVetki() {
            this.novayaVetka = {
                nazvanie: "",
                osnova: this.form.branch,
            };
            this.oshibkaSozdaniyaVetki = null;
            this.dialogOtkrit = true;
        },
        /** Закрыть диалог создания ветки и сбросить его состояние. */
        zakritDialogSozdaniyaVetki() {
            this.dialogOtkrit = false;
            this.loaderSozdaniyaVetki = false;
            this.oshibkaSozdaniyaVetki = null;
        },
        /**
         * Создать новую ветку в хранилище и выбрать её в форме.
         *
         * После создания ветки список веток и переменные конфига
         * перезапрашиваются: новая ветка появляется в селекте, а её конфиг
         * подхватывается формой.
         */
        async sozdatVetku(nazvanie: string, otVetki: string) {
            const projectId = this.form.projectId;

            if (!projectId) {
                this.oshibkaSozdaniyaVetki = "Проект не выбран.";
                return;
            }

            if (!nazvanie.trim() || !otVetki.trim()) {
                this.oshibkaSozdaniyaVetki = "Укажите название ветки и базовую ветку.";
                return;
            }

            this.loaderSozdaniyaVetki = true;
            this.oshibkaSozdaniyaVetki = null;

            const response = await ProektiService.sozdatVetku({
                projectId,
                nazvanie,
                otVetki,
            });

            this.loaderSozdaniyaVetki = false;

            if (response.status === "fail") {
                this.oshibkaSozdaniyaVetki = response.data.message;
                return response;
            }

            if (response.status === "error") {
                this.oshibkaSozdaniyaVetki = response.message;
                return response;
            }

            this.form.branch = response.data.name;
            this.zakritDialogSozdaniyaVetki();

            await this.poluchitVetki();
            await this.poluchitPeremenieKonfiga();

            if (this.dubli.spisok.length > 0) {
                await this.naitiDubliUnita();
            } else {
                this.ochistitDubliUnita();
            }

            return response;
        },
        async naitiDubliUnita() {
            if (!this.form.projectId) {
                throw new Error('proekt ne vibran');
            }
            this.dubli.loader = true;
            this.dubli.spisok = [];

            const response = await UnitiService.naitiDubliUnita({
                projectId: this.form.projectId,
                branch: this.form.branch.trim(),
            });

            this.dubli.loader = false;
            if (response.status === "success") {
                this.dubli.spisok = response.data;
            } else if (response.status === "fail") {
                //this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                //this.oshibkaOtBackenda = response.message;
            }
        },
        ochistitDubliUnita() {
          this.dubli.spisok = [];
          this.dubli.loader = false;
        },
        async poluchitPeremenieKonfiga() {
            // Ветка сменилась — прежние черновики томов больше не нужны.
            this.otchistitChernoviki();

            const branch = this.form.branch.trim();

            if (!branch) {
                this.form.peremenieKonfiga = [];
                this.form.volumes = [];
                return;
            }

            this.polucheniePeremenih.loader = true;
            this.initPeremenie = false;
            if (!this.form.projectId) {
                throw new Error('proekt ne vibran');
            }
            const response = await UnitiService.poluchitKonfigPoNazvaniyuVetki(
                { projectId: this.form.projectId, branch: branch });

            this.polucheniePeremenih.loader = false;
            if (response.status === "success") {
                // Бэкенд отдаёт переменные и тома конфига: `unitman_volumes`
                // описывает тома, для которых в форме нужно загрузить файлы.
                // Тома не связаны с переменными — файл тома передаётся
                // бэкенду отдельно, в `SozdatUnit.volumes`.
                this.form.peremenieKonfiga = response.data.peremenie.map(
                    (item: Schema<"UnitVariable">) => new PeremenayaKonfiga(item.konfig, item.konfig.defaultValue));
                this.form.volumes = response.data.volumes.map(
                    (volume: TomKonfiga) => sozdatTomUnita(volume));

                // Архивы каталога проекта подставляются в тома бейджами:
                // тип тома совпадает с `dir` тома конфига.
                const tipiTomov = await this.poluchitFaylyTipovTomov();
                this.primenitFaylyTipovTomov(tipiTomov);

                this.initPeremenie = true;
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }
        },
        /**
         * Загрузить файл тома как черновик медиатеки.
         *
         * Юнита ещё нет, поэтому `unitId` не передаётся: файл привяжется
         * к юниту при его создании — ид черновика уходит в `SozdatUnit.volumes`.
         * Прежний файл тома при замене удаляется из медиатеки.
         */
        async zagruzitFaylToma(volume: TomUnita, file: File) {
            volume.zagruzka = true;
            volume.oshibka = null;

            const response = await MediatekaService.zagruzitChernovik(file, volume.volume.name);

            volume.zagruzka = false;

            if (response.status === "success") {
                if (volume.volume.fileId) {
                    this.udalitFaylToma(volume);
                }

                volume.volume.fileId = response.data.id;
                volume.izProekta = false;
            } else if (response.status === "fail") {
                volume.oshibka = response.data.message;
            } else if (response.status === "error") {
                volume.oshibka = response.message;
            }
        },
        /**
         * Подставить ид архива проекта в том.
         *
         * Архив принадлежит проекту, поэтому помечается `izProekta`:
         * удалять его нельзя, доступна только очистка поля.
         */
        vibratFaylProekta(volume: TomUnita, fileId: string) {
            // Прежний черновик юнита при замене удаляется из медиатеки,
            // архивы проекта при этом не трогаются.
            if (volume.volume.fileId && !volume.izProekta) {
                const chernovikId = volume.volume.fileId;
                volume.volume.fileId = null;
                MediatekaService.udalitFayl(chernovikId);
            }

            volume.volume.fileId = fileId;
            volume.izProekta = true;
            volume.oshibka = null;
        },
        /**
         * Очистить поле файла тома.
         *
         * Для архива проекта файл не удаляется — только отвязывается от
         * формы. Черновик юнита удаляется из медиатеки, чтобы не оставлять
         * сироту.
         */
        ochistitFaylToma(volume: TomUnita) {
            const fileId = volume.volume.fileId;
            const izProekta = volume.izProekta;

            volume.volume.fileId = null;
            volume.izProekta = false;
            volume.oshibka = null;

            if (fileId && !izProekta) {
                MediatekaService.udalitFayl(fileId);
            }
        },
        /** Отвязать файл от тома и удалить черновик из медиатеки. */
        udalitFaylToma(volume: TomUnita) {
            const fileId = volume.volume.fileId;
            const izProekta = volume.izProekta;

            volume.volume.fileId = null;
            volume.izProekta = false;
            volume.oshibka = null;

            // Архив проекта не удаляем: он общий для всех юнитов проекта.
            if (!fileId || izProekta) {
                return;
            }

            MediatekaService.udalitFayl(fileId);
        },
        /**
         * Отправить форму: создать юнит в выбранной ветке.
         *
         * Ветка должна существовать в хранилище — новую ветку пользователь
         * создаёт отдельным диалогом, после чего она выбирается здесь.
         */
        async otpravitFormu() {
            const projectId = this.form.projectId;
            const branch = this.form.branch.trim();

            if (!projectId || !branch) {
                return;
            }

            this.loader = true;
            this.oshibkaOtBackenda = null;

            try {
                const response = await UnitiService.sozdat({
                    projectId,
                    branch,
                    unitName: this.form.unitName,
                    memoryLimit: this.form.memoryLimit,
                    // `targetUnitId` — юнит, выбранный через помощник переменной:
                    // по нему бэкенд создаёт связи юнитов в read-модели списка.
                    // Для переменных без помощника поле не передаётся.
                    znacheniePeremenoi: this.form.peremenieKonfiga.map((item) => {
                        return {
                            "id": item.konfig.id,
                            "value": item.value,
                            "type": item.konfig.type,
                            ...(item.targetUnitId ? {"targetUnitId": item.targetUnitId} : {}),
                        }
                    }),
                    volumes: this.form.volumes.map((volume) => ({
                        dir: volume.volume.dir,
                        name: volume.volume.name,
                        fileId: volume.volume.fileId,
                    })),
                });

                if (response.status === "success") {
                    // Файлы уже привязаны к созданному юниту — удалять их нельзя,
                    // поэтому иды сбрасываются: закрытие формы не тронет медиатеку.
                    this.form.volumes.forEach((volume) => {
                        volume.volume.fileId = null;
                        volume.izProekta = false;
                    });
                    this.oshibkaOtBackenda = null;
                } else if (response.status === "fail") {
                    this.oshibkaOtBackenda = response.data.message;
                } else if (response.status === "error") {
                    this.oshibkaOtBackenda = response.message;
                }

                return response;
            } catch (error) {
                this.oshibkaOtBackenda = error instanceof Error
                    ? error.message
                    : String(error);
            } finally {
                this.loader = false;
            }
        },
    }
})
