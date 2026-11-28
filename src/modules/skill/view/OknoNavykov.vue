<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { GhBanner, GhButton, GhDialog } from "@/components/ui";
import PanelNavykov from "@/modules/skill/view/PanelNavykov.vue";
import type { EffektivnyyNavyk } from "@/modules/skill/model/Navyk";

const props = withDefaults(
    defineProps<{
        modelValue: boolean;
        navyki: EffektivnyyNavyk[];
        loading?: boolean;
        error?: string | null;
        projectNames?: Record<string, string>;
        /** Манифест обрезан по лимиту: показываем предупреждение. */
        truncated?: boolean;
    }>(),
    {
        loading: false,
        error: null,
        projectNames: () => ({}),
        truncated: false,
    },
);

const emit = defineEmits<{
    (e: "update:modelValue", value: boolean): void;
    (e: "retry"): void;
}>();

const { t } = useI18n();
</script>

<template>
    <GhDialog
        :model-value="modelValue"
        :title="t('skill.chat.dialog_title')"
        width="720px"
        :close-label="t('skill.window.close')"
        @update:model-value="emit('update:modelValue', $event)"
    >
        <template #title>
            <span class="okno-navykov__title">
                {{ t('skill.chat.dialog_title') }}
                <span class="okno-navykov__count">{{ props.navyki.length }}</span>
            </span>
        </template>

        <GhBanner v-if="truncated" variant="attention" class="okno-navykov__truncated">
            {{ t('skill.chat.truncated', { count: navyki.length }) }}
        </GhBanner>

        <PanelNavykov
            :navyki="navyki"
            :loading="loading"
            :error="error"
            :project-names="projectNames"
            :empty-title="t('skill.chat.empty')"
            :empty-hint="t('skill.chat.empty_hint')"
            @retry="emit('retry')"
        />

        <template #footer>
            <GhButton
                variant="default"
                :label="t('skill.window.close')"
                @click="emit('update:modelValue', false)"
            />
        </template>
    </GhDialog>
</template>

<style scoped>
.okno-navykov__truncated {
    margin-bottom: 12px;
}

.okno-navykov__title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.okno-navykov__count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: var(--borderRadius-full);
    background-color: var(--bgColor-neutral-muted);
    color: var(--fgColor-default);
    font-size: var(--fontSize-caption);
    font-weight: var(--fontWeight-medium);
    line-height: 1;
}
</style>
