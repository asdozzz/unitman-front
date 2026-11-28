<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { GhBox, GhButton, GhCounter } from "@/components/ui";
import PanelNavykov from "@/modules/skill/view/PanelNavykov.vue";
import type { EffektivnyyNavyk } from "@/modules/skill/model/Navyk";

/**
 * Сворачиваемый блок «Навыки агента» в диалогах создания.
 *
 * Показывает, какие навыки получит агент до старта сессии/workspace. Рендер
 * списка полностью делегируется `PanelNavykov`; здесь только заголовок,
 * счётчик и сворачивание. Ошибка не блокирует создание.
 */
const props = withDefaults(
    defineProps<{
        navyki: EffektivnyyNavyk[];
        loading?: boolean;
        error?: string | null;
        projectNames?: Record<string, string>;
        /** Раскрыть блок сразу (по умолчанию свёрнут). */
        expanded?: boolean;
    }>(),
    {
        loading: false,
        error: null,
        projectNames: () => ({}),
        expanded: false,
    },
);

const emit = defineEmits<{
    (e: "retry"): void;
}>();

const { t } = useI18n();

const raskryto = ref<boolean>(props.expanded);

/**
 * Если навыков немного, список полезно показать сразу: он ещё обозрим.
 * Ручное сворачивание пользователем больше не переопределяем.
 */
let avtoraskritieSdelano = false;

watch(
    () => [props.loading, props.error, props.navyki.length] as const,
    ([loading, error, count]) => {
        if (avtoraskritieSdelano || loading || error !== null || count === 0) {
            return;
        }

        avtoraskritieSdelano = true;

        if (count <= 3) {
            raskryto.value = true;
        }
    },
    { immediate: true },
);
</script>

<template>
    <GhBox padding="none" class="blok-navykov">
        <template #header>
            <GhButton
                variant="invisible"
                size="sm"
                :icon="raskryto ? 'chevron-down' : 'chevron-right'"
                :aria-expanded="raskryto"
                :aria-label="raskryto ? t('skill.create.collapse') : t('skill.create.expand')"
                @click="raskryto = !raskryto"
            />
            <span>{{ t('skill.create.title') }}</span>
            <GhCounter :value="props.navyki.length" />
        </template>

        <div v-show="raskryto" class="blok-navykov__body">
            <p class="blok-navykov__hint">{{ t('skill.create.hint') }}</p>

            <PanelNavykov
                :navyki="navyki"
                :loading="loading"
                :error="error"
                :project-names="projectNames"
                :empty-title="t('skill.create.empty')"
                :empty-hint="t('skill.create.empty_hint')"
                @retry="emit('retry')"
            />
        </div>
    </GhBox>
</template>

<style scoped>
.blok-navykov__body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
}

.blok-navykov__hint {
    margin: 0;
    color: var(--fgColor-muted);
    font-size: var(--fontSize-caption);
}
</style>
