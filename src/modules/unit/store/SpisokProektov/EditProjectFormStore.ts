import {defineStore} from "pinia";
import ProektiService from "@/modules/unit/services/ProektiService";
import {Notify} from "quasar";

export class EditProjectForm {
    id: string;
    newProjectName: string;
    newProxyHost: string;
    memoryLimit: number;
    constructor(id: string = "", newProjectName: string = "", newProxyHost: string | null = null, memoryLimit: number | null = null) {
        this.id = id;
        this.newProjectName = newProjectName;
        this.newProxyHost = newProxyHost  ?? "";
        this.memoryLimit = memoryLimit ?? 0;
    }
}

type EditProjectFormState = {
    enable: boolean;
    form:EditProjectForm;
    loader: boolean;
    oshibkaOtBackenda: string | null;
}
export const useEditProjectFormStore = defineStore('EditProjectFormStore', {
    state: (): EditProjectFormState => {
        return {
            enable: false,
            form: new EditProjectForm(),
            loader: false,
            oshibkaOtBackenda: null
        }
    },
    actions: {
        otkritFormu(form: EditProjectForm) {
            this.form = form;
            this.enable = true;
            this.oshibkaOtBackenda = null;
            this.loader = false;
        },
        zakritFormu() {
            this.form = new EditProjectForm();
            this.enable = false;
        },
        async otpravitFormu() {
            this.loader = true;
            const response = await ProektiService.updateData(this.form);

            this.loader = false;
            if (response.status === "success") {
                Notify.create({ message: 'Успех операции', type: 'positive', timeout: 100 });
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
