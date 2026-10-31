import {defineStore} from "pinia";
import UnitiService from "@/modules/unit/services/UnitiService";
import type {PomoschnikSsylki, Unit} from "@/modules/unit/store/SpisokUnitov/model/Unit";

/**
 * Помощник с гарантированно заполненными полями — только такой можно
 * отправить в `poluchitSsylkuPoPomoschniku`.
 */
export type ZapolnennyPomoschnikSsylki = {
    projectId: string;
    service: string;
    port: number;
};

/**
 * Проверяет, что в помощнике заданы все обязательные поля запроса.
 * Служит type guard'ом для сужения `PomoschnikSsylki` до
 * {@link ZapolnennyPomoschnikSsylki}.
 */
export function pomoschnikZapolnen(helper: PomoschnikSsylki | null | undefined): helper is ZapolnennyPomoschnikSsylki {
    return !!helper && !!helper.projectId && !!helper.service && helper.port !== null && helper.port !== undefined;
}

/**
 * Стор помощника подстановки ссылки.
 *
 * Помощник (`helper`) приходит в описании переменной конфигурации юнита
 * и содержит проект/сервис/порт юнита, ссылку на который нужно подставить.
 * Стор загружает список юнитов выбранного проекта и запрашивает готовую
 * ссылку через `poluchitSsylkuPoPomoschniku`.
 */
type StorPomoschnikaSsylkiState = {
    /** Проект, юниты которого лежат в `spisok`; null, если список не загружен. */
    projectId: string | null;
    spisok: Unit[];
    loaderSpiska: boolean;
    loaderSsylki: boolean;
    oshibka: string | null;
}

export const useStorPomoschnikaSsylki = defineStore('StorPomoschnikaSsylki', {
    state: (): StorPomoschnikaSsylkiState => {
        return {
            projectId: null,
            spisok: [],
            loaderSpiska: false,
            loaderSsylki: false,
            oshibka: null,
        };
    },
    actions: {
        /**
         * Загружает юнитов проекта из помощника. Повторный запрос для того же
         * проекта не выполняется, если список уже загружен.
         */
        async poluchitSpisokUnitovProekta(projectId: string) {
            if (this.projectId === projectId && this.spisok.length > 0) {
                return;
            }

            this.projectId = projectId;
            this.loaderSpiska = true;
            this.oshibka = null;
            this.spisok = [];

            // Ограничение проекта задаётся фильтром из помощника;
            // увеличенный limit нужен, чтобы в выборку попали все юниты проекта.
            const response = await UnitiService.list({filter: {projectId}, limit: 1000});

            this.loaderSpiska = false;
            if (response.status === "success") {
                this.spisok = response.data;
            } else if (response.status === "fail") {
                this.oshibka = response.data.message;
            } else if (response.status === "error") {
                this.oshibka = response.message;
            }
        },
        /**
         * Принудительно перезагружает список юнитов проекта,
         * игнорируя кеш предыдущей загрузки.
         */
        async obnovitSpisokUnitovProekta(projectId: string) {
            this.projectId = null;

            await this.poluchitSpisokUnitovProekta(projectId);
        },
        /**
         * Запрашивает ссылку на сервис выбранного юнита.
         * Возвращает ссылку либо `null`, если получить её не удалось
         * (текст ошибки при этом кладётся в `oshibka`).
         */
        async poluchitSsylku(helper: PomoschnikSsylki, targetUnitId: string): Promise<string | null> {
            if (!pomoschnikZapolnen(helper)) {
                this.oshibka = "helper is not filled";
                return null;
            }

            this.loaderSsylki = true;
            this.oshibka = null;

            const response = await UnitiService.poluchitSsylkuPoPomoschniku({
                projectId: helper.projectId,
                service: helper.service,
                port: helper.port,
                targetUnitId,
            });

            this.loaderSsylki = false;
            if (response.status === "success") {
                return response.data.link;
            }
            if (response.status === "fail") {
                this.oshibka = response.data.message;
            } else if (response.status === "error") {
                this.oshibka = response.message;
            }

            return null;
        },
        ochistitOshibku() {
            this.oshibka = null;
        },
    }
});
