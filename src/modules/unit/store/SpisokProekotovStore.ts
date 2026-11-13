import { defineStore } from 'pinia';
import ProektiService from "@/modules/unit/services/ProektiService";
import type {Proekt} from "@/modules/unit/store/SpisokProektov/model/Proekt";

import {Notify} from "quasar";

/**
 * Задержка склейки серии событий об одном проекте.
 *
 * Одно действие пользователя порождает несколько доменных событий (например,
 * смена состояния во время сборки), и без склейки на каждое уходил бы
 * отдельный запрос чтения проекта.
 */
const ZADERZHKA_OBRABOTKI_SOBITIY_PROEKTA = 300;

/** Таймеры отложенного перезапроса проекта по его ид. */
const tajmeriObnovleniyaProektov = new Map<string, ReturnType<typeof setTimeout>>();

export type SpisokProektovState = {
    spisok: Proekt[];
    loaderSpiskaProektov: boolean;
    oshibkaZagruzkiSpiska: string | null;
    loaderObnovleniyaProekta: boolean;
    projectLoaders: Record<string, boolean>;
}

export const useSpisokProektovStore = defineStore('SpisokProektovStore', {
    state: (): SpisokProektovState => {
        return {
            spisok:[],
            loaderSpiskaProektov:false,
            oshibkaZagruzkiSpiska: null,
            loaderObnovleniyaProekta:false,
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
        proektGdetResultatSborki() {
            const store = this;
            return (id: string): boolean => {
                const state = store.poluchitStateProektaPoId(id);
                return state === 'BUILD_PENDING';
            }
        },
        proektGdetResultatUdaleniya() {
            const store = this;
            return (id: string): boolean => {
                const state = store.poluchitStateProektaPoId(id);
                return state === 'REMOVE_PENDING';
            }
        },
        proektGdetResultatiOtRunnera() {
            const store = this;
            return (id: string): boolean => {
                return store.proektGdetResultatSborki(id) || store.proektGdetResultatUdaleniya(id);
            }
        },
        proektSloman() {
            const store = this;
            return (id: string): boolean => {
                const state = store.poluchitStateProektaPoId(id);
                return state === 'REMOVE_ERROR';
            }
        },
        proektNeSobirali() {
            const store = this;
            return (id: string): boolean => {
                const state = store.poluchitStateProektaPoId(id);
                return state === 'NEW' || state === 'BUILD_ERROR';
            }
        },
    },
    actions: {
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
            const response = await ProektiService.list();
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
        async sobrat(id: string) {
            this.stopProjectLoader(id);

            const response = await ProektiService.sobrat({ id })
            this.stopProjectLoader(id);
            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisokProektov();

            return response;
        },
    }
})
