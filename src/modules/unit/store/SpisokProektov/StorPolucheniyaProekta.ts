import {defineStore} from "pinia";
import Proekt from "@/modules/unit/store/SpisokProektov/model/Proekt";
import ProektiService from "@/modules/unit/services/ProektiService";

type State = {
    loader: boolean;
    oshibkaOtBeka: string | null;
    proekt: Proekt | null;
};

export const storePolucheniyaProekta = defineStore('storePolucheniyaProekta', {
    state: (): State => {
        return {
            loader: false,
            oshibkaOtBeka: null,
            proekt: null,
        };
    },
    actions: {
        async poluchitProekt(id: string) {
            this.loader = true;
            const response = await ProektiService.read(id);

            this.loader = false;
            if (response.status === "success") {
                this.oshibkaOtBeka = null;
                this.proekt = response.data;
            } else if (response.status === "fail") {
                this.oshibkaOtBeka = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBeka = response.message;
            }

            return response;
        }
    }
});
