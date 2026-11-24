import {defineStore} from "pinia";
import ProektiService from "@/modules/unit/services/ProektiService";
import type {Schema} from "@/api/types";

/**
 * Номер последнего запроса списка веток.
 *
 * Поздний ответ на устаревший запрос (другой проект или другой поисковый
 * запрос) не должен перезаписывать актуальный список.
 */
let nomerZaprosaVetok = 0;

type State = {
    loader: boolean;
    oshibkaOtBackenda: string | null;
    spisok: string[];
    /** Подсказки: ветки проекта в хранилище (загружаются с сервера). */
    vetki: {
        spisok: string[];
        loader: boolean;
        query: string;
    };
};

/**
 * Стор защищённых веток проекта.
 *
 * Хранит редактируемый список масок и отвечает за сохранение через
 * `POST /project/ustanovitZashishennieVetki`.
 */
export const useStorZashishennyhVetok = defineStore('StorZashishennyhVetok', {
    state: (): State => {
        return {
            loader: false,
            oshibkaOtBackenda: null,
            spisok: [],
            vetki: {
                spisok: [],
                loader: false,
                query: "",
            },
        };
    },
    actions: {
        ustanovitSpisok(spisok: string[]) {
            this.spisok = [...spisok];
        },
        /**
         * Загрузить ветки проекта в хранилище для подсказок в селекте.
         *
         * Поиск выполняется на сервере через `query`; ответ на устаревший
         * запрос (после смены запроса или проекта) игнорируется.
         */
        async poluchitVetki(id: string) {
            if (!id) {
                this.vetki.spisok = [];
                this.vetki.loader = false;
                return;
            }

            const nomerZaprosa = ++nomerZaprosaVetok;
            this.vetki.loader = true;

            try {
                const response = await ProektiService.poluchitVetkiProekta({
                    id,
                    query: this.vetki.query || null,
                });

                if (nomerZaprosa !== nomerZaprosaVetok) {
                    return;
                }

                if (response.status === "success") {
                    this.vetki.spisok = response.data.map((item: Schema<"ProjectBranch">) => item.name);
                } else if (response.status === "fail") {
                    this.oshibkaOtBackenda = response.data.message;
                } else if (response.status === "error") {
                    this.oshibkaOtBackenda = response.message;
                }
            } catch (oshibka) {
                if (nomerZaprosa === nomerZaprosaVetok) {
                    this.oshibkaOtBackenda = oshibka instanceof Error ? oshibka.message : String(oshibka);
                }
            } finally {
                if (nomerZaprosa === nomerZaprosaVetok) {
                    this.vetki.loader = false;
                }
            }
        },
        async sohranit(id: string) {
            this.loader = true;
            const response = await ProektiService.ustanovitZashishennieVetki({
                id,
                zashishennieVetki: this.spisok,
            });

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
    },
});
