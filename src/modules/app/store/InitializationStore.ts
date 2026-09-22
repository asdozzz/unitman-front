import { defineStore } from 'pinia';
import InitializationService from '../services/InitializationService';
import {Notify} from "quasar";
import ProektiService from "@/modules/unit/services/ProektiService";

type PropModel = {
    id: string;
    prop: string;
    value: string | null;
    init: number | null;
};

type FormaProxyHost = {
    value: string | null;
    loader: boolean;
    oshibkaOtBeka: string | null;
};


type InitState = {
    list: {
        loader: boolean,
        data: PropModel[];
        oshibkaOtBeka: string | null;
    },
    formaProxyHost: FormaProxyHost;
    proverkaProxyHost: {
        loader: boolean;
        result: boolean | null;
        oshibkaOtBeka: string | null;
    }
};

export const storeInizializii = defineStore('init', {
    state: (): InitState => {
        return {
            list: {
                loader: false,
                data: [],
                oshibkaOtBeka: null
            },
            formaProxyHost: {
                value: null,
                loader: false,
                oshibkaOtBeka: null
            },
            proverkaProxyHost: {
                loader: false,
                result: null,
                oshibkaOtBeka: null
            }
        };
    },
    actions: {
        async poluchitSpisok() {
            this.list.loader = true;
            this.list.oshibkaOtBeka = null;

            const response = await InitializationService.getAllProps();

            if (response.status === "success") {
                this.list.data = response.data;
                this.list.data.forEach(item => {
                   if (item.prop === 'proxy_host') {
                       this.formaProxyHost.value = item.value;
                   }
                });
            } else if (response.status === "fail") {
                this.list.data = [];
                this.list.oshibkaOtBeka = response.data.message;
            } else if (response.status === "error") {
                this.list.data = [];
                this.list.oshibkaOtBeka = response.message;
            }

            this.list.loader = false;
        },
        async obnovitProxyHost() {
            this.formaProxyHost.loader = true;

            const response = await InitializationService.updateProxyHost({ value: this.formaProxyHost.value});

            if (response.status === "fail") {
                this.formaProxyHost.oshibkaOtBeka = response.data.message;
            } else if (response.status === "error") {
                this.formaProxyHost.oshibkaOtBeka = response.message;
            } else {
                Notify.create({ message: 'Success', type: 'positive', timeout: 100 });
            }

            this.formaProxyHost.loader = false;
        },
        async proveritProxyHost() {
            this.proverkaProxyHost.loader = true;
            this.proverkaProxyHost.result = null;
            this.proverkaProxyHost.oshibkaOtBeka = null;

            const response = await ProektiService.proveritProxyHost({ proxyHost: this.formaProxyHost.value || "" });

            this.proverkaProxyHost.loader = false;
            if (response.status === "success") {
                this.proverkaProxyHost.result = response.data.result;
            } else if (response.status === "fail") {
                this.proverkaProxyHost.oshibkaOtBeka = response.data.message;
            } else if (response.status === "error") {
                this.proverkaProxyHost.oshibkaOtBeka = response.message;
            }

            return response;
        }
    },
    getters: {
        estNeZapolnenie(): boolean {
            return this.list.data.some(item => item.init === 0);
        },
        elsiProxyHostNeZapolnen(): boolean {
            return !this.formaProxyHost.value || this.formaProxyHost.value.length === 0;
        }
    }
});
