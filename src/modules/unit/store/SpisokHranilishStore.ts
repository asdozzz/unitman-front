import { defineStore } from 'pinia';
import HranilishaService from "@/modules/unit/services/HranilishaService";
import {Notify} from "quasar";
import type {Hranilishe} from "@/modules/unit/store/SpisokHranilish/model/Hranilishe";
import {safeJsonParse} from "@/utils/json";
import {
    DEFAULT_HRANILISHA_FILTERS,
    normalizovatHranilishaFiltri,
    type HranilishaFilterChip,
    type HranilishaFilterStatus,
    type HranilishaFiltri,
} from "@/modules/unit/store/SpisokHranilish/model/HranilishaFiltri";

type NastroikiSpiska = {
    filter: HranilishaFiltri;
    limit: number;
    offset: number;
}

/** Значение типа для селекта фильтра. */
export type TipHranilisha = {
    value: string;
    label: string;
}

export type SpisokHranilishState = {
    nastroikiSpiska: NastroikiSpiska;
    spisok: Hranilishe[];
    loaderSpiskaHranilish: boolean;
    oshibkaZagruzkiSpiska: string | null;
    loaderObnovleniyaHranilisha: boolean;
}

const FILTER_HRANILISH_STORAGE_KEY = 'FILTER_HRANILISH_STORAGE_KEY';

/** Есть ли в фильтре хотя бы одно условие (сортировка условием не считается). */
function estAktivnieUsloviya(filter: HranilishaFiltri): boolean {
    return filter.search !== null
        || filter.type !== null
        || filter.statuses.length > 0;
}

/** Совпадает ли репозиторий поисковой подстроке по названию или URL. */
function sootvetstvuetPoisk(item: Hranilishe, stroka: string): boolean {
    const poisk = stroka.toLowerCase();

    return item.name.toLowerCase().includes(poisk)
        || item.repoUrl.toLowerCase().includes(poisk);
}

/** Совпадает ли репозиторий выбранным статусам подтверждения. */
function sootvetstvuetStatusam(item: Hranilishe, statusi: HranilishaFilterStatus[]): boolean {
    if (statusi.length === 0) {
        return true;
    }

    return statusi.some((status: HranilishaFilterStatus) => {
        return status === "confirmed" ? item.confirmed : !item.confirmed;
    });
}

export const useSpisokHranilishStore = defineStore('SpisokHranilishStore', {
    state: (): SpisokHranilishState => {
        const nastroikiIzLocalStorageAsJson = localStorage.getItem(FILTER_HRANILISH_STORAGE_KEY);

        // Сохранённые настройки могли быть записаны старой версией приложения:
        // битый JSON и произвольная форма фильтра не должны ронять приложение.
        const sohranennieNastroiki = nastroikiIzLocalStorageAsJson
            ? safeJsonParse<Partial<NastroikiSpiska>>(nastroikiIzLocalStorageAsJson)
            : undefined;

        return {
            nastroikiSpiska: {
                filter: normalizovatHranilishaFiltri(sohranennieNastroiki?.filter),
                limit: typeof sohranennieNastroiki?.limit === "number"
                    ? sohranennieNastroiki.limit
                    : 100,
                offset: typeof sohranennieNastroiki?.offset === "number"
                    ? sohranennieNastroiki.offset
                    : 0,
            },
            spisok: [],
            loaderSpiskaHranilish: false,
            oshibkaZagruzkiSpiska: null,
            loaderObnovleniyaHranilisha: false,
        };
    },
    getters: {
        /** Уникальные типы из загруженного списка — опции селекта фильтра. */
        tipiHranilish(): TipHranilisha[] {
            const tipi = new Set<string>();

            this.spisok.forEach((item: Hranilishe) => {
                if (item.type !== "") {
                    tipi.add(item.type);
                }
            });

            return Array.from(tipi)
                .sort((a: string, b: string) => a.localeCompare(b))
                .map((type: string) => ({value: type, label: type}));
        },
        /** Список после клиентской фильтрации и сортировки. */
        vidimieHranilisha(): Hranilishe[] {
            const filter = this.nastroikiSpiska.filter;
            const rezultat = this.spisok.filter((item: Hranilishe) => {
                const poisk = filter.search;

                if (poisk !== null && !sootvetstvuetPoisk(item, poisk)) {
                    return false;
                }

                if (filter.type !== null && item.type !== filter.type) {
                    return false;
                }

                return sootvetstvuetStatusam(item, filter.statuses);
            });

            return rezultat.sort((a: Hranilishe, b: Hranilishe) => {
                if (filter.sort === "type_asc") {
                    return a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
                }

                return a.name.localeCompare(b.name);
            });
        },
        /** Есть ли активные условия фильтра (сортировка не считается). */
        estAktivnieFiltri(): boolean {
            return estAktivnieUsloviya(this.nastroikiSpiska.filter);
        },
        /** Чипы активных фильтров для полосы над списком. */
        aktivnieFiltri(): HranilishaFilterChip[] {
            const filter = this.nastroikiSpiska.filter;
            const chipi: HranilishaFilterChip[] = [];

            if (filter.search !== null) {
                chipi.push({key: "search"});
            }
            if (filter.type !== null) {
                chipi.push({key: "type", value: filter.type, label: filter.type});
            }
            filter.statuses.forEach((status: HranilishaFilterStatus) => {
                chipi.push({key: "statuses", value: status});
            });

            return chipi;
        },
        /** Счётчики статусов подтверждения по текущей выборке. */
        statusiSoSchetchikami(): Record<HranilishaFilterStatus, number> {
            const schetchiki: Record<HranilishaFilterStatus, number> = {
                confirmed: 0,
                unconfirmed: 0,
            };

            this.spisok.forEach((item: Hranilishe) => {
                if (item.confirmed) {
                    schetchiki.confirmed += 1;
                } else {
                    schetchiki.unconfirmed += 1;
                }
            });

            return schetchiki;
        },
        /** Список мог быть обрезан лимитом — нужен предупреждающий текст. */
        obrezanSpisok(): boolean {
            return this.spisok.length >= this.nastroikiSpiska.limit;
        },
    },
    actions: {
        /** Сохраняет настройки списка в localStorage. */
        sohranitNastroiki(): void {
            try {
                localStorage.setItem(FILTER_HRANILISH_STORAGE_KEY, JSON.stringify(this.nastroikiSpiska));
            } catch {
                // Приватный режим или переполненное хранилище не должны
                // ломать работу со списком — фильтр просто не запомнится.
            }
        },
        /**
         * Применяет частичное изменение фильтра.
         *
         * Фильтрация клиентская, поэтому повторный запрос списка не нужен:
         * меняется только `nastroikiSpiska.filter`.
         */
        primenitFiltri(patch: Partial<HranilishaFiltri>): void {
            this.nastroikiSpiska.filter = normalizovatHranilishaFiltri({
                ...this.nastroikiSpiska.filter,
                ...patch,
            });
            this.sohranitNastroiki();
        },
        /** Сбрасывает фильтр к значениям по умолчанию. */
        sbrozitFiltri(): void {
            this.nastroikiSpiska.filter = {
                ...DEFAULT_HRANILISHA_FILTERS,
                statuses: [],
            };
            this.sohranitNastroiki();
        },
        async poluchitSpisokHranilish() {
            this.loaderSpiskaHranilish = true;
            const response = await HranilishaService.list({
                limit: this.nastroikiSpiska.limit,
                offset: this.nastroikiSpiska.offset,
            });
            if (response.status === "success") {
                this.spisok = response.data;
                this.oshibkaZagruzkiSpiska = null;
            } else if (response.status === "fail") {
                this.spisok = [];
                this.oshibkaZagruzkiSpiska = response.data.message;
            } else if (response.status === "error") {
                this.spisok = [];
                this.oshibkaZagruzkiSpiska = response.message;
            }

            this.loaderSpiskaHranilish = false;

            return response;
        },
        async activirovatHranilishe(repoId: string) {
            this.loaderObnovleniyaHranilisha = true;

            const response = await HranilishaService.confirm({ repoId })
            this.loaderObnovleniyaHranilisha = false;
            if (response.status === "success") {
                this.poluchitSpisokHranilish();
            } else if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            return response;
        },
        async udalitHranilishe(repoId: string) {
            this.loaderObnovleniyaHranilisha = true;

            const response = await HranilishaService.delete({ repoId })
            this.loaderObnovleniyaHranilisha = false;
            if (response.status === "success") {
                this.poluchitSpisokHranilish();
            } else if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            return response;
        },
    }
})
