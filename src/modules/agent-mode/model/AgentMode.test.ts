import { describe, expect, it } from "vitest";
import {
    dostupnyeRezhimy,
    rezhimPoUmolchaniyu,
    type AgentMode,
} from "@/modules/agent-mode/model/AgentMode";

function mode(patch: Partial<AgentMode> & Pick<AgentMode, "id" | "name">): AgentMode {
    return {
        slug: patch.id,
        description: "",
        accessMode: "build",
        isGlobal: true,
        isOwner: false,
        enabled: true,
        sortOrder: 0,
        credentialId: null,
        model: null,
        isDefaultUnit: false,
        isDefaultWorkspace: false,
        ...patch,
    };
}

describe("dostupnyeRezhimy", () => {
    it("скрывает выключенные и сортирует по порядку", () => {
        const modes = [
            mode({ id: "b", name: "B", sortOrder: 20 }),
            mode({ id: "a", name: "A", sortOrder: 10 }),
            mode({ id: "c", name: "C", sortOrder: 0, enabled: false }),
        ];

        expect(dostupnyeRezhimy(modes).map((item) => item.id)).toEqual(["a", "b"]);
    });
});

describe("rezhimPoUmolchaniyu", () => {
    it("берёт дефолт типа чата", () => {
        const modes = [
            mode({ id: "build", name: "Build" }),
            mode({ id: "plan", name: "Plan", accessMode: "plan" }),
        ];

        const result = rezhimPoUmolchaniyu(modes, { unit: "plan", workspace: "build" }, "unit");

        expect(result?.id).toBe("plan");
    });

    it("падает на первый включённый, если дефолт недоступен", () => {
        const modes = [
            mode({ id: "build", name: "Build", sortOrder: 1 }),
            mode({ id: "plan", name: "Plan", sortOrder: 2, enabled: false }),
        ];

        const result = rezhimPoUmolchaniyu(modes, { unit: "plan", workspace: "" }, "unit");

        expect(result?.id).toBe("build");
    });
});
