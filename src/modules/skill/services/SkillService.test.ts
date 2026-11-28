import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    post: vi.fn(),
    requestRaw: vi.fn(),
}));

vi.mock("@/bootstrap/apiClient", () => ({
    default: {
        post: mocks.post,
        get: vi.fn(),
        requestRaw: mocks.requestRaw,
    },
}));

import SkillService from "@/modules/skill/services/SkillService";

describe("SkillService: контракт /skill/*", () => {
    beforeEach(() => {
        mocks.post.mockReset().mockResolvedValue({ status: "success", data: {} });
        mocks.requestRaw.mockReset();
    });

    it("запрашивает список в заданном контексте", async () => {
        await SkillService.spisok({ scope: "project", projectId: "project-1", includeArchived: true });

        expect(mocks.post).toHaveBeenCalledWith("/skill/spisok", {
            scope: "project",
            projectId: "project-1",
            includeArchived: true,
        });
    });

    it("читает полную карточку навыка", async () => {
        await SkillService.read("skill-1");

        expect(mocks.post).toHaveBeenCalledWith("/skill/read", { id: "skill-1" });
    });

    it("создаёт навык с областью и проектами", async () => {
        await SkillService.sozdat({
            name: "Навык",
            slug: "navyk",
            description: "Описание",
            content: "Инструкция",
            scope: "project",
            projectIds: ["project-1"],
        });

        expect(mocks.post).toHaveBeenCalledWith("/skill/sozdat", {
            name: "Навык",
            slug: "navyk",
            description: "Описание",
            content: "Инструкция",
            scope: "project",
            projectIds: ["project-1"],
        });
    });

    it("изменяет, архивирует и запрашивает версии", async () => {
        await SkillService.izmenit({ id: "skill-1", name: "Новое имя" });
        await SkillService.udalit({ id: "skill-1" });
        await SkillService.versii({ id: "skill-1" });

        expect(mocks.post).toHaveBeenNthCalledWith(1, "/skill/izmenit", {
            id: "skill-1",
            name: "Новое имя",
        });
        expect(mocks.post).toHaveBeenNthCalledWith(2, "/skill/udalit", { id: "skill-1" });
        expect(mocks.post).toHaveBeenNthCalledWith(3, "/skill/versii", { id: "skill-1" });
    });

    it("прикрепляет и открепляет проектный навык", async () => {
        await SkillService.prikrepit({ id: "skill-1", projectIds: ["project-1", "project-2"] });
        await SkillService.otkrepit({ id: "skill-1", projectId: "project-1" });

        expect(mocks.post).toHaveBeenNthCalledWith(1, "/skill/prikrepit", {
            id: "skill-1",
            projectIds: ["project-1", "project-2"],
        });
        expect(mocks.post).toHaveBeenNthCalledWith(2, "/skill/otkrepit", {
            id: "skill-1",
            projectId: "project-1",
        });
    });

    it("запрашивает эффективный набор навыков", async () => {
        await SkillService.effektivnie({ projectIds: ["project-1"] });

        expect(mocks.post).toHaveBeenCalledWith("/skill/effektivnie", {
            projectIds: ["project-1"],
        });
    });
});

describe("SkillService: навыки сессии", () => {
    beforeEach(() => {
        mocks.requestRaw.mockReset();
    });

    it("распаковывает конверт и отдаёт truncated", async () => {
        mocks.requestRaw.mockResolvedValue({
            ok: true,
            status: 200,
            data: {
                status: "success",
                data: {
                    skills: [{ skillId: "s1", name: "Skill" }],
                    manifestHash: "hash",
                    totalBytes: 42,
                    truncated: true,
                },
            },
            error: null,
        });

        const result = await SkillService.navykiSessii({ sessionId: "session-1" });

        expect(mocks.requestRaw).toHaveBeenCalledWith("post", "/opencode/navyki", {
            sessionId: "session-1",
        });
        expect(result).toEqual({
            status: "success",
            data: {
                skills: [{ skillId: "s1", name: "Skill" }],
                manifestHash: "hash",
                totalBytes: 42,
                truncated: true,
            },
        });
    });

    it("принимает «плоский» ответ без конверта", async () => {
        mocks.requestRaw.mockResolvedValue({
            ok: true,
            status: 200,
            data: { skills: [], manifestHash: "", totalBytes: 0, truncated: false },
            error: null,
        });

        const result = await SkillService.navykiSessii({ sessionId: "session-1" });

        expect(result.status).toBe("success");
    });

    it("трактует 404 как пустой набор для старого бэкенда", async () => {
        mocks.requestRaw.mockResolvedValue({
            ok: false,
            status: 404,
            data: null,
            error: "Not found",
        });

        const result = await SkillService.navykiSessii({ sessionId: "session-1" });

        expect(result).toEqual({ status: "empty" });
    });

    it("возвращает ошибку со статусом для 403", async () => {
        mocks.requestRaw.mockResolvedValue({
            ok: false,
            status: 403,
            data: null,
            error: "Forbidden",
        });

        const result = await SkillService.navykiSessii({ sessionId: "session-1" });

        expect(result).toEqual({ status: "error", message: "Forbidden", code: 403 });
    });
});
