import { defineStore } from 'pinia';
import ProektiService from "@/modules/unit/services/ProektiService";
import type {Proekt} from "@/modules/unit/store/SpisokProektov/model/Proekt";
import {
    DEFAULT_PROEKT_FILTERS,
    normalizovatProektFiltri,
    type ProektFilterChip,
    type ProektFilterStatus,
    type ProektFiltri,
} from "@/modules/unit/store/SpisokProektov/model/ProektFiltri";
import {deriveProektUiStatus, type ProektUiStatus} from "@/modules/unit/utils/proektStatus";
import {safeJsonParse} from "@/utils/json";

import {Notify} from "quasar";

/**
 * Задержка склейки серии событий об одном проекте.
 *
 * Одно действие пользователя порождает несколько доменных событий (например,
 * смена состояния во время сборки), и без склейки на каждое уходил бы
 * отдельный запрос чтения проекта.
 */
const ZADERZHKA_OBRABOTKI_SOBITIY_PROEKTA = 300;

/** Ключ localStorage с сохранёнными фильтрами и лимитом списка. */
const FILTER_PROEKTOV_STORAGE_KEY = 'FILTER_PROEKTOV_STORAGE_KEY';

/** Таймеры отложенного перезапроса проекта по его ид. */
const tajmeriObnovleniyaProektov = new Map<string, ReturnType<typeof setTimeout>>();

/** Настройки списка: фильтр и клиентская пагинация. */
type NastroikiSpiska = {
    filter: ProektFiltri;
    limit: number;
    offset: number;
};

export type SpisokProektovState = {
    nastroikiSpiska: NastroikiSpiska;
    spisok: Proekt[];
    loaderSpiskaProektov: boolean;
    oshibkaZagruzkiSpiska: string | null;
    loaderObnovleniyaProekta: boolean;
    projectLoaders: Record<string, boolean>;
}

/** Есть ли в фильтре хотя бы одно условие (сортировка условием не считается). */
function estAktivnieUsloviya(filter: ProektFiltri): boolean {
    return filter.search !== null
        || filter.states.length > 0
        || filter.onlyActive;
}

/** Приоритет состояния для сортировки `state_priority`: busy → error → new. */
function prioritetSostoyaniya(proekt: Proekt): number {
    const status: ProektUiStatus = deriveProektUiStatus(proekt).status;

    switch (status) {
        case "busy":
            return 0;
        case "error":
            return 1;
        case "new":
            return 2;
    }
}

/** Сравнение строк без учёта регистра с устойчивым порядком. */
function sravnitStroki(a: string, b: string): number {
    return a.localeCompare(b, "ru", {sensitivity: "base"});
}

/**
 * Фильтрует и сортирует список проектов на клиенте.
 *
 * Серверных фильтров у `/project/list` нет, поэтому всё считается здесь.
 */
function otfiltrovatProekti(spisok: Proekt[], filter: ProektFiltri): Proekt[] {
    const poisk = filter.search === null ? null : filter.search.trim().toLowerCase();
    const vidannieStatusi = new Set<ProektFilterStatus>(filter.states);

    const rezultat = spisok.filter((proekt: Proekt) => {
        if (poisk !== null && poisk !== "") {
            const sovpadenie = proekt.name.toLowerCase().includes(poisk)
                || proekt.code.toLowerCase().includes(poisk);

            if (!sovpadenie) {
                return false;
            }
        }

        if (vidannieStatusi.size > 0 && !vidannieStatusi.has(proekt.state)) {
            return false;
        }

        if (filter.onlyActive && !proekt.isActive) {
            return false;
        }

        return true;
    });

    return rezultat.sort((a: Proekt, b: Proekt) => {
        switch (filter.sort) {
            case "code_asc":
                return sravnitStroki(a.code, b.code) || sravnitStroki(a.name, b.name);
            case "state_priority": {
                const raznica = prioritetSostoyaniya(a) - prioritetSostoyaniya(b);

                return raznica !== 0 ? raznica : sravnitStroki(a.name, b.name);
            }
            case "name_asc":
            default:
                return sravnitStroki(a.name, b.name);
        }
    });
}

export const useSpisokProektovStore = defineStore('SpisokProektovStore', {
    state: (): SpisokProektovState => {
        const nastroikiIzLocalStorageAsJson = localStorage.getItem(FILTER_PROEKTOV_STORAGE_KEY);

        // Сохранённые настройки могли быть записаны старой версией приложения:
        // битый JSON и произвольная форма фильтра не должны ронять приложение.
        const sohranennieNastroiki = nastroikiIzLocalStorageAsJson
            ? safeJsonParse<Partial<NastroikiSpiska>>(nastroikiIzLocalStorageAsJson)
            : undefined;

        const nastroiki: NastroikiSpiska = {
            filter: normalizovatProektFiltri(sohranennieNastroiki?.filter),
            limit: typeof sohranennieNastroiki?.limit === "number"
                ? sohranennieNastroiki.limit
                : 100,
            offset: typeof sohranennieNastroiki?.offset === "number"
                ? sohranennieNastroiki.offset
                : 0,
        };

        return {
            nastroikiSpiska: nastroiki,
            spisok: [],
            loaderSpiskaProektov: false,
            oshibkaZagruzkiSpiska: null,
            loaderObnovleniyaProekta: false,
            projectLoaders: {}
        }
    },
    getters: {
        getProjectLoader() {
            const store = this;
            return (id: string): boolean => {
                if (!store.projectLoaders.hasOwnProperty(id)) {
                    return false;
                }

                return store.projectLoaders[id];
            }
        },
        poluchitProektPoId: (state) => {
            return (id: string) => state.spisok.find((proekt: Proekt) => proekt.id === id);
        },
        /** Есть ли проект в текущей выборке списка. */
        issetProekt() {
            const store = this;
            return (id: string): boolean => {
                return store.spisok.some((proekt: Proekt) => proekt.id === id);
            }
        },
        poluchitStateProektaPoId() {
            const store = this;
            return (id: string): string => {
                const proekt = store.poluchitProektPoId(id);

                if (!proekt) {
                    return "";
                }

                return proekt.state;
            }
        },
        proektGdetResultatUdaleniya() {
            const store = this;
            return (id: string): boolean => {
                const state = store.poluchitStateProektaPoId(id);
                return state === 'REMOVE_PENDING';
            }
        },
        proektSloman() {
            const store = this;
            return (id: string): boolean => {
                const state = store.poluchitStateProektaPoId(id);
                return state === 'REMOVE_ERROR';
            }
        },
        /** Отфильтрованный и отсортированный список для сетки карточек. */
        vidimieProekti(): Proekt[] {
            return otfiltrovatProekti(this.spisok, this.nastroikiSpiska.filter);
        },
        /** Есть ли активные условия фильтра (сортировка не считается). */
        estAktivnieFiltri(): boolean {
            return estAktivnieUsloviya(this.nastroikiSpiska.filter);
        },
        /** Чипы активных фильтров для полосы над списком. */
        aktivnieFiltri(): ProektFilterChip[] {
            const filter = this.nastroikiSpiska.filter;
            const chipi: ProektFilterChip[] = [];

            if (filter.search !== null) {
                chipi.push({key: "search"});
            }
            if (filter.onlyActive) {
                chipi.push({key: "onlyActive"});
            }
            filter.states.forEach((status: ProektFilterStatus) => {
                chipi.push({key: "states", value: status});
            });

            return chipi;
        },
        /** Счётчики состояний по текущей выборке (без учёта активных фильтров). */
        statusiSoSchetchikami(): Record<ProektFilterStatus, number> {
            const schetchiki: Record<ProektFilterStatus, number> = {
                NEW: 0,
                REMOVE_PENDING: 0,
                REMOVE_ERROR: 0,
            };

            this.spisok.forEach((proekt: Proekt) => {
                schetchiki[proekt.state] += 1;
            });

            return schetchiki;
        },
        /** Список мог быть обрезан лимитом — нужен предупреждающий текст. */
        obrezanSpisok(): boolean {
            return this.spisok.length >= this.nastroikiSpiska.limit;
        }
    },
    actions: {
        /** Сохраняет настройки списка в localStorage. */
        sohranitNastroiki(): void {
            try {
                localStorage.setItem(FILTER_PROEKTOV_STORAGE_KEY, JSON.stringify(this.nastroikiSpiska));
            } catch {
                // Приватный режим или переполненное хранилище не должны
                // ломать работу со списком — фильтр просто не запомнится.
            }
        },
        /**
         * Применяет частичное изменение фильтра.
         *
         * Фильтрация клиентская, поэтому перезапрашивать список не нужно:
         * достаточно перезаписать фильтр и сохранить настройки.
         */
        async primenitFiltri(patch: Partial<ProektFiltri>): Promise<void> {
            this.nastroikiSpiska.filter = normalizovatProektFiltri({
                ...this.nastroikiSpiska.filter,
                ...patch,
            });
            this.sohranitNastroiki();
        },
        /** Сбрасывает фильтр к значениям по умолчанию. */
        async sbrozitFiltri(): Promise<void> {
            this.nastroikiSpiska.filter = {
                ...DEFAULT_PROEKT_FILTERS,
                states: [],
            };
            this.sohranitNastroiki();
        },
        startProjectLoader(id: string) {
            this.projectLoaders[id] = true;
        },
        stopProjectLoader(id: string) {
            this.projectLoaders[id] = false;
        },
        /**
         * Убирает проект из списка по событию канала `spisok_proektov`.
         *
         * Перезапрашивать весь список не нужно: бэкенд уже прислал ид
         * удалённого проекта.
         */
        udalitProektIzSpiska(id: string): void {
            // Удалённый проект не должен «вернуться» отложенным обновлением.
            const tajmer = tajmeriObnovleniyaProektov.get(id);

            if (tajmer !== undefined) {
                clearTimeout(tajmer);
                tajmeriObnovleniyaProektov.delete(id);
            }

            const index = this.spisok.findIndex((proekt: Proekt) => proekt.id === id);

            if (index > -1) {
                this.spisok.splice(index, 1);
            }
        },
        /**
         * Планирует обновление проекта по событию `OBNOVLEN`.
         *
         * Одно действие порождает серию событий (например, смену состояния
         * во время сборки), поэтому запрос откладывается и склеивается:
         * к бэкенду уходит один запрос на пачку. Отложенный запрос снимается
         * при удалении проекта.
         */
        zaplanirovatObnovlenieProekta(id: string): void {
            const uzheZaplanirovan = tajmeriObnovleniyaProektov.get(id);

            if (uzheZaplanirovan !== undefined) {
                clearTimeout(uzheZaplanirovan);
            }

            tajmeriObnovleniyaProektov.set(id, setTimeout(() => {
                tajmeriObnovleniyaProektov.delete(id);

                void this.obnovitProekt(id);
            }, ZADERZHKA_OBRABOTKI_SOBITIY_PROEKTA));
        },
        /**
         * Снимает все отложенные обновления.
         *
         * Вызывается при уходе со страницы списка: таймеры живут на уровне
         * модуля и иначе дожили бы до размонтирования стора, дёргая бэкенд
         * уже без открытого экрана.
         */
        otmenitObnovleniyaProektov(): void {
            tajmeriObnovleniyaProektov.forEach((tajmer: ReturnType<typeof setTimeout>) => {
                clearTimeout(tajmer);
            });

            tajmeriObnovleniyaProektov.clear();
        },
        /**
         * Обновляет один проект по событию `OBNOVLEN`.
         *
         * Запрашивается именно проект, а не весь список: перезагрузка списка
         * на каждое изменение дёргала бы бэкенд впустую и сбрасывала бы
         * состояние карточек. Проект, которого нет в текущем списке (чужой
         * или уже удалённый), не подменяется и не добавляется.
         */
        async obnovitProekt(id: string) {
            if (!this.issetProekt(id)) {
                return null;
            }

            this.startProjectLoader(id);
            const response = await ProektiService.read(id);

            if (response.status === "success") {
                const actualniyIndex = this.spisok.findIndex((proekt: Proekt) => proekt.id === id);

                // Пока шёл запрос, проект могли удалить из списка.
                if (actualniyIndex > -1) {
                    this.spisok[actualniyIndex] = response.data;
                }
            }

            this.stopProjectLoader(id);

            return response;
        },
        async poluchitSpisokProektov() {
            this.loaderSpiskaProektov = true;
            const response = await ProektiService.list({
                limit: this.nastroikiSpiska.limit,
                offset: this.nastroikiSpiska.offset,
            });
            if (response.status === "success") {
                this.spisok = response.data;
            } else if (response.status === "fail") {
                this.spisok = [];
                this.oshibkaZagruzkiSpiska = response.data.message;
            } else if (response.status === "error") {
                this.spisok = [];
                this.oshibkaZagruzkiSpiska = response.message;
            }

            this.loaderSpiskaProektov = false;

            return response;
        },
        async udalitProekt(id: string) {
            this.startProjectLoader(id);

            const response = await ProektiService.udalit({ id })
            this.stopProjectLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisokProektov();

            return response;
        },
        async udalitSlomaniiProekt(id: string) {
            this.startProjectLoader(id);

            const response = await ProektiService.udalitSlomaniiProekt({ id })
            this.stopProjectLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisokProektov();

            return response;
        },
        async aktivirovat(id: string) {
            this.stopProjectLoader(id);

            const response = await ProektiService.aktivirovat({ id })
            this.stopProjectLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisokProektov();

            return response;
        },
        async deaktivirovat(id: string) {
            this.stopProjectLoader(id);

            const response = await ProektiService.deaktivirovat({ id })
            this.stopProjectLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisokProektov();

            return response;
        },
    }
})
