import {defineStore} from "pinia";
import OpenCodeService from "@/modules/opencode/services/OpenCodeService";
import {useStorSpiskaRekvizitovOpenCode} from "@/modules/account/store/SpisokRekvizitovOpenCode/StorSpiskaRekvizitovOpenCode";
import {useStorSpiskaSessiyOpenCode} from "@/modules/opencode/store/StorSpiskaSessiyOpenCode";
import UnitiService from "@/modules/unit/services/UnitiService";
import type {Unit} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import type {Schema} from "@/api/types";

type StorFormiSozdaniyaSessiiState = {
    otkrita: boolean;
    /** Заголовок необязателен: пустое значение бэкенд заполнит сам. */
    title: string;
    credentialId: string;
    /**
     * Юниты, к которым привязывается новая сессия.
     *
     * Первый юнит становится рабочей директорией сессии, остальные —
     * дополнительными корнями workspace. Пустой список допустим: сессия
     * создаётся без привязки, юнит можно прикрепить позже.
     */
    unitIds: string[];
    /** Доступные для выбора юниты (те, что видны пользователю в списке). */
    uniti: Unit[];
    loaderUnitov: boolean;
    oshibkaZagruzkiUnitov: string | null;
    loader: boolean;
    oshibkaOtBackenda: string | null;
};

/**
 * Стор диалога создания сессии.
 *
 * Реквизиты берутся из уже загруженного списка (он же показывается
 * в настройках профиля), а не запрашиваются повторно: без реквизитов
 * сессию создать нельзя, и диалог должен объяснить это до открытия.
 *
 * Юниты подгружаются отдельно через `/unit/list`, чтобы не тянуть в
 * модуль `opencode` сторы списка юнитов и их фильтры.
 */
export const useStorFormiSozdaniyaSessii = defineStore("StorFormiSozdaniyaSessii", {
    state: (): StorFormiSozdaniyaSessiiState => {
        return {
            otkrita: false,
            title: "",
            credentialId: "",
            unitIds: [],
            uniti: [],
            loaderUnitov: false,
            oshibkaZagruzkiUnitov: null,
            loader: false,
            oshibkaOtBackenda: null,
        };
    },

    getters: {
        /** Реквизиты для выпадающего списка. */
        rekvizity(): Schema<"OpenCodeCredential">[] {
            return useStorSpiskaRekvizitovOpenCode().spisok;
        },

        /** Сохранение невозможно без выбранных реквизитов или во время запроса. */
        mozhnoSohranit(state): boolean {
            return !state.loader && state.credentialId !== "";
        },
    },

    actions: {
        /**
         * Открыть диалог.
         *
         * @param unitIds юниты, которые нужно предвыбрать (например, при
         *   создании сессии из карточки юнита).
         */
        otkrit(unitIds: string[] = []) {
            const rekvizity = useStorSpiskaRekvizitovOpenCode().spisok;

            this.otkrita = true;
            this.title = "";
            this.credentialId = rekvizity.length > 0 ? rekvizity[0].id : "";
            this.unitIds = [...unitIds];
            this.oshibkaOtBackenda = null;
            this.loader = false;

            // Список мог ещё не загружаться, а предвыбранный юнит — не попасть
            // в уже загруженную страницу. В обоих случаях догружаем список,
            // не блокируя открытие диалога.
            const izvestnie = new Set(this.uniti.map((unit) => unit.id));
            const netPredvibranih = unitIds.some((id) => !izvestnie.has(id));

            if (this.uniti.length === 0 || netPredvibranih) {
                this.poluchitUniti();
            }
        },

        zakrit() {
            this.otkrita = false;
            this.oshibkaOtBackenda = null;
            this.loader = false;
        },

        /**
         * Загрузить юниты для выпадающего списка.
         *
         * Берём максимальную доступную страницу: в диалоге нужен обзорный
         * список, а не постраничная выдача.
         */
        async poluchitUniti() {
            this.loaderUnitov = true;
            this.oshibkaZagruzkiUnitov = null;

            const response = await UnitiService.list({ limit: 200, offset: 0 });

            this.loaderUnitov = false;

            if (response.status === "success") {
                this.uniti = response.data;

                // Предвыбранный юнит мог не попасть в первую страницу (например,
                // при создании сессии из карточки юнита). Догружаем такие юниты
                // по id, чтобы выбор не потерялся молча.
                const dostupnie = new Set(this.uniti.map((unit) => unit.id));
                const otsutstvuyushie = this.unitIds.filter((id) => !dostupnie.has(id));

                if (otsutstvuyushie.length > 0) {
                    const dopolnitelnie = await UnitiService.list({
                        filter: { unitIds: otsutstvuyushie },
                        limit: otsutstvuyushie.length,
                        offset: 0,
                    });

                    if (dopolnitelnie.status === "success") {
                        this.uniti = [...this.uniti, ...dopolnitelnie.data];
                    }
                }
            } else if (response.status === "fail") {
                this.oshibkaZagruzkiUnitov = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaZagruzkiUnitov = response.message;
            }
        },

        /**
         * Создать сессию.
         *
         * @returns идентификатор созданной сессии или `null`, если бэкенд отказал.
         */
        async sohranit(): Promise<string | null> {
            if (!this.mozhnoSohranit) {
                return null;
            }

            this.loader = true;
            this.oshibkaOtBackenda = null;

            const title = this.title.trim();

            const response = await OpenCodeService.sozdatSessiyu({
                credentialId: this.credentialId,
                // Пустая строка превратилась бы в сессию без названия — бэкенд
                // генерирует заголовок только при отсутствии поля.
                title: title === "" ? null : title,
                // Пустой массив не отправляем: бэкенд принимает либо `unitIds`,
                // либо `unit`, поэтому отсутствие поля означает «без юнитов».
                unitIds: this.unitIds.length > 0 ? [...this.unitIds] : undefined,
            });

            this.loader = false;

            if (response.status === "success") {
                this.otkrita = false;
                return response.data.id;
            }

            this.oshibkaOtBackenda = response.status === "fail" ? response.data.message : response.message;

            return null;
        },

        /**
         * Создать сессию и обновить список сессий.
         *
         * `sozdatSessiyu` возвращает только `IdHolder`, а не полную сессию
         * (нет заголовка, дат и подписи реквизитов), поэтому список
         * перезапрашивается — иначе в нём появилась бы строка без данных.
         */
        async sozdatISozdatVSpiske(): Promise<string | null> {
            const id = await this.sohranit();

            if (id !== null) {
                await useStorSpiskaSessiyOpenCode().poluchitSpisok();
            }

            return id;
        },
    },
});
