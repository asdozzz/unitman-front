import { defineStore } from 'pinia';
import RunnerService from "@/modules/runner/services/RunnerService";
import {ApiResponse} from "@/bootstrap/apiClient/ApiResponse";
import {
    OtvetNaPoluchenieSostoyanieDefoltnogoRunnera
} from "@/modules/runner/services/RunnerService/OtvetNaPoluchenieSostoyanieDefoltnogoRunnera";

type SostoyaniyaDefoltnogoRunnera = {
    loader: boolean;
    active: boolean;
    oshibkaBackenda: string | null;
    init: boolean;
    pause: boolean;
}

export const storeSostoyaniyaDefoltnogoRunnera = defineStore('SostoyaniyaDefoltnogoRunnera', {
    state: (): SostoyaniyaDefoltnogoRunnera => {
        return {
            loader: false,
            active: true,
            oshibkaBackenda: "",
            init: false,
            pause: false
        }
    },
    actions: {
        async getDefaultRunnerActive() {
            this.loader = true;

            const response: ApiResponse<OtvetNaPoluchenieSostoyanieDefoltnogoRunnera> = await RunnerService.getDefaultRunnerActive();

            if (response.status === "fail") {
                this.active = false;
                this.oshibkaBackenda = response.data.message;
            } else if (response.status === "error") {
                this.active = false;
                this.oshibkaBackenda = response.message;
            } else {
                this.oshibkaBackenda = "";
                this.active = response.data.active;
            }
        },
        async zapustitOprosStatusaRunnera() {
            this.init = true;
            if (!this.pause) {
                await this.getDefaultRunnerActive();
                setTimeout(this.zapustitOprosStatusaRunnera, 5000);
            }
        },
        ostanovitOprosStatusaRunnera(): void {
            this.pause = true;
        },
        vostanovitOprosStatus() {
            this.pause = false;
        }
    }
});
