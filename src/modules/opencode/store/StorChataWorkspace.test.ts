import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const mocks = vi.hoisted(() => ({
    spisok: vi.fn(),
    sostoyanie: vi.fn(),
    istoriya: vi.fn(),
    prompt: vi.fn(),
    otvetit: vi.fn(),
    arhivirovat: vi.fn(),
    poluchitResultatHoda: vi.fn(),
}));

vi.mock("@/modules/opencode/services/WorkspaceService", () => ({
    default: {
        spisok: mocks.spisok,
        sostoyanie: mocks.sostoyanie,
        istoriya: mocks.istoriya,
        prompt: mocks.prompt,
        otvetit: mocks.otvetit,
        arhivirovat: mocks.arhivirovat,
        poluchitResultatHoda: mocks.poluchitResultatHoda,
    },
}));

import { useStorChataWorkspace } from "@/modules/opencode/store/StorChataWorkspace";
import { useStorSpiskaRekvizitovOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/StorSpiskaRekvizitovOpenCode";
import type { RekvizityOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/model/OpenCodeRekvizity";
import type { WorkspaceState } from "@/modules/opencode/model/WorkspaceSession";

function kred(id: string, name: string, models: string[]): RekvizityOpenCode {
    return {
        id,
        name,
        apiKeyHint: "****0000",
        createdAt: 1,
        defaultModel: models[0] ?? "",
        model: models[0] ?? "",
        models,
        provider: "openai",
        updatedAt: 1,
    } as RekvizityOpenCode;
}

function sost(patch: Partial<WorkspaceState> = {}): WorkspaceState {
    return {
        id: "ws-1",
        name: "Workspace",
        branch: "main",
        status: "RUNNING",
        readOnly: false,
        archived: false,
        archiveReason: null,
        errorKey: null,
        projects: [],
        ideLink: null,
        canAcceptMessages: true,
        lastTurnId: null,
        lastTurnStatus: null,
        ...patch,
    };
}

const USPEH_ZAPUSKA = {
    status: "success",
    data: { turnId: "turn-1", status: "RUNNING", progressChannel: "progress-1" },
};

describe("StorChataWorkspace: реквизиты участника", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();

        mocks.spisok.mockResolvedValue({ status: "success", data: [] });
        mocks.sostoyanie.mockResolvedValue({ status: "success", data: sost() });
        mocks.istoriya.mockResolvedValue({ status: "success", data: [] });
        mocks.prompt.mockResolvedValue(USPEH_ZAPUSKA);
        mocks.otvetit.mockResolvedValue(USPEH_ZAPUSKA);
    });

    it("инициализирует реквизиты из myDefaultCredentialId", () => {
        const storRekvizitov = useStorSpiskaRekvizitovOpenCode();
        storRekvizitov.spisok = [kred("c1", "Первый", ["gpt-4o"]), kred("c2", "Второй", ["gpt-4o-mini"])];

        const stor = useStorChataWorkspace();
        stor.$patch({ sostoyanie: sost({ myDefaultCredentialId: "c2" }) });

        stor.primenitRekvizityPoUmolchaniyu();

        expect(stor.credentialId).toBe("c2");
    });

    it("берёт первые свои реквизиты, если дефолт недоступен", () => {
        const storRekvizitov = useStorSpiskaRekvizitovOpenCode();
        storRekvizitov.spisok = [kred("c1", "Первый", ["gpt-4o"])];

        const stor = useStorChataWorkspace();
        stor.$patch({ sostoyanie: sost({ myDefaultCredentialId: "missing" }) });

        stor.primenitRekvizityPoUmolchaniyu();

        expect(stor.credentialId).toBe("c1");
    });

    it("строит каталог моделей только по выбранным реквизитам", () => {
        const storRekvizitov = useStorSpiskaRekvizitovOpenCode();
        storRekvizitov.spisok = [
            kred("c1", "Первый", ["gpt-4o"]),
            kred("c2", "Второй", ["claude-sonnet-4"]),
        ];

        const stor = useStorChataWorkspace();
        stor.$patch({ credentialId: "c2" });

        expect(stor.dostupnieModeli).toEqual(["claude-sonnet-4"]);
    });

    it("передаёт credentialId в промпт хода", async () => {
        const stor = useStorChataWorkspace();
        stor.$patch({
            workspaceId: "ws-1",
            prompt: "Сделай план",
            credentialId: "c1",
            model: "gpt-4o",
            sostoyanie: sost({ myRole: "writer", canAcceptMessages: true }),
        });

        await stor.otpravit();

        expect(mocks.prompt).toHaveBeenCalledWith({
            workspaceId: "ws-1",
            text: "Сделай план",
            credentialId: "c1",
            model: "gpt-4o",
        });
    });

    it("передаёт credentialId в ответ на вопросы", async () => {
        const stor = useStorChataWorkspace();
        stor.$patch({
            workspaceId: "ws-1",
            credentialId: "c1",
            model: "gpt-4o",
            sostoyanie: sost({ myRole: "writer", canAcceptMessages: true }),
        });

        await stor.otvetit([{ QuestionId: "q-1", OptionId: null, Text: "Да" }], "turn-1");

        expect(mocks.otvetit).toHaveBeenCalledWith({
            turnId: "turn-1",
            answers: [{ QuestionId: "q-1", OptionId: null, Text: "Да" }],
            credentialId: "c1",
            model: "gpt-4o",
        });
    });
});

describe("StorChataWorkspace: роли и ошибки", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();

        mocks.spisok.mockResolvedValue({ status: "success", data: [] });
        mocks.sostoyanie.mockResolvedValue({ status: "success", data: sost() });
        mocks.istoriya.mockResolvedValue({ status: "success", data: [] });
        mocks.prompt.mockResolvedValue(USPEH_ZAPUSKA);
    });

    it("viewer не может отправлять сообщения", async () => {
        const stor = useStorChataWorkspace();
        stor.$patch({
            workspaceId: "ws-1",
            prompt: "Текст",
            sostoyanie: sost({ myRole: "viewer", canAcceptMessages: true }),
        });

        expect(stor.mozhnoOtpravlyat).toBe(false);
        expect(stor.prichinaNedostupnosti).toBe("opencode.workspace.chat.states.viewer");

        await stor.otpravit();

        expect(mocks.prompt).not.toHaveBeenCalled();
    });

    it("занятый ход даёт понятную причину недоступности", () => {
        const stor = useStorChataWorkspace();
        stor.$patch({
            sostoyanie: sost({ myRole: "writer", canAcceptMessages: false }),
            hody: [{
                id: "turn-1",
                sessionId: "ws-1",
                seq: 1,
                status: "RUNNING",
                requestText: "Текст",
                answers: [],
                result: null,
                errorKey: null,
                createdAt: 1,
                finishedAt: null,
                progressChannel: "progress-1",
            }],
        });

        expect(stor.mozhnoOtpravlyat).toBe(false);
        expect(stor.prichinaNedostupnosti).toBe("opencode.workspace.chat.states.turn_running");
    });

    it("разбирает ошибку opencode.session.busy без потери ключа", async () => {
        mocks.prompt.mockResolvedValue({
            status: "fail",
            data: { message: "opencode.session.busy" },
        });

        const stor = useStorChataWorkspace();
        stor.$patch({
            workspaceId: "ws-1",
            prompt: "Текст",
            credentialId: "c1",
            sostoyanie: sost({ myRole: "writer", canAcceptMessages: true }),
        });

        await stor.otpravit();

        expect(stor.oshibka).toBe("opencode.session.busy");
    });
});
