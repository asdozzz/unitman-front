import {defineStore} from "pinia";
import AccountService from "@/modules/account/services/AccountService";
import ProektiService from "@/modules/unit/services/ProektiService";

type Proekt = {
    id: string;
    name: string;
}

type State = {
    proekti: Proekt[],
    moi: string[],
    loader: boolean;
    oshibkaOtBeka: string | null;
}
export const FormaProektovPolzovatelyaStore = defineStore('FormaProektovPolzovatelyaStore', {
    state: (): State => {
        return {
            proekti: [],
            moi: [],
            loader: false,
            oshibkaOtBeka: null
        };
    },
    actions: {
        async poluchitSpisokActivnih() {
            this.loader = true;
            const response = await ProektiService.poluchitAktivnieProekti();

            this.loader = false;
            if (response.status === "success") {
                this.oshibkaOtBeka = null;
                this.proekti = response.data;
            } else if (response.status === "fail") {
                this.oshibkaOtBeka = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBeka = response.message;
            }

            return response;
        },
        async poluchitProektiPolzovatelya(id: string) {
            this.loader = true;
            const response = await AccountService.poluchitProektiPolzovatelya(id);

            this.loader = false;
            if (response.status === "success") {
                this.oshibkaOtBeka = null;
                this.moi = response.data.map((item) => item.id);
            } else if (response.status === "fail") {
                this.oshibkaOtBeka = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBeka = response.message;
            }

            return response;
        },
        async dobavitVProekt(projectId: string, userId: string) {
            this.loader = true;

            const response = await ProektiService.dobavitPolzovatelyaKProektu({id: projectId, userId})

            this.loader = false;
            if (response.status === "success") {
                this.oshibkaOtBeka = null;
                this.moi.push(projectId);
            } else if (response.status === "fail") {
                this.oshibkaOtBeka = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBeka = response.message;
            }
        },
        async udalitIzProekta(projectId: string, userId: string) {
            this.loader = true;

            const response = await ProektiService.udalitPolzovatelyaIzProekta({id: projectId, userId})

            this.loader = false;
            if (response.status === "success") {
                this.oshibkaOtBeka = null;
                this.moi = this.moi.filter(item => item !== projectId);
            } else if (response.status === "fail") {
                this.oshibkaOtBeka = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBeka = response.message;
            }
        }
    }
});
