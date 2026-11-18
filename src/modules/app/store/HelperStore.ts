import {defineStore} from "pinia";
import {apiHost} from "@/utils/runtimeEnv";

type State = {
    baseUrl: string;
}
export const storeHelper = defineStore('storeHelper', {
    state: (): State => {
        return {
            // Тот же резолвер, что у apiClient: иначе ссылки на вебхуки
            // указывали бы на build-time хост при runtime-переопределении.
            baseUrl: apiHost()
        };
    }
});
