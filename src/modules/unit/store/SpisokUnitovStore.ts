import { defineStore } from 'pinia';
import UnitiService from "@/modules/unit/services/UnitiService";
import type {Deistviye, SvyazUnita, Unit} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import type {Schema} from "@/api/types";
import {Notify} from "quasar";
import ProektiService from "@/modules/unit/services/ProektiService";
import {safeJsonParse} from "@/utils/json";

type NastroikiSpiska = {
    filter: {
        onlyMine: boolean,
        name: string | null
        branch: string | null
        projectId: string | null,
        unitId: string | null,
        /**
         * Идентификаторы юнитов, выбранных через бейджи связей на карточке.
         * Бэкенд возвращает сами юниты и связанные с ними (связи через
         * помощник переменной, в обе стороны).
         */
        unitIds: string[],
    },
    limit: number,
    offset: number
}

type PolzovatelProekta  = {
    role: string;
    userId: string;
}

class Proekt {
    value: string;
    label: string;
    users: PolzovatelProekta[];
    memoryLimit: number;

    constructor(value: string, label: string, users: PolzovatelProekta[], memoryLimit: number) {
        this.value = value;
        this.label = label;
        this.users = users;
        this.memoryLimit = memoryLimit;
    }
}

const FILTER_UNITOV_STORAGE_KEY = 'FILTER_UNITOV_STORAGE_KEY';

export type SpisokUnitovState = {
    nastroikiSpiska: NastroikiSpiska;
    spisok: Unit[];
    /**
     * Кеш «ид юнита → имя», чтобы подписывать бейджи связей и чипы фильтра
     * даже когда юнит отсутствует в текущей выборке.
     */
    nazvaniyaUnitov: Record<string, string>;
    /**
     * Иды связанных юнитов, имена которых уже запрашивались отдельно.
     * Защищает от повторных запросов при каждом обновлении списка, если
     * имя получить так и не удалось.
     */
    zaproshennieNazvaniyaSvyazei: string[];
    proekti: {
        spisok: Proekt[];
        loader: boolean;
    },
    loaderSpiskaUnitov: boolean;
    oshibkaZagruzkiSpiska: string | null;
    loaderObnovleniyaUnita: boolean;
    unitLoaders: Record<string, boolean>;
    pollingId: any | null
}

export const useSpisokUnitovStore = defineStore('SpisokUnitovStore', {
    state: (): SpisokUnitovState => {

        const nastroikiIzLocalStorageAsJson = localStorage.getItem(FILTER_UNITOV_STORAGE_KEY);

        const nastroikiPoUmolchaniyu: NastroikiSpiska = {
            filter: {
                onlyMine: false,
                name: null,
                branch: null,
                projectId: null,
                unitId: null,
                unitIds: [],
            },
            limit: 100,
            offset: 0
        };

        let nastroiki: NastroikiSpiska = nastroikiPoUmolchaniyu;

        if (nastroikiIzLocalStorageAsJson) {
            const nastroikiIzLocalStorage: NastroikiSpiska | null = safeJsonParse<NastroikiSpiska>(nastroikiIzLocalStorageAsJson) || null;
            if (nastroikiIzLocalStorage) {
                // Сохранённые настройки могли быть записаны старой версией
                // приложения, поэтому недостающие поля добираем значениями
                // по умолчанию.
                nastroiki = {
                    ...nastroikiPoUmolchaniyu,
                    ...nastroikiIzLocalStorage,
                    filter: {
                        ...nastroikiPoUmolchaniyu.filter,
                        ...(nastroikiIzLocalStorage.filter ?? {}),
                    },
                };
            }
        }

        if (!Array.isArray(nastroiki.filter.unitIds)) {
            nastroiki.filter.unitIds = [];
        }

        return {
            nastroikiSpiska: nastroiki,
            spisok:[],
            nazvaniyaUnitov: {},
            zaproshennieNazvaniyaSvyazei: [],
            proekti: {
                spisok: [],
                loader: false
            },
            loaderSpiskaUnitov:false,
            oshibkaZagruzkiSpiska: null,
            loaderObnovleniyaUnita:false,
            unitLoaders: {},
            pollingId: null,
        };
    },
    actions: {
        startUnitLoader(id: string) {
            this.unitLoaders[id] = true;
        },
        stopUnitLoader(id: string) {
            this.unitLoaders[id] = false;
        },
        /**
         * Кладёт имена юнитов в кеш `nazvaniyaUnitov`.
         *
         * Нужен, чтобы бейджи связей на карточке и чипы фильтра подписывались
         * именами, даже если связанный юнит не попал в текущую выборку.
         */
        zapomnitNazvaniya(uniti: Unit[]) {
            uniti.forEach((unit: Unit) => {
                this.nazvaniyaUnitov[unit.id] = unit.name;
            });
        },
        /**
         * Дочитывает имена связанных юнитов, которых нет в текущей выборке.
         *
         * Без этого бейджи связей и чипы фильтра подписывались бы сервисом
         * помощника либо сырым идом. Имена запрашиваются одним вызовом через
         * фильтр `unitIds` — бэкенд вернёт переданные юниты вместе со связанными.
         */
        async dopolnitNazvaniyaSvyazei(uniti: Unit[]) {
            const neizvestnie = new Set<string>();

            uniti.forEach((unit: Unit) => {
                (unit.svyazi ?? []).forEach((svyaz: SvyazUnita) => {
                    if (!this.nazvaniyaUnitov[svyaz.targetUnitId]) {
                        neizvestnie.add(svyaz.targetUnitId);
                    }
                });
            });

            const zaprosit = [...neizvestnie].filter((id: string) => {
                return !this.zaproshennieNazvaniyaSvyazei.includes(id);
            });

            if (zaprosit.length === 0) {
                return;
            }

            this.zaproshennieNazvaniyaSvyazei.push(...zaprosit);

            const response = await UnitiService.list({filter: {unitIds: zaprosit}, limit: 1000});

            if (response.status === "success") {
                this.zapomnitNazvaniya(response.data);
            }
        },
        /**
         * Добавляет либо убирает юнит из фильтра связей и перезапрашивает список.
         *
         * Фильтр `unitIds` на бэкенде возвращает сами переданные юниты и
         * связанные с ними (связи через помощник переменной, в обе стороны).
         */
        async perekluchitSvyazUnita(unitId: string) {
            const unitIds = this.nastroikiSpiska.filter.unitIds;

            this.nastroikiSpiska.filter.unitIds = unitIds.includes(unitId)
                ? unitIds.filter((id: string) => id !== unitId)
                : [...unitIds, unitId];

            await this.poluchitSpisokUnitov();
        },
        /** Сбрасывает фильтр связей и перезапрашивает список. */
        async ochistitSvyaziUnita() {
            if (this.nastroikiSpiska.filter.unitIds.length === 0) {
                return;
            }

            this.nastroikiSpiska.filter.unitIds = [];

            await this.poluchitSpisokUnitov();
        },
        udalitUnitIzSpiska(id: string): void {
            const index = this.spisok.findIndex((item: Unit) => item.id === id);

            if (index > -1) {
                this.spisok.splice(index, 1);
            }
        },
        async poluchitSpisokUnitov() {
            this.loaderSpiskaUnitov = true;
            localStorage.setItem(FILTER_UNITOV_STORAGE_KEY, JSON.stringify(this.nastroikiSpiska))
            // Пустой массив равнозначен отсутствию фильтра — не отправляем его,
            // чтобы не менять форму запроса без необходимости.
            const filter = this.nastroikiSpiska.filter;
            const params: Schema<"GetUnitList"> = {
                filter: filter.unitIds.length > 0
                    ? {...filter, unitIds: filter.unitIds}
                    : {...filter, unitIds: undefined},
                limit: this.nastroikiSpiska.limit,
                offset: this.nastroikiSpiska.offset,
            };
            const response = await UnitiService.list(params);
            if (response.status === "success") {
                this.spisok = response.data;
                this.zapomnitNazvaniya(this.spisok);
                // Имена связанных юнитов нужны для подписей бейджей и чипов;
                // список при этом уже отрисован, поэтому не ждём этот запрос.
                this.dopolnitNazvaniyaSvyazei(this.spisok);
            } else if (response.status === "fail") {
                this.spisok = [];
                this.oshibkaZagruzkiSpiska = response.data.message;
            } else if (response.status === "error") {
                this.spisok = [];
                this.oshibkaZagruzkiSpiska = response.message;
            }

            this.loaderSpiskaUnitov = false;

            return response;
        },
        async obnovitUnit(id: string) {
            this.startUnitLoader(id);
            const response = await UnitiService.obnovit({ id })


            if (response.status === "fail"){
                Notify.create(response.data.message);
            } else if (response.status === "success") {
                this.zapomnitNazvaniya([response.data]);

                const unitIndex = this.spisok.findIndex((unit: Unit) => unit.id === id);

                if (unitIndex !== -1) {
                    this.spisok[unitIndex] = response.data;
                }
            }

            this.stopUnitLoader(id);

            return response;
        },
        async sobratMoiUnit(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.sobrat({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
        async obnovitKodMoegoUnita(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.obnovitKodUnita({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
        async podgotovitMoiUnit(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.podgotovit({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
        async sbrositPodgotovkuMoegoUnita(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.sbrositPodgotovku({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
        async zapustitMoiUnit(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.zapustit({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
        async proveritKonteinerUnita(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.proveritKonteinerUnita({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
        async ostanovitMoiUnit(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.ostanovit({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
        async udalit(unit: Unit) {
            if (unit.commands.includes('udalitVruchnuyu')) {
                await this.udalitSlomaniiUnit(unit.id);
            } else {
                await this.udalitMoiUnit(unit.id);
            }
        },
        async udalitMoiUnit(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.udalit({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
        async udalitSlomaniiUnit(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.udalitSlomaniyUnit({ id })
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.udalitUnitIzSpiska(id);

            return response;
        },
        async poluchitMoiProekti() {
            this.proekti.loader = true;
            this.proekti.spisok = [];
            const response = await ProektiService.poluchitMoiProekti();

            this.proekti.loader = false;
            if (response.status === "success") {
                this.proekti.spisok = response.data.map((item) => new Proekt(item.id, item.name, item.users, item.memoryLimit));
            } else if (response.status === "fail") {
                Notify.create(response.data.message);
            } else if (response.status === "error") {
                Notify.create(response.message);
            }
        },
        async rebuildModel(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.rebuildModel({ id });
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
        async pometitKakSlomanii(id: string) {
            this.startUnitLoader(id);

            const response = await UnitiService.pometitKakSlomanii({ id });
            this.stopUnitLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.obnovitUnit(id);

            return response;
        },
    },
    getters: {
        issetUnit() {
            const store = this;
            return (id: string): boolean => {
                const unit = store.spisok.find((item:Unit) => item.id === id);

                return unit !== undefined;
            }
        },
        getUnitLoader() {
            const store = this;
            return (id: string): boolean => {
                if (!store.unitLoaders.hasOwnProperty(id)) {
                    return false;
                }

                return store.unitLoaders[id];
            }
        },
        showForceRemove() {
            return (item: Unit): boolean => {
                return item.commands.some((command: string) => ['udalitVruchnuyu','nachatUdaleniePosleZapuska','nachatUdalenie'].includes(command))
            }
        },
        esliZapushen() {
            return (item: Unit): boolean => {
                return item.zapushen;
            }
        },
        esliJdemRunner() {
            return (item: Unit): boolean => {
                let result = false;
                if (item.prozesi.length > 0) {
                    result = !['SUCCESS', 'ERROR', 'CANCLED'].includes(item.prozesi[item.prozesi.length - 1].state);
                }
                return result;
            }
        },
        nazvanieTekusheiZadachi() {
            return (item: Unit): string => {
                let result = "";
                if (item.prozesi.length > 0) {

                    for (let i = 0; i < item.prozesi.length; i++) {
                        const prozes = item.prozesi[i];

                        if (prozes.state !== "SUCCESS" && prozes.state !== "ERROR" && prozes.state !== "CANCLED") {

                            for (let j = 0; j < prozes.jobs.length; j++) {
                                const zadacha = prozes.jobs[j];

                                if (zadacha.state !== "SUCCESS" && zadacha.state !== "ERROR" && zadacha.state !== "CANCLED") {
                                    return zadacha.type;
                                }
                            }
                        }
                    }
                }

                return result;
            }
        },
        getUserRoleByProjectIdAndUserId() {
            const store = this;
            return (projectId: string, userId: string): string | null => {
                if (store.proekti.spisok.length === 0) return null;
                const proekt = store.proekti.spisok.find((proekt: Proekt) => proekt.value === projectId);

                if (!proekt) return null;

                const user = proekt.users.find((user: PolzovatelProekta) => user.userId === userId);

                if (!user) return null;

                return user.role;
            }
        },
        spisokDeistvii() {
            const store = this;
            return (item: Unit): Deistviye[] => {
                return item.deistviya.filter((action: Deistviye) => {
                    return store.esliZapushen(item) || action.prepare;
                });
            }
        },
        /**
         * Уникальные связанные юниты карточки.
         *
         * В read-модели связь описана на уровне переменной, поэтому несколько
         * записей могут указывать на один и тот же `targetUnitId` — для бейджей
         * оставляем по одному представителю.
         */
        svyazannieUniti() {
            return (item: Unit): SvyazUnita[] => {
                const unikalnie = new Map<string, SvyazUnita>();

                (item.svyazi ?? []).forEach((svyaz: SvyazUnita) => {
                    if (!unikalnie.has(svyaz.targetUnitId)) {
                        unikalnie.set(svyaz.targetUnitId, svyaz);
                    }
                });

                return [...unikalnie.values()];
            }
        },
        /** Имя юнита из кеша; `null`, если оно ещё не загружено. */
        nazvanieUnitaPoId() {
            const store = this;
            return (unitId: string): string | null => {
                return store.nazvaniyaUnitov[unitId] ?? null;
            }
        },
        /** Выбран ли юнит в фильтре связей. */
        vibranLiUnitVFiltreSvyazei() {
            const store = this;
            return (unitId: string): boolean => {
                return store.nastroikiSpiska.filter.unitIds.includes(unitId);
            }
        }
    }
})
