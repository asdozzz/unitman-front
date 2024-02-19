import { defineStore } from 'pinia';
import PolzovatelDlyAdmininstrirovaniya from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/model/PolzovatelDlyAdmininstrirovaniya";
import AccountService from "@/modules/account/services/AccountService";

import {
    ApiModelPolzovatelyaDlyAdministrorovaniya
} from "@/modules/account/services/model/ApiModelPolzovatelyaDlyAdministrorovaniya";
import {Notify} from "quasar";

export type SpisokPolzovateleiDlyAdmininstrirovaniyaState = {
    spisok: PolzovatelDlyAdmininstrirovaniya[];
    loaderSpiska: boolean;
    oshibkaPolucheniyaSpiska: string;
    loaderObnovleniya: boolean;
}

export const useSpisokPolzovateleiDlyAdmininstrirovaniyaStore = defineStore('SpisokPolzovateleiDlyAdmininstrirovaniyaStore', {
    state: (): SpisokPolzovateleiDlyAdmininstrirovaniyaState => {
        return {
          spisok: [],
          loaderSpiska: false,
          oshibkaPolucheniyaSpiska: "",
          loaderObnovleniya: false
        };
    },
    actions: {
        async poluchitPolzovateleiDlyAdmininstrirovaniya() {
            this.loaderSpiska = true;
            const response = await AccountService.poluchitPolzovateleiDlyAdmininstrirovaniya();
            if (response.status === "success") {
                this.spisok = response.data.map((item: ApiModelPolzovatelyaDlyAdministrorovaniya) => new PolzovatelDlyAdmininstrirovaniya(item));
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
    }
});
