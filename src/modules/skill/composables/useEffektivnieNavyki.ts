import { ref, toValue, watch, type MaybeRefOrGetter } from "vue";
import i18n from "@/bootstrap/translator";
import type { ApiResponse } from "@/bootstrap/apiClient/ApiResponse";
import SkillService from "@/modules/skill/services/SkillService";
import type {
    EffektivnyyNavyk,
    RezultatEffektivnyhNavykov,
} from "@/modules/skill/model/Navyk";

export type OpciiEffektivnyhNavykov = {
    /** Загружать ли данные (например, только пока открыт диалог). */
    enabled?: MaybeRefOrGetter<boolean>;
    /** Задержка перед запросом при изменении выбора проектов, мс. */
    debounceMs?: number;
};

/**
 * Эффективные навыки для набора проектов — используется в диалогах создания,
 * когда сессии ещё нет. При изменении выбранных проектов запрос выполняется
 * с debounce; ошибка не блокирует создание сессии/workspace.
 */
export function useEffektivnieNavyki(
    projectIds: MaybeRefOrGetter<string[]>,
    options: OpciiEffektivnyhNavykov = {},
) {
    const navyki = ref<EffektivnyyNavyk[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);

    const debounceMs = options.debounceMs ?? 0;

    /** Поколение запроса: применяется только ответ на актуальный выбор. */
    let pokolenie = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function ostanovitTaimer(): void {
        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
    }

    function sbrosit(): void {
        ostanovitTaimer();
        navyki.value = [];
        loading.value = false;
        error.value = null;
    }

    async function zagruzit(): Promise<void> {
        const ids = toValue(projectIds).filter((id) => id !== "");

        if (ids.length === 0) {
            sbrosit();
            return;
        }

        const nomer = ++pokolenie;
        loading.value = true;
        error.value = null;

        let response: ApiResponse<RezultatEffektivnyhNavykov>;

        try {
            response = await SkillService.effektivnie({ projectIds: ids });
        } catch {
            if (nomer !== pokolenie) {
                return;
            }

            loading.value = false;
            navyki.value = [];
            error.value = i18n.global.t("skill.create.error");

            return;
        }

        if (nomer !== pokolenie) {
            return;
        }

        loading.value = false;

        if (response.status === "success") {
            navyki.value = response.data.skills ?? [];
            return;
        }

        navyki.value = [];
        error.value = response.status === "fail"
            ? response.data.message
            : response.message;
    }

    /** Запланировать загрузку (с debounce для частых изменений выбора). */
    function zaprosit(): void {
        ostanovitTaimer();

        if (debounceMs <= 0) {
            void zagruzit();
            return;
        }

        timer = setTimeout(() => {
            timer = null;
            void zagruzit();
        }, debounceMs);
    }

    watch(
        () => {
            const ids = toValue(projectIds).join(",");
            const vklyucheno = options.enabled === undefined
                ? true
                : toValue(options.enabled);

            return `${ids}|${vklyucheno ? "1" : "0"}`;
        },
        (klyuch) => {
            const [ids, vklyucheno] = klyuch.split("|");

            if (vklyucheno !== "1" || ids === "") {
                sbrosit();
                return;
            }

            zaprosit();
        },
        { immediate: true },
    );

    return { navyki, loading, error, zagruzit };
}
