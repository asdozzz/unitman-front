import {defineStore} from "pinia";
import ProektiService from "@/modules/unit/services/ProektiService";
import {Notify} from "quasar";

class EditForm {
    id: string;
    newUrl: string;
    constructor(id: string = "", newUrl: string = "") {
        this.id = id;
        this.newUrl = newUrl;
    }
}

type SobitieWebhooka = {
    id: string;
    type: string;
    payload: string,
    response: string | null;
    unixtime: number;
    sent: boolean;
};

type State = {
    form: EditForm;
    loaderIzmeneniya: boolean;
    sobitiya: {
        webhookId: string | null;
        loaderSpiska: boolean;
        spisok: SobitieWebhooka[];
        select: SobitieWebhooka | null;
        pagination: {
            page: number;
            perPage: number;
            totalPages: number;
        }
    }
}

export const SobitiyaWebhookaStore = defineStore('SobitiyaWebhookaStore', {
    state: (): State => {
        return {
            form: new EditForm(),
            loaderIzmeneniya: false,
            sobitiya: {
                webhookId: null,
                spisok: [],
                select: null,
                loaderSpiska: false,
                pagination: {
                    page: 1,
                    perPage: 10,
                    totalPages: 1
                }
            }
        };
    },
    actions: {
        select(item: SobitieWebhooka) {
            this.sobitiya.select = item;
        },
        initStore(id: string) {
            this.sobitiya.webhookId = id;
            this.openEditForm(id);
            this.poluchitSpisosk();
        },
        newPage(newPage: number) {
          this.sobitiya.pagination.page = newPage;
          this.poluchitSpisosk();
        },
        async poluchitSpisosk() {
            this.sobitiya.loaderSpiska = true;

            const response  = await ProektiService.poluchitSobitiyaWebhooka({
                webhookId: this.sobitiya.webhookId as string,
                limit: this.sobitiya.pagination.perPage,
                offset: (this.sobitiya.pagination.page - 1)*this.sobitiya.pagination.perPage
            });

            if (response.status === "success") {
                //const oldId = this.sobitiya.select ? this.sobitiya.select.id : null;
                this.sobitiya.spisok = response.data.list;

                const selectIndex = this.sobitiya.spisok.findIndex((item) => item.id === this.sobitiya.select?.id);

                if (selectIndex === -1) {
                    this.sobitiya.select = this.sobitiya.spisok[0];
                }

                this.sobitiya.pagination.totalPages = Math.ceil(response.data.totalRecords/this.sobitiya.pagination.perPage);
            } else if (response.status === "fail") {
                Notify.create({ message: response.data.message, type: 'negative' });
            } else if (response.status === "error") {
                Notify.create({ message: response.message, type: 'negative' });
            }

            this.sobitiya.loaderSpiska = false;
        },
        async openEditForm(id: string) {
            this.loaderIzmeneniya = true;

            const response = await ProektiService.readWebhook(id);

            if (response.status === "success") {
                this.form = new EditForm(response.data.id, response.data.url);
            } else if (response.status === "fail") {
                Notify.create({ message: response.data.message, type: 'negative' });
            } else if (response.status === "error") {
                Notify.create({ message: response.message, type: 'negative' });
            }

            this.loaderIzmeneniya = false;
        },
        async obnovit() {
            if (this.form.id === null) {
                throw new Error('id ne opredelen dly obnovleniya webhooka proekta');
            }

            this.loaderIzmeneniya = true;

            const response = await ProektiService.obnovitWebhooka(this.form);

            this.loaderIzmeneniya = false;

            if (response.status === "fail") {
                Notify.create({ message: response.data.message, type: 'negative' });
            } else if (response.status === "error") {
                Notify.create({ message: response.message, type: 'negative' });
            } else {
                Notify.create({ message: 'success', type: 'positive', timeout: 100 });
            }

            return response;
        },
    }
});
