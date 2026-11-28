import { ref, toValue, watch, type MaybeRefOrGetter } from "vue";
import i18n from "@/bootstrap/translator";
import SkillService, { type OtvetNavykovSessii } from "@/modules/skill/services/SkillService";
import type { EffektivnyyNavyk } from "@/modules/skill/model/Navyk";

/**
 * Навыки существующей сессии OpenCode.
 *
 * Сессия может быть unit-сессией или workspace: бэкенд сам разрешает проекты
 * из неё, поэтому `projectIds` здесь не передаются. При смене идентификатора
 * состояние сбрасывается и данные перечитываются. Любая ошибка (включая
 * `401`/`403`/`422`) попадает в `error`, но не выбрасывается — чат остаётся
 * рабочим. `404` (старый бэкенд) трактуется как пустой набор.
 */
export function useNavykiSessii(sessionId: MaybeRefOrGetter<string | null | undefined>) {
    const navyki = ref<EffektivnyyNavyk[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const truncated = ref(false);

    /** Поколение запроса: опоздавший ответ старой сессии не применяется. */
    let pokolenie = 0;

    /** Переводит машинный ключ, если он есть в словаре, иначе оставляет как есть. */
    function perevesti(tekst: string): string {
        return i18n.global.te(tekst) ? i18n.global.t(tekst) : tekst;
    }

    /** Осмысленный текст ошибки по HTTP-коду без раскрытия технических деталей. */
    function soobshcheniePoKodu(code: number): string {
        if (code === 401 || code === 403) {
            return i18n.global.t("skill.chat.error_forbidden");
        }

        if (code === 422) {
            return i18n.global.t("skill.chat.error_invalid");
        }

        return i18n.global.t("skill.chat.error");
    }

    function sbrosit(): void {
        navyki.value = [];
        loading.value = false;
        error.value = null;
        truncated.value = false;
    }

    /** Ручная/автоматическая загрузка по текущему идентификатору сессии. */
    async function zagruzit(): Promise<void> {
        const id = toValue(sessionId);
        const nomer = ++pokolenie;

        if (!id) {
            sbrosit();
            return;
        }

        loading.value = true;
        error.value = null;

        let otvet: OtvetNavykovSessii;

        try {
            otvet = await SkillService.navykiSessii({ sessionId: id });
        } catch {
            if (nomer !== pokolenie) {
                return;
            }

            loading.value = false;
            navyki.value = [];
            truncated.value = false;
            error.value = i18n.global.t("skill.chat.error");

            return;
        }

        if (nomer !== pokolenie) {
            return;
        }

        loading.value = false;

        if (otvet.status === "success") {
            navyki.value = otvet.data.skills;
            truncated.value = otvet.data.truncated;
            return;
        }

        if (otvet.status === "empty") {
            navyki.value = [];
            truncated.value = false;
            return;
        }

        navyki.value = [];
        truncated.value = false;
        error.value = otvet.message !== ""
            ? perevesti(otvet.message)
            : soobshcheniePoKodu(otvet.code);
    }

    watch(
        () => toValue(sessionId),
        (id, stariy) => {
            if (id === stariy) {
                return;
            }

            // Сразу убираем навыки прошлой сессии, чтобы не мелькали чужие.
            sbrosit();

            if (id) {
                void zagruzit();
            }
        },
        { immediate: true },
    );

    return { navyki, loading, error, truncated, zagruzit };
}
