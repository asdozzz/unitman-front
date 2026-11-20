import { defineStore } from 'pinia';
import UnitiService from "@/modules/unit/services/UnitiService";
import type {Deistviye, SvyazUnita, Unit} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import type {Schema} from "@/api/types";
import type {ApiResponse} from "@/bootstrap/apiClient/ApiResponse";
import {Notify} from "quasar";
import ProektiService from "@/modules/unit/services/ProektiService";
import {safeJsonParse} from "@/utils/json";
import {
    DEFAULT_UNIT_FILTERS,
    normalizovatFiltri,
    type UnitFilterChip,
    type UnitFilterStatus,
    type UnitFilters,
    type UnitSort,
} from "@/modules/unit/store/SpisokUnitov/model/UnitFilters";
import {
    deriveUnitUiState,
    estAktivniyProzes,
    nazvanieAktivnoiZadachi,
    progressProzesa,
    type UnitProcessProgress,
} from "@/modules/unit/utils/unitStatus";

type NastroikiSpiska = {
    filter: UnitFilters,
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

/** Задержка коалесценции запросов списка при быстром вводе. */
const ZADERZHKA_DEBOUNCE_MS = 300;

/** Период страховочного опроса юнитов с активным процессом. */
const PERIOD_OPROSA_AKTIVNIH_PROZESOV_MS = 5000;

/**
 * Состояние дебаунса и защиты от гонок живёт в замыкании модуля, а не
 * в реактивном state: таймер и счётчик не должны попадать в сохраняемое
 * состояние стора.
 */
let tailerZaprosa: ReturnType<typeof setTimeout> | null = null;
let nomerPoslednegoZaprosa = 0;

/** Снимает отложенный запрос, если он ещё не успел выполниться. */
function otmenitOzhidayushiyZapros(): void {
    if (tailerZaprosa !== null) {
        clearTimeout(tailerZaprosa);
        tailerZaprosa = null;
    }
}

/** Есть ли в фильтре хотя бы одно условие (сортировка условием не считается). */
function estAktivnieUsloviya(filter: UnitFilters): boolean {
    return filter.search !== null
        || filter.name !== null
        || filter.branch !== null
        || filter.projectId !== null
        || filter.onlyMine
        || filter.statuses.length > 0
        || filter.unitId !== null
        || filter.unitIds.length > 0;
}

/**
 * Число активных условий фильтра.
 *
 * Каждый выбранный статус и каждый `unitId` считаются отдельно, чтобы
 * счётчик совпадал с количеством чипов в полосе активных фильтров.
 */
function poschitatAktivnieUsloviya(filter: UnitFilters): number {
    let kolichestvo = 0;

    if (filter.search !== null) {
        kolichestvo++;
    }
    if (filter.name !== null) {
        kolichestvo++;
    }
    if (filter.branch !== null) {
        kolichestvo++;
    }
    if (filter.projectId !== null) {
        kolichestvo++;
    }
    if (filter.onlyMine) {
        kolichestvo++;
    }

    kolichestvo += filter.statuses.length;

    if (filter.unitId !== null) {
        kolichestvo++;
    }

    kolichestvo += filter.unitIds.length;

    return kolichestvo;
}

export const useSpisokUnitovStore = defineStore('SpisokUnitovStore', {
    state: (): SpisokUnitovState => {

        const nastroikiIzLocalStorageAsJson = localStorage.getItem(FILTER_UNITOV_STORAGE_KEY);

        // Сохранённые настройки могли быть записаны старой версией приложения:
        // битый JSON и произвольная форма фильтра не должны ронять приложение.
        const sohranennieNastroiki = nastroikiIzLocalStorageAsJson
            ? safeJsonParse<Partial<NastroikiSpiska>>(nastroikiIzLocalStorageAsJson)
            : undefined;

        const nastroiki: NastroikiSpiska = {
            filter: normalizovatFiltri(sohranennieNastroiki?.filter),
            limit: typeof sohranennieNastroiki?.limit === "number"
                ? sohranennieNastroiki.limit
                : 100,
            offset: typeof sohranennieNastroiki?.offset === "number"
                ? sohranennieNastroiki.offset
                : 0,
        };

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
        /** Сохраняет настройки списка в localStorage. */
        sohranitNastroiki(): void {
            try {
                localStorage.setItem(FILTER_UNITOV_STORAGE_KEY, JSON.stringify(this.nastroikiSpiska));
            } catch {
                // Приватный режим или переполненное хранилище не должны
                // ломать работу со списком — фильтр просто не запомнится.
            }
        },
        /**
         * Применяет частичное изменение фильтра.
         *
         * `immediate = false` включает debounce — так приходит только
         * текстовый поиск; остальные изменения применяются сразу.
         */
        async primenitFiltri(patch: Partial<UnitFilters>, immediate = true): Promise<void> {
            this.nastroikiSpiska.filter = normalizovatFiltri({
                ...this.nastroikiSpiska.filter,
                ...patch,
            });
            this.sohranitNastroiki();

            if (immediate) {
                await this.poluchitSpisokUnitov();
            } else {
                this.zaprositSpisokUnitov();
            }
        },
        /** Сбрасывает фильтр к значениям по умолчанию и перезапрашивает список. */
        async sbrozitFiltri(): Promise<void> {
            this.nastroikiSpiska.filter = {
                ...DEFAULT_UNIT_FILTERS,
                statuses: [],
                unitIds: [],
            };
            this.sohranitNastroiki();

            await this.poluchitSpisokUnitov();
        },
        /** Меняет сортировку списка. */
        async ustanovitSort(sort: UnitSort): Promise<void> {
            await this.primenitFiltri({sort});
        },
        /**
         * Добавляет либо убирает юнит из фильтра связей и перезапрашивает список.
         *
         * Фильтр `unitIds` на бэкенде возвращает сами переданные юниты и
         * связанные с ними (связи через помощник переменной, в обе стороны).
         */
        async perekluchitSvyazUnita(unitId: string) {
            const unitIds = this.nastroikiSpiska.filter.unitIds;
            const novieUnitIds = unitIds.includes(unitId)
                ? unitIds.filter((id: string) => id !== unitId)
                : [...unitIds, unitId];

            await this.primenitFiltri({unitIds: novieUnitIds});
        },
        /** Сбрасывает фильтр связей и перезапрашивает список. */
        async ochistitSvyaziUnita() {
            if (this.nastroikiSpiska.filter.unitIds.length === 0) {
                return;
            }

            await this.primenitFiltri({unitIds: []});
        },
        udalitUnitIzSpiska(id: string): void {
            const index = this.spisok.findIndex((item: Unit) => item.id === id);

            if (index > -1) {
                this.spisok.splice(index, 1);
            }
        },
        /**
         * Собирает тело запроса списка из текущего фильтра.
         *
         * Пустые массивы и пустой поиск равнозначны отсутствию условия —
         * не отправляем их, чтобы не менять форму запроса без необходимости.
         */
        sozdatParametriZaprosa(): Schema<"GetUnitList"> {
            const filter = this.nastroikiSpiska.filter;

            return {
                filter: {
                    name: filter.name,
                    branch: filter.branch,
                    projectId: filter.projectId,
                    onlyMine: filter.onlyMine,
                    unitId: filter.unitId,
                    search: filter.search ?? undefined,
                    sort: filter.sort,
                    statuses: filter.statuses.length > 0 ? filter.statuses : undefined,
                    unitIds: filter.unitIds.length > 0 ? filter.unitIds : undefined,
                },
                limit: this.nastroikiSpiska.limit,
                offset: this.nastroikiSpiska.offset,
            };
        },
        /**
         * Выполняет запрос списка с защитой от гонок.
         *
         * У каждого запроса есть порядковый номер: ответ применяется к
         * `spisok` и лоадеру только если это последний запрос. Устаревший
         * ответ не перетирает свежие данные и не выключает чужой лоадер.
         */
        async vipolnitZagruzkuSpiska(): Promise<ApiResponse<Unit[]>> {
            const nomerZaprosa = ++nomerPoslednegoZaprosa;

            this.loaderSpiskaUnitov = true;

            const response = await UnitiService.list(this.sozdatParametriZaprosa());

            if (nomerZaprosa === nomerPoslednegoZaprosa) {
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
            }

            return response;
        },
        /**
         * Немедленный запрос списка.
         *
         * Контракт возврата `ApiResponse` сохраняется: им пользуются формы,
         * WebSocket-обработчик и кнопка обновления. Отложенный debounce-запрос
         * отменяется, чтобы не ушёл лишний дубль.
         */
        async poluchitSpisokUnitov(): Promise<ApiResponse<Unit[]>> {
            otmenitOzhidayushiyZapros();

            return this.vipolnitZagruzkuSpiska();
        },
        /**
         * Отложенный запрос списка: 300 мс коалесценции.
         *
         * Таймер живёт в замыкании модуля, поэтому не попадает в
         * сериализуемое состояние стора.
         */
        zaprositSpisokUnitov(): void {
            otmenitOzhidayushiyZapros();

            tailerZaprosa = setTimeout(() => {
                tailerZaprosa = null;
                void this.vipolnitZagruzkuSpiska();
            }, ZADERZHKA_DEBOUNCE_MS);
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
        /**
         * Тихое обновление юнита без лоадера кнопок.
         * Используется страховочным опросом активных процессов.
         */
        async obnovitUnitTiho(id: string): Promise<void> {
            const response = await UnitiService.obnovit({id});

            if (response.status === "success") {
                this.zapomnitNazvaniya([response.data]);

                const unitIndex = this.spisok.findIndex((unit: Unit) => unit.id === id);

                if (unitIndex !== -1) {
                    this.spisok[unitIndex] = response.data;
                }
            }
        },
        /**
         * Запускает страховочный опрос активных процессов.
         *
         * Нужен на случай потери WebSocket-событий: без него лоадер мог бы
         * остаться на карточке, хотя все задачи уже завершились.
         */
        startProzesPolling(): void {
            if (this.pollingId !== null) {
                return;
            }

            this.pollingId = setInterval(() => {
                this.spisok
                    .filter((unit: Unit) => estAktivniyProzes(unit.prozesi))
                    .forEach((unit: Unit) => {
                        void this.obnovitUnitTiho(unit.id);
                    });
            }, PERIOD_OPROSA_AKTIVNIH_PROZESOV_MS);
        },
        /** Останавливает страховочный опрос. */
        stopProzesPolling(): void {
            if (this.pollingId === null) {
                return;
            }

            clearInterval(this.pollingId);
            this.pollingId = null;
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
        /**
         * Занят ли юнит прямо сейчас.
         *
         * Учитывается и внешняя занятость (`zanyat` — например, захват ходом
         * OpenCode), и незавершённый процесс. Иначе бейдж расходился бы
         * с серверным фильтром `busy`.
         */
        esliJdemRunner() {
            return (item: Unit): boolean => {
                if (item.zanyat === true) {
                    return true;
                }

                return estAktivniyProzes(item.prozesi);
            }
        },
        /** Активен ли процесс юнита: лоадер и подпись текущей задачи. */
        esliEstAktivniyProzes() {
            return (item: Unit): boolean => {
                return estAktivniyProzes(item.prozesi);
            }
        },
        /** Прогресс активного процесса для подсказки на карточке. */
        progressProzesaUnita() {
            return (item: Unit): UnitProcessProgress | null => {
                return progressProzesa(item.prozesi);
            }
        },
        nazvanieTekusheiZadachi() {
            return (item: Unit): string | null => {
                return nazvanieAktivnoiZadachi(item.prozesi);
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
        },
        /** Есть ли активные условия фильтра (сортировка не считается). */
        estAktivnieFiltri(): boolean {
            return estAktivnieUsloviya(this.nastroikiSpiska.filter);
        },
        /** Количество активных условий фильтра. */
        kolichestvoAktivnihFiltrov(): number {
            return poschitatAktivnieUsloviya(this.nastroikiSpiska.filter);
        },
        /** Чипы активных фильтров для полосы над списком. */
        aktivnieFiltri(): UnitFilterChip[] {
            const filter = this.nastroikiSpiska.filter;
            const chipi: UnitFilterChip[] = [];

            if (filter.search !== null) {
                chipi.push({key: "search"});
            }
            if (filter.name !== null) {
                chipi.push({key: "name"});
            }
            if (filter.branch !== null) {
                chipi.push({key: "branch"});
            }
            if (filter.projectId !== null) {
                const proekt = this.proekti.spisok.find((item: Proekt) => item.value === filter.projectId);
                chipi.push({key: "projectId", label: proekt?.label});
            }
            if (filter.onlyMine) {
                chipi.push({key: "onlyMine"});
            }
            filter.statuses.forEach((status: UnitFilterStatus) => {
                chipi.push({key: "statuses", value: status});
            });
            if (filter.unitId !== null) {
                chipi.push({key: "unitId", label: this.nazvaniyaUnitov[filter.unitId]});
            }
            filter.unitIds.forEach((unitId: string) => {
                chipi.push({key: "unitIds", value: unitId, label: this.nazvaniyaUnitov[unitId]});
            });

            return chipi;
        },
        /**
         * Счётчики статусов по текущей выборке.
         *
         * Считаются той же функцией, что и бейджи карточек, поэтому фильтр
         * и статусы в списке не расходятся.
         */
        statusiSoSchetchikami(): Record<UnitFilterStatus, number> {
            const schetchiki: Record<UnitFilterStatus, number> = {
                running: 0,
                busy: 0,
                prepared: 0,
                stopped: 0,
                error: 0,
            };

            this.spisok.forEach((item: Unit) => {
                const sostoyanie = deriveUnitUiState({
                    zapushen: this.esliZapushen(item),
                    error: item.error,
                    zanyat: item.zanyat === true,
                    prozesAktiven: this.esliEstAktivniyProzes(item),
                    tekushayaZadacha: this.nazvanieTekusheiZadachi(item),
                    progress: this.progressProzesaUnita(item),
                    commands: item.commands,
                });

                if (sostoyanie.status !== "broken") {
                    schetchiki[sostoyanie.status] += 1;
                }
            });

            return schetchiki;
        },
        /** Список мог быть обрезан лимитом — нужен предупреждающий текст. */
        obrezanSpisok(): boolean {
            return this.spisok.length >= this.nastroikiSpiska.limit;
        }
    }
})
