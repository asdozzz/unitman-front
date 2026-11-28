import { defineStore } from "pinia";
import WorkspaceService from "@/modules/opencode/services/WorkspaceService";
import type {
    RolUchastnikaWorkspace,
    WorkspaceParticipant,
} from "@/modules/opencode/model/WorkspaceSession";

/** Роль, которую можно назначить приглашённому: владелец единственный. */
export type RolDlyaPriglasheniya = Exclude<RolUchastnikaWorkspace, "owner">;

type DejstvieUchastnika = "invite" | "role" | "remove";

type StorUchastnikovWorkspaceState = {
    workspaceId: string;
    spisok: WorkspaceParticipant[];
    loader: boolean;
    oshibka: string | null;
    /** Аккаунт, по которому выполняется действие. */
    dejstvieAccountId: string | null;
    dejstvie: DejstvieUchastnika | null;
};

/**
 * Участники общего workspace.
 *
 * Бэкенд не отдаёт отдельный список кандидатов: приглашение идёт по
 * `accountId`, который владелец вводит вручную. Владельца нельзя понизить
 * или удалить — UI этих действий не предлагает.
 */
export const useStorUchastnikovWorkspace = defineStore("StorUchastnikovWorkspace", {
    state: (): StorUchastnikovWorkspaceState => {
        return {
            workspaceId: "",
            spisok: [],
            loader: false,
            oshibka: null,
            dejstvieAccountId: null,
            dejstvie: null,
        };
    },

    getters: {
        /** Владелец workspace (единственный). */
        vladelec(state): WorkspaceParticipant | null {
            return state.spisok.find((uchastnik) => uchastnik.owner) ?? null;
        },

        /** Участники, которыми можно управлять. */
        upravlyaemie(state): WorkspaceParticipant[] {
            return state.spisok.filter((uchastnik) => !uchastnik.owner);
        },

        idetDejstvie(state): boolean {
            return state.dejstvie !== null;
        },
    },

    actions: {
        async zagruzit(workspaceId: string) {
            this.workspaceId = workspaceId;
            this.loader = true;
            this.oshibka = null;

            const response = await WorkspaceService.spisokUchastnikov({ workspaceId });

            this.loader = false;

            if (response.status === "success") {
                this.spisok = response.data.items;

                return;
            }

            this.spisok = [];
            this.oshibka = response.status === "fail" ? response.data.message : response.message;
        },

        async dobavit(params: {
            accountId: string;
            role: RolDlyaPriglasheniya;
            credentialId?: string | null;
            model?: string | null;
        }): Promise<boolean> {
            if (this.workspaceId === "" || params.accountId.trim() === "") {
                return false;
            }

            this.nachatDejstvie(params.accountId.trim(), "invite");

            const response = await WorkspaceService.dobavitUchastnika({
                workspaceId: this.workspaceId,
                accountId: params.accountId.trim(),
                role: params.role,
                credentialId: params.credentialId ?? null,
                model: params.model ?? null,
            });

            this.zavershitDejstvie();

            if (response.status !== "success") {
                this.oshibka = response.status === "fail" ? response.data.message : response.message;

                return false;
            }

            await this.zagruzit(this.workspaceId);

            return true;
        },

        async izmenit(params: {
            accountId: string;
            role: RolDlyaPriglasheniya;
            credentialId?: string | null;
            model?: string | null;
        }): Promise<boolean> {
            if (this.workspaceId === "") {
                return false;
            }

            this.nachatDejstvie(params.accountId, "role");

            const response = await WorkspaceService.izmenitUchastnika({
                workspaceId: this.workspaceId,
                accountId: params.accountId,
                role: params.role,
                credentialId: params.credentialId ?? null,
                model: params.model ?? null,
            });

            this.zavershitDejstvie();

            if (response.status !== "success") {
                this.oshibka = response.status === "fail" ? response.data.message : response.message;

                return false;
            }

            await this.zagruzit(this.workspaceId);

            return true;
        },

        async udalit(accountId: string): Promise<boolean> {
            if (this.workspaceId === "") {
                return false;
            }

            this.nachatDejstvie(accountId, "remove");

            const response = await WorkspaceService.udalitUchastnika({
                workspaceId: this.workspaceId,
                accountId,
            });

            this.zavershitDejstvie();

            if (response.status !== "success") {
                this.oshibka = response.status === "fail" ? response.data.message : response.message;

                return false;
            }

            await this.zagruzit(this.workspaceId);

            return true;
        },

        sbrositOshibku() {
            this.oshibka = null;
        },

        zakrit() {
            this.workspaceId = "";
            this.spisok = [];
            this.loader = false;
            this.oshibka = null;
            this.dejstvieAccountId = null;
            this.dejstvie = null;
        },

        nachatDejstvie(accountId: string, dejstvie: DejstvieUchastnika) {
            this.dejstvieAccountId = accountId;
            this.dejstvie = dejstvie;
            this.oshibka = null;
        },

        zavershitDejstvie() {
            this.dejstvieAccountId = null;
            this.dejstvie = null;
        },
    },
});
