import {defineStore} from "pinia";
import {Notify} from "quasar";
import VolumeTypesService from "@/modules/unit/services/VolumeTypesService";
import MediatekaService from "@/modules/unit/services/MediatekaService";
import type {TipToma} from "@/modules/unit/store/SpisokProektov/model/TipToma";

/** Форма добавления типа тома. */
class FormaDobavleniyaTipaToma {
    projectId: string;
    code: string;
    name: string;

    constructor(projectId: string = "", code: string = "", name: string = "") {
        this.projectId = projectId;
        this.code = code;
        this.name = name;
    }
}

type TipiTomaProektaState = {
    enable: boolean;
    projectId: string | null;
    spisok: TipToma[];
    form: FormaDobavleniyaTipaToma;
    /** Код типа, для которого сейчас загружается архив. */
    zagruzkaFaylaDlya: string | null;
    /** Код типа, архив которого сейчас удаляется. */
    udalenieFaylaDlya: string | null;
    loaderSpiska: boolean;
    loaderDobavleniya: boolean;
    loaderUdaleniya: boolean;
    oshibkaSpiska: string | null;
    oshibkaFormi: string | null;
};

export const useTipiTomaProektaStore = defineStore('TipiTomaProektaStore', {
    state: (): TipiTomaProektaState => {
        return {
            enable: false,
            projectId: null,
            spisok: [],
            form: new FormaDobavleniyaTipaToma(),
            zagruzkaFaylaDlya: null,
            udalenieFaylaDlya: null,
            loaderSpiska: false,
            loaderDobavleniya: false,
            loaderUdaleniya: false,
            oshibkaSpiska: null,
            oshibkaFormi: null,
        };
    },
    actions: {
        pokazatSpisok(projectId: string) {
            this.projectId = projectId;
            this.enable = true;
            this.form = new FormaDobavleniyaTipaToma(projectId);
        },
        skritSpisok() {
            this.projectId = null;
            this.enable = false;
            this.spisok = [];
            this.form = new FormaDobavleniyaTipaToma();
        },
        resetForm() {
            this.form = new FormaDobavleniyaTipaToma(this.projectId ?? "");
        },
        async poluchitSpisok() {
            if (this.projectId === null) {
                throw new Error('projectId ne opredelen dly polucheniya spiska tipov tomov proekta');
            }

            this.loaderSpiska = true;

            const response = await VolumeTypesService.list(this.projectId);

            this.loaderSpiska = false;

            if (response.status === "success") {
                this.spisok = response.data;
                this.oshibkaSpiska = null;
            } else if (response.status === "fail") {
                this.spisok = [];
                this.oshibkaSpiska = response.data.message;
            } else if (response.status === "error") {
                this.spisok = [];
                this.oshibkaSpiska = response.message;
            }

            return response;
        },
        async dobavitTip() {
            if (!this.form.projectId) {
                throw new Error('projectId ne opredelen dly dobavleniya tipa toma');
            }

            this.loaderDobavleniya = true;

            const response = await VolumeTypesService.add({
                projectId: this.form.projectId,
                code: this.form.code,
                name: this.form.name,
            });

            this.loaderDobavleniya = false;

            if (response.status === "success") {
                this.oshibkaFormi = null;
                this.resetForm();
                await this.poluchitSpisok();
            } else if (response.status === "fail") {
                this.oshibkaFormi = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaFormi = response.message;
            }

            return response;
        },
        /**
         * Удалить тип тома.
         *
         * Бэкенд откажет, если к типу привязаны архивы: сначала нужно удалить
         * файлы. Сообщение бэкенда показывается пользователю.
         */
        async udalitTip(code: string) {
            if (this.projectId === null) {
                throw new Error('projectId ne opredelen dly udaleniya tipa toma');
            }

            this.loaderUdaleniya = true;

            const response = await VolumeTypesService.udalit({projectId: this.projectId, code});

            this.loaderUdaleniya = false;

            if (response.status === "fail") {
                Notify.create(response.data.message);
            } else if (response.status === "error") {
                Notify.create(response.message);
            }

            await this.poluchitSpisok();

            return response;
        },
        /**
         * Загрузить один или несколько zip-архивов проекта и прикрепить их
         * к типу тома.
         *
         * Архив сначала загружается в медиатеку как файл проекта, затем
         * привязывается к типу. Если привязка не удалась, файл удаляется
         * из медиатеки, чтобы не оставлять сироту.
         */
        async zagruzitFayly(code: string, files: File[]) {
            if (this.projectId === null) {
                throw new Error('projectId ne opredelen dly zagruzki faylov tipa toma');
            }

            this.zagruzkaFaylaDlya = code;

            for (const file of files) {
                const uploadResponse = await MediatekaService.zagruzitFaylProekta(file, this.projectId);

                if (uploadResponse.status !== "success") {
                    const message = uploadResponse.status === "fail"
                        ? uploadResponse.data.message
                        : uploadResponse.message;
                    Notify.create(message);

                    continue;
                }

                const attachResponse = await VolumeTypesService.dobavitFayl({
                    projectId: this.projectId,
                    code,
                    fileId: uploadResponse.data.id,
                });

                if (attachResponse.status !== "success") {
                    const message = attachResponse.status === "fail"
                        ? attachResponse.data.message
                        : attachResponse.message;
                    Notify.create(message);
                    await MediatekaService.udalitFayl(uploadResponse.data.id);
                }
            }

            this.zagruzkaFaylaDlya = null;

            await this.poluchitSpisok();
        },
        /**
         * Открепить архив от типа тома и удалить его из медиатеки.
         *
         * Архив, привязанный к другим типам, бэкенд из медиатеки не удалит —
         * он останется доступен остальным типам.
         */
        async udalitFayl(code: string, fileId: string) {
            if (this.projectId === null) {
                throw new Error('projectId ne opredelen dly udaleniya fayla tipa toma');
            }

            this.udalenieFaylaDlya = code;

            const response = await VolumeTypesService.udalitFayl({
                projectId: this.projectId,
                code,
                fileId,
                udalitFayl: true,
            });

            this.udalenieFaylaDlya = null;

            if (response.status === "fail") {
                Notify.create(response.data.message);
            } else if (response.status === "error") {
                Notify.create(response.message);
            }

            await this.poluchitSpisok();

            return response;
        },
    },
});
