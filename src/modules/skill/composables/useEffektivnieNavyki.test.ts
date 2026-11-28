import { beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import { flushPromises } from "@vue/test-utils";

const mocks = vi.hoisted(() => ({
    effektivnie: vi.fn(),
}));

vi.mock("@/bootstrap/translator", () => ({
    default: {
        global: {
            t: (key: string) => key,
            te: () => false,
        },
    },
}));

vi.mock("@/modules/skill/services/SkillService", () => ({
    default: {
        effektivnie: mocks.effektivnie,
    },
}));

import { useEffektivnieNavyki } from "@/modules/skill/composables/useEffektivnieNavyki";
import type { EffektivnyyNavyk } from "@/modules/skill/model/Navyk";

function navyk(id: string): EffektivnyyNavyk {
    return {
        skillId: id,
        slug: id,
        containerName: id,
        name: id,
        description: "",
        content: "",
        version: 1,
        hash: "hash",
        scope: "project",
        projectId: "p1",
    };
}

function uspeh(navyki: EffektivnyyNavyk[]) {
    return {
        status: "success" as const,
        data: {
            skills: navyki,
            manifestHash: "hash",
            totalBytes: 1,
        },
    };
}

describe("useEffektivnieNavyki", () => {
    beforeEach(() => {
        mocks.effektivnie.mockReset();
    });

    it("перезапрашивает навыки при изменении выбранных проектов", async () => {
        const projectIds = ref<string[]>(["p1"]);
        mocks.effektivnie
            .mockResolvedValueOnce(uspeh([navyk("one")]))
            .mockResolvedValueOnce(uspeh([navyk("one"), navyk("two")]));

        const scope = effectScope();
        const composable = scope.run(() => useEffektivnieNavyki(projectIds))!;

        await flushPromises();

        expect(mocks.effektivnie).toHaveBeenCalledWith({ projectIds: ["p1"] });
        expect(composable.navyki.value).toHaveLength(1);

        projectIds.value = ["p1", "p2"];
        await nextTick();
        await flushPromises();

        expect(mocks.effektivnie).toHaveBeenLastCalledWith({ projectIds: ["p1", "p2"] });
        expect(composable.navyki.value).toHaveLength(2);

        scope.stop();
    });

    it("очищает набор и не запрашивает при пустом выборе", async () => {
        const projectIds = ref<string[]>([]);

        const scope = effectScope();
        const composable = scope.run(() => useEffektivnieNavyki(projectIds))!;

        await flushPromises();

        expect(mocks.effektivnie).not.toHaveBeenCalled();
        expect(composable.navyki.value).toEqual([]);

        scope.stop();
    });

    it("не загружает данные, пока диалог закрыт", async () => {
        const projectIds = ref<string[]>(["p1"]);
        const enabled = ref(false);
        mocks.effektivnie.mockResolvedValue(uspeh([navyk("one")]));

        const scope = effectScope();
        const composable = scope.run(() => useEffektivnieNavyki(projectIds, { enabled }))!;

        await flushPromises();
        expect(mocks.effektivnie).not.toHaveBeenCalled();

        enabled.value = true;
        await nextTick();
        await flushPromises();

        expect(mocks.effektivnie).toHaveBeenCalledWith({ projectIds: ["p1"] });
        expect(composable.navyki.value).toHaveLength(1);

        scope.stop();
    });

    it("ошибка попадает в состояние, но не выбрасывается", async () => {
        const projectIds = ref<string[]>(["p1"]);
        mocks.effektivnie.mockResolvedValue({
            status: "error",
            message: "backend down",
            code: "500",
        });

        const scope = effectScope();
        const composable = scope.run(() => useEffektivnieNavyki(projectIds))!;

        await flushPromises();

        expect(composable.navyki.value).toEqual([]);
        expect(composable.error.value).toBe("backend down");

        scope.stop();
    });
});
