import {defineStore} from "pinia";
import ProektiService from "@/modules/unit/services/ProektiService";
import HranilishaService from "@/modules/unit/services/HranilishaService";
import ModelDlySpiskaHranilish from "@/modules/unit/services/HranilishaService/model/ModelDlySpiskaHranilish";

export class AddForm {
    repoId: string;
    projectName: string;
    projectCode: string;
    mainBranch: string;
    proxyHost: string;
    memoryLimit: number;
    constructor(repoId: string = "", projectName: string = "", projectCode: string = "", mainBranch: string = "master", proxyHost: string = "", memoryLimit: number | null = null) {
        this.repoId = repoId;
        this.projectName = projectName;
        this.projectCode = projectCode;
        this.mainBranch = mainBranch;
        this.proxyHost = proxyHost;
        this.memoryLimit = memoryLimit ?? 0;
    }
}

class Hranilishe {
    value: string;
    label: string;

    constructor(value: string, label: string) {
        this.value = value;
        this.label = label;
    }
}

class Proekt {
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
    hranilisha: {
        spisok: Hranilishe[];
        loader: boolean;
    },
    proekti: {
        spisok: Proekt[];
        loader: boolean;
        query: string | null;
    }
}


export const useAddProjectFormStore = defineStore('AddProjectFormState', {
    state: (): AddFormState => {
        return {
            enable: false,
            form: new AddForm(),
            loader: false,
            oshibkaOtBackenda: null,
            hranilisha: {
                spisok: [],
                loader: false
            },
            proekti: {
                spisok: [],
                loader: false,
                query: null
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
        async poluchitActivnieHranilisha() {
            this.hranilisha.loader = true;
            this.hranilisha.spisok = [];
            const response = await HranilishaService.poluchitSpisokActivnih();

            this.hranilisha.loader = false;
            if (response.status === "success") {
                this.hranilisha.spisok = response.data.map((item: ModelDlySpiskaHranilish) => new Hranilishe(item.id, item.name));
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }
        },
        async poluchitProektiRepi() {
            this.proekti.loader = true;
            this.proekti.spisok = [];

            if (!this.form.repoId) {
                throw new Error('repo ne vibrana');
            }
            const response = await HranilishaService.poluchitProektiHranilisha({ id: this.form.repoId, query: this.proekti.query });

            this.proekti.loader = false;
            if (response.status === "success") {
                this.proekti.spisok = response.data.map((item) => new Proekt(item.value, item.name));
            } else if (response.status === "fail") {
                this.oshibkaOtBackenda = response.data.message;
            } else if (response.status === "error") {
                this.oshibkaOtBackenda = response.message;
            }
        },
        async otpravitFormu() {
            this.loader = true;
            const response = await ProektiService.add(this.form);

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
