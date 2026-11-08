import {defineStore} from "pinia";
import UnitiService from "@/modules/unit/services/UnitiService";
import MediatekaService from "@/modules/unit/services/MediatekaService";
import VolumeTypesService from "@/modules/unit/services/VolumeTypesService";
import type {Schema} from "@/api/types";
import type {
    SvyazPeremenoi,
    SvyazUnita,
    TomKonfiga,
    TomUnita,
    Unit,
} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import { PeremenayaKonfiga, sozdatTomUnita} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import type {FaylTipaToma, TipToma} from "@/modules/unit/store/SpisokProektov/model/TipToma";
import {useSpisokUnitovStore} from "@/modules/unit/store/SpisokUnitovStore";



class FormaZapolneniyaPeremenih {
    id: string;
    /** Проект юнита — нужен для загрузки каталога типов томов. */
    projectId: string;
    values: PeremenayaKonfiga[];
    /** Тома из блока конфига `unitman_volumes` с состоянием загрузки файлов. */
    volumes: TomUnita[];
    /**
     * Удалось ли прочитать текущие связи переменных из read-модели юнита.
     *
     * `ZapolnitPeremenieUnita.svyazi` заменяет набор связей целиком, поэтому
     * отправлять его можно только когда известны все текущие связи: иначе
     * незагруженные связи будут удалены на бэкенде.
     */
    svyaziZagruzheni: boolean;

    constructor(
        id: string = "",
        projectId: string = "",
        values: PeremenayaKonfiga[] = [],
        volumes: TomUnita[] = [],
        svyaziZagruzheni: boolean = false,
    ) {
        this.id = id;
        this.projectId = projectId;
        this.values = values;
        this.volumes = volumes;
        this.svyaziZagruzheni = svyaziZagruzheni;
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
        otkritFormu(id: string, projectId: string = "") {
            this.form = new FormaZapolneniyaPeremenih(id, projectId);
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
            this.form.svyaziZagruzheni = false;
            const response = await UnitiService.poluchitPeremenieUnita({ id: this.form.id });

            this.loader = false;
            if (response.status === "success") {
                // Бэкенд отдаёт переменные и тома юнита: тома описывают файлы,
                // которые нужно загрузить в медиатеку и привязать к юниту.
                this.form.values = response.data.peremenie.map(
                    (item: Schema<"UnitVariable">) => new PeremenayaKonfiga(item.konfig, item.value));
                this.form.volumes = response.data.volumes.map(
                    (volume: TomKonfiga) => sozdatTomUnita(volume));

                // Ответ не содержит связей переменных с юнитами — они живут
                // в read-модели списка, поэтому подтягиваем их отдельно.
                await this.zagruzitSvyaziUnita();

                // Архивы каталога проекта подставляются в тома бейджами.
                const tipiTomov = await this.poluchitFaylyTipovTomov();
                this.primenitFaylyTipovTomov(tipiTomov);
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }
        },
        /**
         * Восстановить зафиксированные юниты переменных из read-модели.
         *
         * `poluchitPeremenieUnita` не отдаёт связи, поэтому берём карточку
         * юнита из списка (если она уже загружена) или запрашиваем её
         * через `/unit/obnovit`. Признак `svyaziZagruzheni` защищает
         * от отправки неполного набора связей: `svyazi` в запросе
         * заменяет связи целиком.
         */
        async zagruzitSvyaziUnita() {
            const spisokStore = useSpisokUnitovStore();
            let unit: Unit | null = spisokStore.spisok.find((item: Unit) => item.id === this.form.id) ?? null;

            if (!unit) {
                const response = await UnitiService.obnovit({ id: this.form.id });

                if (response.status !== "success") {
                    return;
                }

                unit = response.data;
                spisokStore.zapomnitNazvaniya([unit]);
            }

            const svyazi = unit.svyazi ?? [];

            svyazi.forEach((svyaz: SvyazUnita) => {
                const peremenaya = this.form.values.find(
                    (item: PeremenayaKonfiga) => item.konfig.id === svyaz.variableId);

                if (peremenaya) {
                    peremenaya.targetUnitId = svyaz.targetUnitId;
                }
            });

            // Имена целевых юнитов могли не попасть в текущую выборку списка —
            // дочитываем их тем же запросом, что и бейджи карточек.
            await spisokStore.dopolnitNazvaniyaSvyazei([unit]);

            svyazi.forEach((svyaz: SvyazUnita) => {
                const peremenaya = this.form.values.find(
                    (item: PeremenayaKonfiga) => item.konfig.id === svyaz.variableId);

                if (peremenaya) {
                    peremenaya.targetUnitName = spisokStore.nazvanieUnitaPoId(svyaz.targetUnitId);
                }
            });

            this.form.svyaziZagruzheni = true;
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
                volume.izProekta = false;
            } else if (response.status === "fail") {
                volume.oshibka = response.data.message;
            } else if (response.status === "error") {
                volume.oshibka = response.message;
            }
        },
        /**
         * Получить архивы каталога типов томов проекта.
         *
         * Архивы раскладываются по томам по совпадению `code` типа и `dir`
         * тома. Недоступность каталога не блокирует форму: тома просто
         * останутся без бейджей проекта.
         */
        async poluchitFaylyTipovTomov(): Promise<TipToma[]> {
            const projectId = this.form.projectId;

            if (!projectId) {
                return [];
            }

            const response = await VolumeTypesService.list(projectId);

            if (response.status === "success") {
                return response.data;
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
        /**
         * Подставить ид архива проекта в том.
         *
         * Архив проекта помечается `izProekta`: удалять его нельзя,
         * доступна только очистка поля.
         */
        vibratFaylProekta(volume: TomUnita, fileId: string) {
            if (volume.volume.fileId && !volume.izProekta) {
                const chernovikId = volume.volume.fileId;
                volume.volume.fileId = null;
                MediatekaService.udalitFayl(chernovikId);
            }

            volume.volume.fileId = fileId;
            volume.izProekta = true;
            volume.oshibka = null;
        },
        /** Очистить поле файла: архив проекта не удаляется, черновик — удаляется. */
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
        /** Отвязать файл от тома и удалить его из медиатеки. */
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
        async otpravitFormu() {
            this.loader = true;

            // `targetUnitId` — юнит, выбранный через помощник переменной.
            // Он уходит и в значении, и в `svyazi`: бэкенд реконсилирует
            // связи юнитов по переменным конфига.
            const values: Schema<"ZnacheniePeremenoi">[] = this.form.values.map((item: PeremenayaKonfiga) => ({
                id: item.konfig.id,
                type: item.konfig.type,
                value: item.value,
                // Снятую связь отправляем явным `null`: пустой `svyazi`
                // на бэкенде означает «связи не меняются».
                ...(item.targetUnitId || item.svyazIzmenena ? {targetUnitId: item.targetUnitId} : {}),
            }));
            // `svyazi` заменяет набор связей целиком, поэтому отправляем его
            // только когда загружены все текущие связи (иначе незагруженные
            // были бы удалены) и если в форме осталась хотя бы одна связь.
            const svyazi: SvyazPeremenoi[] = this.form.svyaziZagruzheni
                ? this.form.values
                    .filter((item: PeremenayaKonfiga) => !!item.targetUnitId)
                    .map((item: PeremenayaKonfiga) => ({
                        variableId: item.konfig.id,
                        targetUnitId: item.targetUnitId as string,
                    }))
                : [];
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
                ...(svyazi.length > 0 ? {svyazi} : {}),
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
