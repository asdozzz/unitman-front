import {defineStore} from "pinia";
import HranilishaService from "@/modules/unit/services/HranilishaService";
import ModelDlySpiskaTipovHranilisha from "@/modules/unit/services/HranilishaService/model/ModelDlySpiskaTipovHranilisha";

export class AddForm {
    repoType: string;
    repoName: string;
    token: string;
    repoUrl: string;

    constructor(repoType: string = "", repoName: string = "", token: string = "", repoUrl: string = "") {
        this.repoType = repoType;
        this.repoName = repoName;
        this.token = token;
        this.repoUrl = repoUrl;
    }
}

class TipHranilsiha {
    value: string;
    label: string;

    constructor(value: string, label: string) {
        this.value = value;
        this.label = label;
    }
}

type AddFormState = {
    enable: boolean;
    form:AddForm;
    loader: boolean;
    oshibkaOtBackenda: string | null;
    tipiHranilisha: {
        spisok: TipHranilsiha[];
        loader: boolean;
    }
}


export const useAddFormStore = defineStore('AddFormState', {
    state: (): AddFormState => {
        return {
            enable: false,
            form: new AddForm(),
            loader: false,
            oshibkaOtBackenda: null,
            tipiHranilisha: {
                spisok: [],
                loader: false
            }
        }
    },
    actions: {
        otkritFormu() {
            this.form = new AddForm();
            this.enable = true;
            this.oshibkaOtBackenda = null;
            this.loader = false;
        },
        zakritFormu() {
            this.form = new AddForm();
            this.enable = false;
        },
        async poluchitTipiHranilisha() {
            this.tipiHranilisha.loader = true;
            this.tipiHranilisha.spisok = [];
            const response = await HranilishaService.typeList();

            this.tipiHranilisha.loader = false;
            if (response.status === "success") {
                this.tipiHranilisha.spisok = response.data.map((item: ModelDlySpiskaTipovHranilisha) => new TipHranilsiha(item.code, item.name));
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }
        },
        async otpravitFormu() {
            this.loader = true;
            const response = await HranilishaService.add(this.form);

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
})
