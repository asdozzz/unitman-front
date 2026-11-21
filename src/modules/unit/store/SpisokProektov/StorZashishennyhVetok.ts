import {defineStore} from "pinia";
import ProektiService from "@/modules/unit/services/ProektiService";

type State = {
    loader: boolean;
    oshibkaOtBackenda: string | null;
    spisok: string[];
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
        };
    },
    actions: {
        ustanovitSpisok(spisok: string[]) {
            this.spisok = [...spisok];
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
