import { defineStore } from "pinia";
import UnitSessionService from "@/modules/opencode/services/UnitSessionService";
import { useStorRezhimovAgenta } from "@/modules/agent-mode/store/StorRezhimovAgenta";
import { useStorSpiskaRekvizitovOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/StorSpiskaRekvizitovOpenCode";
import type { RekvizityOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/model/OpenCodeRekvizity";
import {
    modeliRekvizitov,
    modelPoUmolchaniyu,
    normalizovatModel,
} from "@/modules/opencode/model/ModeliOpenCode";
import type {
    UnitSession,
    UnitSessionAnswer,
    UnitSessionQuestion,
    UnitSessionState,
    UnitSessionTurn,
} from "@/modules/opencode/model/UnitSession";

type StorChataSessiiUnitaState = {
    sessionId: string;
    session: UnitSession | null;
    sostoyanie: UnitSessionState | null;
    hody: UnitSessionTurn[];
    prompt: string;
    /** Выбранный мод агента для следующих ходов. */
    agentModeId: string;
    /** Реквизиты, переопределённые для следующих ходов. */
    credentialId: string;
    /** Выбранная модель для следующих ходов. */
    model: string;
    /** Последняя использованная модель (сохраняется между сессиями). */
    poslednyayaModel: string;
    loader: boolean;
    otpravka: boolean;
    oshibka: string | null;
};

let oprosTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Состояние чата unit-сессии. Не знает о workspace.
 */
export const useStorChataSessiiUnita = defineStore("StorChataSessiiUnita", {
    state: (): StorChataSessiiUnitaState => {
        return {
            sessionId: "",
            session: null,
            sostoyanie: null,
            hody: [],
            prompt: "",
            agentModeId: "",
            credentialId: "",
            model: "",
            poslednyayaModel: "",
            loader: false,
            otpravka: false,
            oshibka: null,
        };
    },

    getters: {
        posledniyHod(state): UnitSessionTurn | null {
            return state.hody.length === 0 ? null : state.hody[state.hody.length - 1];
        },

        /** Доступные моды агента. */
        dostupnieRezhimy() {
            return useStorRezhimovAgenta().dostupnye;
        },

        /** Мод, выбранный для следующих ходов. */
        vybrannyyRezhim(state) {
            return useStorRezhimovAgenta().poId(state.agentModeId);
        },

        /** Личные реквизиты текущего пользователя. */
        dostupnieRekvizity(): RekvizityOpenCode[] {
            return useStorSpiskaRekvizitovOpenCode().spisok;
        },

        /** Полные реквизиты хода: выбранные или сохранённые в сессии. */
        vybrannieRekvizity(state): RekvizityOpenCode | null {
            const id = state.credentialId || state.session?.credentialId || "";

            return useStorSpiskaRekvizitovOpenCode().rekvizityPoId(id);
        },

        /** Модели, доступные для сессии. */
        dostupnieModeli(): string[] {
            return modeliRekvizitov(this.vybrannieRekvizity);
        },

        /**
         * Модель по умолчанию: модель сессии, затем последняя использованная,
         * затем дефолт реквизитов.
         */
        modelPoUmolchaniyu(state): string {
            return state.session?.model
                || state.poslednyayaModel
                || modelPoUmolchaniyu(this.vybrannieRekvizity);
        },

        hodVipolnyaetsya(): boolean {
            return this.posledniyHod?.status === "RUNNING";
        },

        mozhnoOtpravlyat(): boolean {
            return !this.hodVipolnyaetsya
                && this.sostoyanie?.canAcceptMessages === true
                && this.sostoyanie?.unit?.ready === true;
        },

        readOnly(): boolean {
            return this.sostoyanie?.mozhnoRedaktirovat !== true;
        },

        prichinaReadOnly(): UnitSessionState["readOnlyReason"] {
            return this.sostoyanie?.readOnlyReason ?? "edit_disabled";
        },

        voprosy(): UnitSessionQuestion[] {
            const hod = this.hody.length === 0 ? null : this.hody[this.hody.length - 1];

            if (hod === null || hod.status !== "AWAITING_INPUT") {
                return [];
            }

            return hod.result?.Questions ?? [];
        },
    },

    actions: {
        async otkrit(sessionId: string) {
            this.zakrit();
            this.sessionId = sessionId;
            this.loader = true;
            this.oshibka = null;
            this.agentModeId = "";
            this.credentialId = "";
            this.model = "";

            await Promise.all([
                this.zagruzitSessiyu(),
                this.zagruzitIstoriyu(),
                this.zagruzitSostoyanie(),
            ]);

            await useStorRezhimovAgenta().zagruzit();
            this.primenitRezhimPoUmolchaniyu();
            this.primenitModelPoUmolchaniyu();

            this.loader = false;
            this.zapustitOpros();
        },

        /** Переключить мод и подставить его реквизиты/модель. */
        ustanovitRezhim(modeId: string | null) {
            this.agentModeId = modeId ?? "";

            if (this.agentModeId === "") {
                return;
            }

            const nastroyki = useStorRezhimovAgenta().nastroykiModa(this.agentModeId);

            if (nastroyki.credentialId !== "") {
                this.credentialId = nastroyki.credentialId;
            }

            if (nastroyki.model !== "") {
                this.model = nastroyki.model;
            }
        },

        /** Подставить дефолтный мод для unit-чата. */
        primenitRezhimPoUmolchaniyu() {
            if (this.agentModeId !== "") {
                return;
            }

            const rezhim = useStorRezhimovAgenta().poUmolchaniyu("unit");

            if (rezhim !== null) {
                this.ustanovitRezhim(rezhim.id);
            }
        },

        /** Записать выбранные реквизиты и их модель по умолчанию. */
        ustanovitRekvizity(credentialId: string | null) {
            this.credentialId = credentialId ?? "";

            if (this.model === "") {
                this.model = modelPoUmolchaniyu(this.vybrannieRekvizity);
            }
        },

        /** Записать выбранную модель и запомнить её как последнюю. */
        ustanovitModel(model: string | null) {
            this.model = model ?? "";

            const normalizovannaya = normalizovatModel(this.model);

            if (normalizovannaya !== null) {
                this.poslednyayaModel = normalizovannaya;
            }
        },

        /** Подставить модель по умолчанию, если пользователь ещё не выбрал. */
        primenitModelPoUmolchaniyu() {
            if (this.model === "") {
                this.model = this.modelPoUmolchaniyu;
            }
        },

        zakrit() {
            if (oprosTimer !== null) {
                clearInterval(oprosTimer);
                oprosTimer = null;
            }

            this.sessionId = "";
            this.session = null;
            this.sostoyanie = null;
            this.hody = [];
            this.prompt = "";
            this.agentModeId = "";
            this.credentialId = "";
            this.loader = false;
            this.otpravka = false;
            this.oshibka = null;
        },

        async zagruzitSessiyu() {
            const response = await UnitSessionService.spisok();

            if (response.status === "success") {
                this.session = response.data.find((session) => session.id === this.sessionId) ?? null;
            }
        },

        async zagruzitIstoriyu() {
            const response = await UnitSessionService.istoriya({ sessionId: this.sessionId });

            if (response.status === "success") {
                this.hody = response.data;
            } else {
                this.oshibka = response.status === "fail" ? response.data.message : response.message;
            }
        },

        async zagruzitSostoyanie() {
            const response = await UnitSessionService.sostoyanie({ sessionId: this.sessionId });

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

            const response = await UnitSessionService.prompt({
                sessionId: this.sessionId,
                text: tekst,
                model: normalizovatModel(this.model) ?? undefined,
                credentialId: this.credentialId || undefined,
                agentModeId: this.agentModeId || undefined,
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

        async otvetit(answers: UnitSessionAnswer[], turnId?: string) {
            const idHoda = turnId ?? this.posledniyHod?.id ?? null;

            if (idHoda === null || this.otpravka) {
                return;
            }

            this.otpravka = true;
            this.oshibka = null;

            const response = await UnitSessionService.otvetit({
                turnId: idHoda,
                answers,
                model: normalizovatModel(this.model) ?? undefined,
                credentialId: this.credentialId || undefined,
                agentModeId: this.agentModeId || undefined,
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

            const response = await UnitSessionService.poluchitResultatHoda({ turnId: hod.id });

            if (response.status === "success" && response.data.status !== "RUNNING") {
                await this.zagruzitIstoriyu();
                await this.zagruzitSostoyanie();
            }
        },

        async arhivirovat() {
            if (this.sessionId === "") {
                return;
            }

            const response = await UnitSessionService.arhivirovat({ sessionId: this.sessionId });

            if (response.status === "success") {
                await this.zagruzitSessiyu();
            } else {
                this.oshibka = response.status === "fail" ? response.data.message : response.message;
            }
        },
    },
});
