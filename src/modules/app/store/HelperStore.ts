import {defineStore} from "pinia";

type State = {
    baseUrl: string;
}
export const storeHelper = defineStore('storeHelper', {
    state: (): State => {
        return {
            baseUrl: import.meta.env.VITE_API_HOST
        };
    }
});
