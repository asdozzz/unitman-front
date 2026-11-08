import {defineStore} from "pinia";
import ProektiService from "@/modules/unit/services/ProektiService";
import UnitiService from "@/modules/unit/services/UnitiService";
import MediatekaService from "@/modules/unit/services/MediatekaService";
import type {Schema} from "@/api/types";
import type {Unit, TomKonfiga, TomUnita} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import {PeremenayaKonfiga, sozdatTomUnita} from "@/modules/unit/store/SpisokUnitov/model/Unit";

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
    }
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
            }
        }
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
        },
        zakritFormu() {
            this.otchistitChernoviki();
            this.form = new FormaDobavleniyaUnita();
            this.enable = false;
            this.initPeremenie = false;
            this.dubli.loader = true;
            this.dubli.spisok = [];
        },
        /**
         * Удалить из медиатеки все ещё не привязанные черновики.
         *
         * Иды берутся из томов: после успешного создания юнита бэкенд уже
         * привязал файлы, поэтому форма сбрасывает их перед закрытием.
         */
        otchistitChernoviki() {
            const fileIds = this.form.volumes
                .map((volume) => volume.volume.fileId)
                .filter((fileId): fileId is string => Boolean(fileId));

            this.form.volumes.forEach((volume) => {
                volume.volume.fileId = null;
            });

            fileIds.forEach((fileId) => {
                MediatekaService.udalitFayl(fileId);
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
        async naitiDubliUnita() {
            if (!this.form.projectId) {
                throw new Error('proekt ne vibran');
            }
            this.dubli.loader = true;
            this.dubli.spisok = [];

            const response = await UnitiService.naitiDubliUnita({ projectId: this.form.projectId, branch: this.form.branch });

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

            if (!this.form.branch) {
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
                { projectId: this.form.projectId, branch: this.form.branch });

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
            } else if (response.status === "fail") {
                volume.oshibka = response.data.message;
            } else if (response.status === "error") {
                volume.oshibka = response.message;
            }
        },
        /** Отвязать файл от тома и удалить черновик из медиатеки. */
        udalitFaylToma(volume: TomUnita) {
            const fileId = volume.volume.fileId;

            volume.volume.fileId = null;
            volume.oshibka = null;

            if (!fileId) {
                return;
            }

            MediatekaService.udalitFayl(fileId);
        },
        async otpravitFormu() {
            this.loader = true;

            const response = await UnitiService.sozdat({
                projectId: this.form.projectId,
                branch: this.form.branch,
                unitName: this.form.unitName,
                memoryLimit: this.form.memoryLimit,
                znacheniePeremenoi: this.form.peremenieKonfiga.map((item) => {
                    return {
                        "id": item.konfig.id,
                        "value": item.value,
                        "type": item.konfig.type
                    }
                }),
                volumes: this.form.volumes.map((volume) => ({
                    dir: volume.volume.dir,
                    name: volume.volume.name,
                    fileId: volume.volume.fileId,
                })),
            });

            this.loader = false;
            if (response.status === "success") {
                // Файлы уже привязаны к созданному юниту — удалять их нельзя,
                // поэтому иды сбрасываются: закрытие формы не тронет медиатеку.
                this.form.volumes.forEach((volume) => {
                    volume.volume.fileId = null;
                });
                this.oshibkaOtBackenda = null;
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }

            return response;
        },
    }
})
