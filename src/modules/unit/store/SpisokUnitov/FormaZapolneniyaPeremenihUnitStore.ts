import {defineStore} from "pinia";
import UnitiService from "@/modules/unit/services/UnitiService";
import MediatekaService from "@/modules/unit/services/MediatekaService";
import type {Schema} from "@/api/types";
import type {TomKonfiga, TomUnita} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import { PeremenayaKonfiga, sozdatTomUnita} from "@/modules/unit/store/SpisokUnitov/model/Unit";



class FormaZapolneniyaPeremenih {
    id: string;
    values: PeremenayaKonfiga[];
    /** Тома из блока конфига `unitman_volumes` с состоянием загрузки файлов. */
    volumes: TomUnita[];

    constructor(id: string = "", values: PeremenayaKonfiga[] = [], volumes: TomUnita[] = []) {
        this.id = id;
        this.values = values;
        this.volumes = volumes;
    }
}

type FormaZapolneniyaPeremenihUnitaState = {
    enable: boolean;
    loader: boolean;
    form: FormaZapolneniyaPeremenih,
    oshibkaOtBackenda: string | null;
}

export const useFormaZapolneniyaPeremenihUnitaStore = defineStore('FormaZapolneniyaPeremenihUnita', {
    state: (): FormaZapolneniyaPeremenihUnitaState => {
        return {
            enable: false,
            loader: false,
            oshibkaOtBackenda: null,
            form: new FormaZapolneniyaPeremenih(),
        };
    },
    actions: {
        otkritFormu(id: string) {
            this.form = new FormaZapolneniyaPeremenih(id);
            this.enable = true;
            this.oshibkaOtBackenda = null;
            this.loader = false;
        },
        zakritFormu() {
            this.form = new FormaZapolneniyaPeremenih();
            this.enable = false;
        },
        async poluchitPeremenieUnita() {
            this.loader = true;
            this.form.values = [];
            this.form.volumes = [];
            const response = await UnitiService.poluchitPeremenieUnita({ id: this.form.id });

            this.loader = false;
            if (response.status === "success") {
                // Бэкенд отдаёт переменные и тома юнита: тома описывают файлы,
                // которые нужно загрузить в медиатеку и привязать к юниту.
                this.form.values = response.data.peremenie.map(
                    (item: Schema<"UnitVariable">) => new PeremenayaKonfiga(item.konfig, item.value));
                this.form.volumes = response.data.volumes.map(
                    (volume: TomKonfiga) => sozdatTomUnita(volume));
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }
        },
        /**
         * Загрузить файл тома сразу к юниту.
         *
         * При заполнении переменных бэкенд требует, чтобы файл уже
         * принадлежал юниту, поэтому `unitId` передаётся при загрузке.
         * Ид файла запоминается в томе и уходит в `ZapolnitPeremenieUnita.volumes`.
         */
        async zagruzitFaylToma(volume: TomUnita, file: File) {
            volume.zagruzka = true;
            volume.oshibka = null;

            const response = await MediatekaService.zagruzitDlyaUnita(file, this.form.id, volume.volume.name);

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
        /** Отвязать файл от тома и удалить его из медиатеки. */
        udalitFaylToma(volume: TomUnita) {
            const fileId = volume.volume.fileId;

            volume.volume.fileId = null;
            volume.oshibka = null;

            if (fileId) {
                MediatekaService.udalitFayl(fileId);
            }
        },
        async otpravitFormu() {
            this.loader = true;

            const values: Schema<"ZnacheniePeremenoi">[] = this.form.values.map((item: PeremenayaKonfiga) => ({
                id: item.konfig.id,
                type: item.konfig.type,
                value: item.value,
            }));
            // `dir` — ключ тома, `fileId` — текущий файл тома: `null` очищает
            // файл, ид привязывает загруженный архив. Значения и тома
            // необязательны: их отправляем только если они есть в форме.
            const volumes: Schema<"ZapolnitPeremenieUnitaVolume">[] = this.form.volumes.map((volume) => ({
                dir: volume.volume.dir,
                fileId: volume.volume.fileId,
            }));
            const sendData: Schema<"ZapolnitPeremenieUnita"> = {
                id: this.form.id,
                ...(values.length > 0 ? {values} : {}),
                ...(volumes.length > 0 ? {volumes} : {}),
            };
            const response = await UnitiService.zapolnitPeremenie(sendData);

            this.loader = false;
            if (response.status === "success") {
                this.oshibkaOtBackenda = null;
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }

            return response;
        },
    }
});
