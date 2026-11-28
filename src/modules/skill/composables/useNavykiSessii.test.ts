import { beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import { flushPromises } from "@vue/test-utils";

const mocks = vi.hoisted(() => ({
    navykiSessii: vi.fn(),
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
        navykiSessii: mocks.navykiSessii,
    },
}));

import { useNavykiSessii } from "@/modules/skill/composables/useNavykiSessii";
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
        scope: "global",
        projectId: null,
    };
}

function uspeh(navyki: EffektivnyyNavyk[], truncated = false) {
    return {
        status: "success" as const,
        data: {
            skills: navyki,
            manifestHash: "hash",
            totalBytes: 1,
            truncated,
        },
    };
}

describe("useNavykiSessii", () => {
    beforeEach(() => {
        mocks.navykiSessii.mockReset();
    });

    it("загружает навыки и перечитывает их при смене сессии", async () => {
        const id = ref("session-1");
        mocks.navykiSessii
            .mockResolvedValueOnce(uspeh([navyk("first")], true))
            .mockResolvedValueOnce(uspeh([navyk("second")]));

        const scope = effectScope();
        const composable = scope.run(() => useNavykiSessii(id))!;

        await flushPromises();

        expect(mocks.navykiSessii).toHaveBeenCalledWith({ sessionId: "session-1" });
        expect(composable.navyki.value.map((item) => item.skillId)).toEqual(["first"]);
        expect(composable.truncated.value).toBe(true);
        expect(composable.error.value).toBeNull();

        id.value = "session-2";
        await nextTick();
        await flushPromises();

        expect(mocks.navykiSessii).toHaveBeenLastCalledWith({ sessionId: "session-2" });
        expect(composable.navyki.value.map((item) => item.skillId)).toEqual(["second"]);
        expect(composable.truncated.value).toBe(false);

        scope.stop();
    });

    it("трактует 404 как пустой набор без ошибки", async () => {
        mocks.navykiSessii.mockResolvedValue({ status: "empty" });

        const scope = effectScope();
        const composable = scope.run(() => useNavykiSessii(ref("session-1")))!;

        await flushPromises();

        expect(composable.navyki.value).toEqual([]);
        expect(composable.error.value).toBeNull();
        expect(composable.loading.value).toBe(false);

        scope.stop();
    });

    it("сохраняет ошибку в состоянии и не выбрасывает её", async () => {
        mocks.navykiSessii.mockResolvedValue({
            status: "error",
            message: "",
            code: 403,
        });

        const scope = effectScope();
        const composable = scope.run(() => useNavykiSessii(ref("session-1")))!;

        await flushPromises();

        expect(composable.navyki.value).toEqual([]);
        expect(composable.error.value).toBe("skill.chat.error_forbidden");

        scope.stop();
    });

    it("ручной retry перечитывает навыки", async () => {
        mocks.navykiSessii.mockResolvedValue(uspeh([navyk("retry")]));

        const scope = effectScope();
        const composable = scope.run(() => useNavykiSessii(ref("session-1")))!;

        await flushPromises();
        mocks.navykiSessii.mockClear();

        await composable.zagruzit();

        expect(mocks.navykiSessii).toHaveBeenCalledTimes(1);
        expect(composable.navyki.value.map((item) => item.skillId)).toEqual(["retry"]);

        scope.stop();
    });
});
