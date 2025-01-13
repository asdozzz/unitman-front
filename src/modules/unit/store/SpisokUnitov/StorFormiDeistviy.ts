import {defineStore} from "pinia";
import {Deistviye, KonfigPeremenoi} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import UnitiService from "@/modules/unit/services/UnitiService";

export class Peremenaya {
    konfig: KonfigPeremenoi;
    value: string;

    constructor(konfig: KonfigPeremenoi, value: string = "") {
        this.konfig = konfig;
        this.value = value.length > 0 ? value : konfig.defaultValue;
    }
}

class FormaPeremenih {
    id: string;
    values: Peremenaya[];
    constructor(id: string = "", values: Peremenaya[] = []) {
        this.id = id;
        this.values = values;
    }
}

type StateFormiDeistviy = {
    loader: boolean;
    oshibkaOtBackenda: string | null;
    enable: boolean;
    unitId: string | null;
    deistvie: Deistviye | null;
    form: FormaPeremenih,
}

export const storFormiDeistviyUnita = defineStore('storFormiDeistviy', {
    state: (): StateFormiDeistviy => {
      return {
          loader: false,
          oshibkaOtBackenda: null,
          enable: false,
          deistvie: null,
          unitId: null,
          form: new FormaPeremenih()
      };
    },
    actions: {
        otkritFormu(unitId: string, deistviye: Deistviye) {
            this.unitId = unitId;
            this.enable = true;
            this.deistvie = deistviye;
            const variables = deistviye.variables.map((konfig: KonfigPeremenoi) => new Peremenaya(konfig,""))
            this.form = new FormaPeremenih(unitId, variables);
        },
        zakritFormu() {
            this.unitId = null;
            this.form = new FormaPeremenih();
            this.deistvie = null;
            this.enable = false;
        },
        async otpravitFormu() {
            this.loader = true;

            const values: Record<string, string>  = {};
            this.form.values.forEach((item: Peremenaya) => {
                values[item.konfig.id] = item.value;
            })
            const sendData = {
                id: this.form.id,
                actionId: this.deistvie?.id as string,
                values
            }

            const response = await UnitiService.vipolnitDeistviye(sendData);

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
    }
});
