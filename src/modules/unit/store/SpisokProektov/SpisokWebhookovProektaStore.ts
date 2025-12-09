import {defineStore} from "pinia";
import ProektiService from "@/modules/unit/services/ProektiService";
import {Notify} from "quasar";


class AddForm {
    projectId: string;
    url: string;
    constructor(projectId: string = "", url: string = "") {
        this.projectId = projectId;
        this.url = url;
    }
}

type WebhookProekta = {
    id: string;
    projectId: string;
    url: string;
    isActive: boolean;
};

type State = {
    enable: boolean;
    projectId: string | null,
    spisok: WebhookProekta[],
    loaderSpiska: boolean,
    loaderDobavleniya: boolean;
    loaderIzmeneniya: boolean;
    form: AddForm;
    oshibkaZagruzkiSpiska: string | null;
}

export const SpisokWebhookovProektaStore = defineStore('SpisokWebhookovProektaStore', {
    state: (): State => {
        return {
            enable: false,
            projectId: null,
            loaderSpiska: false,
            spisok:[],
            loaderIzmeneniya: false,
            loaderDobavleniya: false,
            form: new AddForm(),
            oshibkaZagruzkiSpiska: null,
        }
    },
    actions: {
        pokazatSpisok(projectId: string) {
            this.projectId = projectId;
            this.form = new AddForm(projectId);
        },

        resetForm() {
            this.form = new AddForm(this.projectId as string);
        },
        skritSpisok() {
            this.projectId = null;
            this.resetForm();
        },
        async poluchitSpisok() {
            if (this.projectId === null) {
                throw new Error('projectId ne opredelen dly polucheniya spiska webhookov proekta');
            }

            this.loaderSpiska = true;

            const response = await ProektiService.spisokWebhookovDlyProekta(this.projectId);

            if (response.status === "success") {
                this.spisok = response.data;
            } else if (response.status === "fail") {
                this.spisok = [];
                this.oshibkaZagruzkiSpiska = response.data.message;
            } else if (response.status === "error") {
                this.spisok = [];
                this.oshibkaZagruzkiSpiska = response.message;
            }

            this.loaderSpiska = false;

            return response;
        },
        async udalit(id: string) {
            if (this.projectId === null) {
                throw new Error('projectId ne opredelen dly polucheniya spiska peremenih proekta');
            }

            this.loaderIzmeneniya = true;

            const response = await ProektiService.udalitWebhook(id);

            this.loaderIzmeneniya = false;

            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisok();

            return response;
        },
        async otkluchit(id: string) {
            if (this.projectId === null) {
                throw new Error('projectId ne opredelen dly polucheniya spiska peremenih proekta');
            }

            this.loaderIzmeneniya = true;

            const response = await ProektiService.otkluchitWebhook(id);

            this.loaderIzmeneniya = false;

            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisok();

            return response;
        },
        async vkluchit(id: string) {
            if (this.projectId === null) {
                throw new Error('projectId ne opredelen dly polucheniya spiska peremenih proekta');
            }

            this.loaderIzmeneniya = true;

            const response = await ProektiService.vkluchitWebhook(id);

            this.loaderIzmeneniya = false;

            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.poluchitSpisok();

            return response;
        },
        async dobavit() {
            if (this.form.projectId === null) {
                throw new Error('projectId ne opredelen dly dobavleniya peremenoi proekta');
            }

            this.loaderDobavleniya = true;

            const response = await ProektiService.dobavitWebhook(this.form);

            this.loaderDobavleniya = false;

            if (response.status === "fail"){
                Notify.create(response.data.message);
            }

            this.resetForm();
            this.poluchitSpisok();

            return response;
        },
    }
});
