import { defineStore } from 'pinia';
import Polzovatel from "@/modules/account/store/SpisokVsehPolzovatelei/model/Polzovatel";
import AccountService from "@/modules/account/services/AccountService";
import {ApiModelPolzovatelya} from "@/modules/account/services/model/ApiModelPolzovatelya";

export type SpisokVsehPolzovateleiState = {
    spisok: Polzovatel[];
    loaderSpiska: boolean;
    oshibkaPolucheniyaSpiska: string;
}

export const useSpisokVsehPolzovateleiStore = defineStore('SpisokVsehPolzovateleiStore', {
    state: (): SpisokVsehPolzovateleiState => {
        return {
          spisok: [],
          loaderSpiska: false,
          oshibkaPolucheniyaSpiska: "",
        };
    },
    getters: {
        poluchitPolzovatelyaPoId(state) {
            return (id: string): Polzovatel | undefined => state.spisok.find((polzovatel: Polzovatel) => polzovatel.id === id);
        },
        poluchitEmailPolzovatelyaPoId() {
            const _this = this;
            return (id: string, defaultValue: string = ""): string => {
                const polzovatel = _this.poluchitPolzovatelyaPoId(id);
                if (!polzovatel) {
                    return defaultValue;
                }
                if (polzovatel.nickname) {
                    return polzovatel.nickname;
                }
                return polzovatel.email;
            }
        },
        esliPolzovatelZablokirovan() {
            const _this = this;
            return (id: string): boolean => {
                const polzovatel = _this.poluchitPolzovatelyaPoId(id);
                return polzovatel ? polzovatel.isBlocked : false;
            }
        },
        spisokActivnihPolzovatelei(state): Polzovatel[] {
            return state.spisok.filter((polzovatel: Polzovatel) => !polzovatel.isBlocked);
        },
    },
    actions: {
        async poluchitVsehPolzovatelei() {
            this.loaderSpiska = true;
            const response = await AccountService.poluchitVsehPolzovatelei();
            if (response.status === "success") {
                this.spisok = response.data.map((item: ApiModelPolzovatelya) => new Polzovatel(item));
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
    }
});
