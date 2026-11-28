import { defineStore } from "pinia";
import WorkspaceService from "@/modules/opencode/services/WorkspaceService";
import { useStorRezhimovAgenta } from "@/modules/agent-mode/store/StorRezhimovAgenta";
import { useStorSpiskaRekvizitovOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/StorSpiskaRekvizitovOpenCode";
import {
    modeliRekvizitov,
    modelPoUmolchaniyu,
    normalizovatModel,
} from "@/modules/opencode/model/ModeliOpenCode";
import {
    normalizovatHodWorkspace,
    statusTranzitniy,
    type RolUchastnikaWorkspace,
    type WorkspaceAnswer,
    type WorkspaceQuestion,
    type WorkspaceSession,
    type WorkspaceState,
    type WorkspaceTurn,
} from "@/modules/opencode/model/WorkspaceSession";
import type { RekvizityOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/model/OpenCodeRekvizity";

type StorChataWorkspaceState = {
    workspaceId: string;
    workspace: WorkspaceSession | null;
    sostoyanie: WorkspaceState | null;
    hody: WorkspaceTurn[];
    prompt: string;
    /** Выбранные личные реквизиты текущего участника для следующих ходов. */
    credentialId: string;
    /** Выбранный мод агента для следующих ходов. */
    agentModeId: string;
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
 * Состояние чата workspace. Не знает о unit-сессиях.
 *
 * Workspace может быть общим: каждый участник ходит под своими личными
 * реквизитами. Стор хранит выбранные реквизиты текущего пользователя и
 * отправляет их в `prompt`/`otvetit`, чтобы ход не зависел от чужих ключей.
 */
export const useStorChataWorkspace = defineStore("StorChataWorkspace", {
    state: (): StorChataWorkspaceState => {
        return {
            workspaceId: "",
            workspace: null,
            sostoyanie: null,
            hody: [],
            prompt: "",
            credentialId: "",
            agentModeId: "",
            model: "",
            poslednyayaModel: "",
            loader: false,
            otpravka: false,
            oshibka: null,
        };
    },

    getters: {
        posledniyHod(state): WorkspaceTurn | null {
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

        /** Личные реквизиты текущего пользователя (список аккаунта, без чужих). */
        dostupnieRekvizity(): RekvizityOpenCode[] {
            return useStorSpiskaRekvizitovOpenCode().spisok;
        },

        /** Реквизиты, выбранные для следующих ходов. */
        vibranieRekvizity(): RekvizityOpenCode | null {
            if (this.credentialId === "") {
                return null;
            }

            return useStorSpiskaRekvizitovOpenCode().rekvizityPoId(this.credentialId);
        },

        /**
         * Каталог моделей выбранных реквизитов.
         *
         * Раньше здесь был объединённый список моделей всех реквизитов, но
         * общий workspace требует, чтобы модель принадлежала именно тем
         * реквизитам, под которыми идёт ход.
         */
        dostupnieModeli(): string[] {
            return modeliRekvizitov(this.vibranieRekvizity);
        },

        /** Модель по умолчанию: модель workspace, участника, реквизитов, затем последняя. */
        modelPoUmolchaniyu(state): string {
            return state.workspace?.model
                || state.sostoyanie?.myDefaultModel
                || modelPoUmolchaniyu(this.vibranieRekvizity)
                || state.poslednyayaModel
                || "";
        },

        /** Текущая роль пользователя в workspace. */
        moyaRol(state): RolUchastnikaWorkspace | null {
            return state.sostoyanie?.myRole ?? state.workspace?.myRole ?? null;
        },

        /** Может ли текущий пользователь управлять участниками. */
        mozhnoUpravlyat(): boolean {
            return this.sostoyanie?.canManage === true;
        },

        hodVipolnyaetsya(): boolean {
            return this.posledniyHod?.status === "RUNNING";
        },

        /**
         * Причина, по которой композер недоступен.
         *
         * Возвращает ключ перевода (или `null`, если писать можно). Стор не
         * содержит русских подписей — их подставляет компонент.
         */
        prichinaNedostupnosti(state): string | null {
            if (this.mozhnoOtpravlyat) {
                return null;
            }

            if (this.moyaRol === "viewer") {
                return "opencode.workspace.chat.states.viewer";
            }

            if (this.hodVipolnyaetsya) {
                return "opencode.workspace.chat.states.turn_running";
            }

            if (state.sostoyanie === null) {
                return null;
            }

            if (state.sostoyanie.archived) {
                return "opencode.workspace.chat.states.archived";
            }

            if (statusTranzitniy(state.sostoyanie.status)) {
                return "opencode.workspace.chat.states.transient";
            }

            if (state.sostoyanie.status === "ERROR") {
                return "opencode.workspace.chat.states.error";
            }

            return "opencode.workspace.chat.waiting";
        },

        /**
         * Можно ли отправлять сообщения.
         *
         * `canAcceptMessages` уже учитывает роль и занятость на бэкенде, но
         * `viewer` запрещаем писать и на клиенте — так композер не мигает,
         * если сервер прислал устаревшее состояние.
         */
        mozhnoOtpravlyat(): boolean {
            return this.moyaRol !== "viewer"
                && !this.hodVipolnyaetsya
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
            this.credentialId = "";
            this.agentModeId = "";
            this.model = "";

            const storRekvizitov = useStorSpiskaRekvizitovOpenCode();

            await Promise.all([
                this.zagruzitWorkspace(),
                this.zagruzitIstoriyu(),
                this.zagruzitSostoyanie(),
                storRekvizitov.spisok.length === 0
                    ? storRekvizitov.poluchitSpisok()
                    : Promise.resolve(null),
            ]);

            await useStorRezhimovAgenta().zagruzit();
            this.primenitRezhimPoUmolchaniyu();
            this.primenitRekvizityPoUmolchaniyu();
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

        /** Подставить дефолтный мод для workspace-чата. */
        primenitRezhimPoUmolchaniyu() {
            if (this.agentModeId !== "") {
                return;
            }

            const rezhim = useStorRezhimovAgenta().poUmolchaniyu("workspace");

            if (rezhim !== null) {
                this.ustanovitRezhim(rezhim.id);
            }
        },

        /** Записать выбранные реквизиты и их модель по умолчанию. */
        ustanovitRekvizity(credentialId: string | null) {
            this.credentialId = credentialId ?? "";

            if (this.model === "") {
                this.model = modelPoUmolchaniyu(this.vibranieRekvizity);
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

        /**
         * Подставить реквизиты по умолчанию.
         *
         * Приоритет: личные реквизиты из состояния workspace, затем первые
         * реквизиты аккаунта. Если у пользователя нет реквизитов, поле
         * остаётся пустым — бэкенд ответит `opencode.session.credential_required`.
         */
        primenitRekvizityPoUmolchaniyu() {
            if (this.credentialId !== "") {
                return;
            }

            const dostupnie = this.dostupnieRekvizity;
            const izSostoyaniya = this.sostoyanie?.myDefaultCredentialId ?? null;

            if (izSostoyaniya !== null && dostupnie.some((rekvizity) => rekvizity.id === izSostoyaniya)) {
                this.credentialId = izSostoyaniya;

                return;
            }

            this.credentialId = dostupnie[0]?.id ?? "";
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

            this.workspaceId = "";
            this.workspace = null;
            this.sostoyanie = null;
            this.hody = [];
            this.prompt = "";
            this.credentialId = "";
            this.agentModeId = "";
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
                this.hody = response.data.map(normalizovatHodWorkspace);
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
                credentialId: normalizovatModel(this.credentialId),
                model: normalizovatModel(this.model) ?? undefined,
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
                credentialId: normalizovatModel(this.credentialId),
                model: normalizovatModel(this.model) ?? undefined,
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
