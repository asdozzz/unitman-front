import { defineStore } from 'pinia';
import type PolzovatelDlyAdmininstrirovaniya from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/model/PolzovatelDlyAdmininstrirovaniya";
import AccountService from "@/modules/account/services/AccountService";
import {Notify} from "quasar";
import {safeJsonParse} from "@/utils/json";
import {
    DEFAULT_POLZOVATEL_FILTERS,
    normalizovatPolzovatelFiltri,
    type PolzovatelFilterChip,
    type PolzovatelFilterStatus,
    type PolzovatelFiltri,
    type PolzovatelSort,
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/model/PolzovatelFiltri";

type NastroikiSpiska = {
    filter: PolzovatelFiltri;
    limit: number;
    offset: number;
};

export type SpisokPolzovateleiDlyAdmininstrirovaniyaState = {
    nastroikiSpiska: NastroikiSpiska;
    spisok: PolzovatelDlyAdmininstrirovaniya[];
    loaderSpiska: boolean;
    oshibkaPolucheniyaSpiska: string;
    loaderObnovleniya: boolean;
};

const FILTER_POLZOVATELEI_STORAGE_KEY = 'FILTER_POLZOVATELEI_STORAGE_KEY';

/** Задержка коалесценции запросов списка при быстром вводе. */
const ZADERZHKA_DEBOUNCE_MS = 300;

/**
 * Состояние дебаунса живёт в замыкании модуля, а не в реактивном state:
 * таймер не должен попадать в сохраняемое состояние стора.
 */
let tailerZaprosa: ReturnType<typeof setTimeout> | null = null;

/** Снимает отложенный запрос, если он ещё не успел выполниться. */
function otmenitOzhidayushiyZapros(): void {
    if (tailerZaprosa !== null) {
        clearTimeout(tailerZaprosa);
        tailerZaprosa = null;
    }
}

/** Есть ли в фильтре хотя бы одно условие (сортировка условием не считается). */
function estAktivnieUsloviya(filter: PolzovatelFiltri): boolean {
    return filter.search !== null
        || filter.statuses.length > 0
        || filter.role !== null;
}

/** Разбирает строку ролей вида `ROLE_USER,ROLE_ADMIN` в список. */
function razobratRoli(roles: string): string[] {
    return roles
        .split(',')
        .map((role: string) => role.trim())
        .filter((role: string) => role !== '');
}

/** Статус аккаунта в терминах фильтра. */
function statusPolzovatelya(item: PolzovatelDlyAdmininstrirovaniya): PolzovatelFilterStatus {
    if (item.isBlocked) {
        return 'blocked';
    }

    if (item.emailVerified === false) {
        return 'unverified';
    }

    return item.pendingActivation ? 'pending' : 'active';
}

/** Сравнивает строки для стабильной клиентской сортировки. */
function sravnitStroki(a: string, b: string): number {
    return a.localeCompare(b, undefined, {sensitivity: 'base'});
}

export const useSpisokPolzovateleiDlyAdmininstrirovaniyaStore = defineStore('SpisokPolzovateleiDlyAdmininstrirovaniyaStore', {
    state: (): SpisokPolzovateleiDlyAdmininstrirovaniyaState => {
        const nastroikiIzLocalStorageAsJson = localStorage.getItem(FILTER_POLZOVATELEI_STORAGE_KEY);

        // Сохранённые настройки могли быть записаны старой версией приложения:
        // битый JSON и произвольная форма фильтра не должны ронять приложение.
        const sohranennieNastroiki = nastroikiIzLocalStorageAsJson
            ? safeJsonParse<Partial<NastroikiSpiska>>(nastroikiIzLocalStorageAsJson)
            : undefined;

        const nastroiki: NastroikiSpiska = {
            filter: normalizovatPolzovatelFiltri(sohranennieNastroiki?.filter),
            limit: typeof sohranennieNastroiki?.limit === 'number'
                ? sohranennieNastroiki.limit
                : 100,
            offset: typeof sohranennieNastroiki?.offset === 'number'
                ? sohranennieNastroiki.offset
                : 0,
        };

        return {
            nastroikiSpiska: nastroiki,
            spisok: [],
            loaderSpiska: false,
            oshibkaPolucheniyaSpiska: '',
            loaderObnovleniya: false,
        };
    },
    actions: {
        /** Сохраняет настройки списка в localStorage. */
        sohranitNastroiki(): void {
            try {
                localStorage.setItem(FILTER_POLZOVATELEI_STORAGE_KEY, JSON.stringify(this.nastroikiSpiska));
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
        async primenitFiltri(patch: Partial<PolzovatelFiltri>, immediate = true): Promise<void> {
            this.nastroikiSpiska.filter = normalizovatPolzovatelFiltri({
                ...this.nastroikiSpiska.filter,
                ...patch,
            });
            this.sohranitNastroiki();

            if (immediate) {
                await this.poluchitPolzovateleiDlyAdmininstrirovaniya();
            } else {
                this.zaprositPolzovateleiDlyAdmininstrirovaniya();
            }
        },
        /** Сбрасывает фильтр к значениям по умолчанию и перезапрашивает список. */
        async sbrozitFiltri(): Promise<void> {
            this.nastroikiSpiska.filter = {
                ...DEFAULT_POLZOVATEL_FILTERS,
                statuses: [],
            };
            this.sohranitNastroiki();

            await this.poluchitPolzovateleiDlyAdmininstrirovaniya();
        },
        /** Меняет сортировку списка. */
        async ustanovitSort(sort: PolzovatelSort): Promise<void> {
            await this.primenitFiltri({sort});
        },
        /** Немедленный запрос списка с серверным поиском по `filter.search`. */
        async poluchitPolzovateleiDlyAdmininstrirovaniya() {
            otmenitOzhidayushiyZapros();

            this.loaderSpiska = true;
            this.oshibkaPolucheniyaSpiska = '';

            const response = await AccountService.poluchitPolzovateleiDlyAdmininstrirovaniya(
                this.nastroikiSpiska.filter.search,
            );

            if (response.status === "success") {
                this.spisok = response.data;
            } else if (response.status === "fail") {
                this.spisok = [];
                this.oshibkaPolucheniyaSpiska = response.data.message;
            } else if (response.status === "error") {
                this.spisok = [];
                this.oshibkaPolucheniyaSpiska = response.message;
            }

            this.loaderSpiska = false;

            return response;
        },
        /**
         * Отложенный запрос списка: 300 мс коалесценции серверного поиска.
         *
         * Таймер живёт в замыкании модуля, поэтому не попадает в
         * сериализуемое состояние стора.
         */
        zaprositPolzovateleiDlyAdmininstrirovaniya(): void {
            otmenitOzhidayushiyZapros();

            tailerZaprosa = setTimeout(() => {
                tailerZaprosa = null;
                void this.poluchitPolzovateleiDlyAdmininstrirovaniya();
            }, ZADERZHKA_DEBOUNCE_MS);
        },
        async blokirovatPolzovatelya(accountId: string) {
            this.loaderObnovleniya = true;

            const response = await AccountService.blockirovkaPolzovatelya({ accountId });

            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.loaderObnovleniya = false;

            this.poluchitPolzovateleiDlyAdmininstrirovaniya();

            return response;
        },
        async razblokirovatPolzovatelya(accountId: string) {
            this.loaderObnovleniya = true;

            const response = await AccountService.razblockirovkaPolzovatelya({ accountId });

            this.loaderObnovleniya = false;

            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitPolzovateleiDlyAdmininstrirovaniya();

            return response;
        },
        async aktivirovatPolzovatelya(accountId: string) {
            this.loaderObnovleniya = true;

            const response = await AccountService.aktivirovatPolzovatelya({ accountId });

            this.loaderObnovleniya = false;

            if (response.status === "fail"){
                Notify.create(response.data.message);
            } else if (response.status === "error") {
                Notify.create(response.message);
            }

            this.poluchitPolzovateleiDlyAdmininstrirovaniya();

            return response;
        },
    },
    getters: {
        /**
         * Аккаунты после клиентской фильтрации и сортировки.
         *
         * `search` сервер уже учёл, поэтому здесь фильтруются статусы и роль,
         * а затем применяется выбранная сортировка.
         */
        vidimiePolzovateli(): PolzovatelDlyAdmininstrirovaniya[] {
            const filter = this.nastroikiSpiska.filter;

            const otfiltrovannie = this.spisok.filter((item: PolzovatelDlyAdmininstrirovaniya) => {
                if (filter.statuses.length > 0 && !filter.statuses.includes(statusPolzovatelya(item))) {
                    return false;
                }

                if (filter.role !== null && !razobratRoli(item.roles).includes(filter.role)) {
                    return false;
                }

                return true;
            });

            return [...otfiltrovannie].sort((a: PolzovatelDlyAdmininstrirovaniya, b: PolzovatelDlyAdmininstrirovaniya) => {
                if (filter.sort === 'nickname_asc') {
                    return sravnitStroki(a.nickname ?? a.email, b.nickname ?? b.email);
                }

                return sravnitStroki(a.email, b.email);
            });
        },
        /** Есть ли активные условия фильтра (сортировка не считается). */
        estAktivnieFiltri(): boolean {
            return estAktivnieUsloviya(this.nastroikiSpiska.filter);
        },
        /** Чипы активных фильтров для полосы над списком. */
        aktivnieFiltri(): PolzovatelFilterChip[] {
            const filter = this.nastroikiSpiska.filter;
            const chipi: PolzovatelFilterChip[] = [];

            if (filter.search !== null) {
                chipi.push({key: "search"});
            }
            if (filter.role !== null) {
                chipi.push({key: "role", label: filter.role});
            }
            filter.statuses.forEach((status: PolzovatelFilterStatus) => {
                chipi.push({key: "statuses", value: status});
            });

            return chipi;
        },
        /** Счётчики статусов по текущей выборке (серверный поиск учтён). */
        statusiSoSchetchikami(): Record<PolzovatelFilterStatus, number> {
            const schetchiki: Record<PolzovatelFilterStatus, number> = {
                active: 0,
                blocked: 0,
                pending: 0,
                unverified: 0,
            };

            this.spisok.forEach((item: PolzovatelDlyAdmininstrirovaniya) => {
                schetchiki[statusPolzovatelya(item)] += 1;
            });

            return schetchiki;
        },
        /** Уникальные роли из текущего списка — опции селекта роли. */
        roliPolzovatelei(): Array<{value: string; label: string}> {
            const roli = new Set<string>();

            this.spisok.forEach((item: PolzovatelDlyAdmininstrirovaniya) => {
                razobratRoli(item.roles).forEach((role: string) => roli.add(role));
            });

            return Array.from(roli)
                .sort((a: string, b: string) => sravnitStroki(a, b))
                .map((role: string) => ({value: role, label: role}));
        },
        /** Список мог быть обрезан лимитом — нужен предупреждающий текст. */
        obrezanSpisok(): boolean {
            return this.spisok.length >= this.nastroikiSpiska.limit;
        },
    },
});
