import { defineStore } from "pinia";
import WorkspaceService from "@/modules/opencode/services/WorkspaceService";
import type {
    WorkspaceAnswer,
    WorkspaceQuestion,
    WorkspaceSession,
    WorkspaceState,
    WorkspaceTurn,
} from "@/modules/opencode/model/WorkspaceSession";

type StorChataWorkspaceState = {
    workspaceId: string;
    workspace: WorkspaceSession | null;
    sostoyanie: WorkspaceState | null;
    hody: WorkspaceTurn[];
    prompt: string;
    loader: boolean;
    otpravka: boolean;
    oshibka: string | null;
};

let oprosTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Состояние чата workspace. Не знает о unit-сессиях.
 */
export const useStorChataWorkspace = defineStore("StorChataWorkspace", {
    state: (): StorChataWorkspaceState => {
        return {
            workspaceId: "",
            workspace: null,
            sostoyanie: null,
            hody: [],
            prompt: "",
            loader: false,
            otpravka: false,
            oshibka: null,
        };
    },

    getters: {
        posledniyHod(state): WorkspaceTurn | null {
            return state.hody.length === 0 ? null : state.hody[state.hody.length - 1];
        },

        hodVipolnyaetsya(): boolean {
            return this.posledniyHod?.status === "RUNNING";
        },

        mozhnoOtpravlyat(): boolean {
            return !this.hodVipolnyaetsya
                && this.sostoyanie?.canAcceptMessages === true;
        },

        voprosy(): WorkspaceQuestion[] {
            const hod = this.hody.length === 0 ? null : this.hody[this.hody.length - 1];

            if (hod === null || hod.status !== "AWAITING_INPUT") {
                return [];
            }

            return hod.result?.Questions ?? [];
        },
    },

    actions: {
        async otkrit(workspaceId: string) {
            this.zakrit();
            this.workspaceId = workspaceId;
            this.loader = true;
            this.oshibka = null;

            await Promise.all([
                this.zagruzitWorkspace(),
                this.zagruzitIstoriyu(),
                this.zagruzitSostoyanie(),
            ]);

            this.loader = false;
            this.zapustitOpros();
        },

        zakrit() {
            if (oprosTimer !== null) {
                clearInterval(oprosTimer);
                oprosTimer = null;
            }

            this.workspaceId = "";
            this.workspace = null;
            this.sostoyanie = null;
            this.hody = [];
            this.prompt = "";
            this.loader = false;
            this.otpravka = false;
            this.oshibka = null;
        },

        async zagruzitWorkspace() {
            const response = await WorkspaceService.spisok();

            if (response.status === "success") {
                this.workspace = response.data.find((item) => item.id === this.workspaceId) ?? null;
            }
        },

        async zagruzitIstoriyu() {
            const response = await WorkspaceService.istoriya({ workspaceId: this.workspaceId });

            if (response.status === "success") {
                this.hody = response.data;
            } else {
                this.oshibka = response.status === "fail" ? response.data.message : response.message;
            }
        },

        async zagruzitSostoyanie() {
            const response = await WorkspaceService.sostoyanie({ workspaceId: this.workspaceId });

            if (response.status === "success") {
                this.sostoyanie = response.data;
            }
        },

        async otpravit() {
            const tekst = this.prompt.trim();

            if (tekst === "" || this.otpravka || !this.mozhnoOtpravlyat) {
                return;
            }

            this.otpravka = true;
            this.oshibka = null;

            const response = await WorkspaceService.prompt({
                workspaceId: this.workspaceId,
                text: tekst,
            });

            this.otpravka = false;

            if (response.status !== "success") {
                this.oshibka = response.status === "fail" ? response.data.message : response.message;

                return;
            }

            this.prompt = "";
            await this.zagruzitIstoriyu();
            await this.zagruzitSostoyanie();
        },

        async otvetit(answers: WorkspaceAnswer[], turnId?: string) {
            const idHoda = turnId ?? this.posledniyHod?.id ?? null;

            if (idHoda === null || this.otpravka) {
                return;
            }

            this.otpravka = true;
            this.oshibka = null;

            const response = await WorkspaceService.otvetit({
                turnId: idHoda,
                answers,
            });

            this.otpravka = false;

            if (response.status !== "success") {
                this.oshibka = response.status === "fail" ? response.data.message : response.message;

                return;
            }

            await this.zagruzitIstoriyu();
            await this.zagruzitSostoyanie();
        },

        zapustitOpros() {
            if (oprosTimer !== null) {
                clearInterval(oprosTimer);
            }

            oprosTimer = setInterval(() => {
                void this.obnovitEsliIdet();
            }, 2500);
        },

        async obnovitEsliIdet() {
            if (!this.hodVipolnyaetsya) {
                return;
            }

            const hod = this.posledniyHod;

            if (hod === null) {
                return;
            }

            const response = await WorkspaceService.poluchitResultatHoda({ turnId: hod.id });

            if (response.status === "success" && response.data.status !== "RUNNING") {
                await this.zagruzitIstoriyu();
                await this.zagruzitSostoyanie();
            }
        },

        async arhivirovat(force = false) {
            if (this.workspaceId === "") {
                return;
            }

            const response = await WorkspaceService.arhivirovat({ workspaceId: this.workspaceId, force });

            if (response.status === "success") {
                await this.zagruzitWorkspace();
            } else {
                this.oshibka = response.status === "fail" ? response.data.message : response.message;
            }
        },
    },
});
