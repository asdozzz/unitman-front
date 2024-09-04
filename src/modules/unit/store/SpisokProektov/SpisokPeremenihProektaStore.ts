import {defineStore} from "pinia";
import PeremenayaProekta from "@/modules/unit/store/SpisokProektov/model/PeremenayaProekta";
import ProektiService from "@/modules/unit/services/ProektiService";

import {Notify} from "quasar";
import {
    ModelDlySpiskaPeremenihProekta
} from "@/modules/unit/services/ProektiServices/model/ModelDlySpiskaPeremenihProekta";

class AddForm {
    projectId: string;
    tip: string;
    code: string;
    value: string;

    constructor(projectId: string = "", tip: string = "", code: string = "", value: string = "") {
        this.projectId = projectId;
        this.tip = tip;
        this.code = code;
        this.value = value;
    }
}

class EditForm {
    projectId: string;
    code: string;
    value: string;

    constructor(projectId: string = "", code: string = "", value: string = "") {
        this.projectId = projectId;
        this.code = code;
        this.value = value;
    }
}

type SpisokPeremenihProektaState = {
    enable: boolean;
    projectId: string | null,
    spisok: PeremenayaProekta[],
    loaderSpiskaPeremenih: boolean,
    loaderUdaleniya: boolean;
    loaderDobavleniya: boolean;
    loaderIzmeneniya: boolean;
    form: AddForm;
    editForm: EditForm;
    tipiPeremenoi:string[],
    oshibkaZagruzkiSpiska: string | null;
}

export const useSpisokPeremenihProektaStore = defineStore('SpisokPeremenihProektaStore', {
    state: (): SpisokPeremenihProektaState => {
        return {
            enable: false,
            projectId: null,
            loaderSpiskaPeremenih: false,
            spisok:[],
            loaderIzmeneniya: false,
            loaderUdaleniya: false,
            loaderDobavleniya: false,
            form: new AddForm(),
            editForm: new EditForm(),
            tipiPeremenoi: ['default', 'hidden'],
            oshibkaZagruzkiSpiska: null,
        }
    },
    actions: {
        pokazatSpisok(projectId: string) {
            this.projectId = projectId;
            this.enable = true;
            this.form = new AddForm(projectId);
        },
        resetForm() {
            this.form = new AddForm(this.projectId as string);
        },
        resetEditForm() {
            this.editForm = new EditForm(this.projectId as string);
        },
        skritSpisok() {
            this.projectId = null;
            this.enable = false;
            this.resetForm();
        },
        async poluchitSpisok() {
            if (this.projectId === null) {
                throw new Error('projectId ne opredelen dly polucheniya spiska peremenih proekta');
            }

            this.loaderSpiskaPeremenih = true;

            const response = await ProektiService.poluchitSpisokPeremenih({ id: this.projectId});

            if (response.status === "success") {
                this.spisok = response.data.map((item:ModelDlySpiskaPeremenihProekta) => new PeremenayaProekta(item))
            } else if (response.status === "fail") {
                this.spisok = [];
                this.oshibkaZagruzkiSpiska = response.data.message;
            } else if (response.status === "error") {
                this.spisok = [];
                this.oshibkaZagruzkiSpiska = response.message;
            }

            this.loaderSpiskaPeremenih = false;

            return response;
        },
        async udalitPeremenuyu(code: string) {
            if (this.projectId === null) {
                throw new Error('projectId ne opredelen dly polucheniya spiska peremenih proekta');
            }

            this.loaderUdaleniya = true;

            const response = await ProektiService.udalitPeremenuyu({ projectId: this.projectId, code });

            this.loaderUdaleniya = false;

            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisok();

            return response;
        },
        async dobavitPeremenuyu() {
            if (this.form.projectId === null) {
                throw new Error('projectId ne opredelen dly dobavleniya peremenoi proekta');
            }

            this.loaderDobavleniya = true;

            const response = await ProektiService.dobavitPeremenuyu(this.form);

            this.loaderDobavleniya = false;

            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.resetForm();
            this.poluchitSpisok();

            return response;
        },
        async izmenitPeremenuyu() {
            if (this.form.projectId === null) {
                throw new Error('projectId ne opredelen dly dobavleniya peremenoi proekta');
            }

            this.loaderIzmeneniya = true;

            const response = await ProektiService.izmenitPeremenuyu(this.editForm);

            this.loaderIzmeneniya = false;

            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.resetEditForm();
            this.poluchitSpisok();

            return response;
        },
    }
});
