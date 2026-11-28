<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import dayjs from "dayjs";
import { GhBox, GhLabel } from "@/components/ui";
import type { NavykKratko } from "@/modules/skill/model/Navyk";

const { t } = useI18n();

const props = withDefaults(
    defineProps<{
        navyk: NavykKratko;
        /** Имя проекта для бейджа проектного навыка (если известно). */
        projectName?: string | null;
    }>(),
    {
        projectName: null,
    },
);

const oblast = computed<string>(() => {
    if (props.navyk.isGlobal) {
        return t("skill.scopes.global");
    }

    return props.projectName ?? t("skill.scopes.project");
});

const netOpisaniya = computed<boolean>(() => props.navyk.description.trim() === "");

const opisanie = computed<string>(() =>
    netOpisaniya.value ? t("skill.card.no_description") : props.navyk.description,
);

const dataObnovleniya = computed<string>(() =>
    dayjs.unix(props.navyk.updatedAt).format("DD.MM.YYYY HH:mm"),
);
</script>

<template>
    <GhBox padding="sm" class="navyk-card">
        <template #header>
            <div class="navyk-card__head">
                <span class="navyk-card__name">{{ navyk.name }}</span>

                <GhLabel
                    :variant="navyk.isGlobal ? 'accent' : 'neutral'"
                    :label="oblast"
                />

                <GhLabel
                    v-if="navyk.archived"
                    variant="attention"
                    :label="$t('skill.card.archived')"
                />
            </div>

            <div v-if="$slots.actions" class="navyk-card__actions">
                <slot name="actions" />
            </div>
        </template>

        <p class="navyk-card__description" :class="{ 'navyk-card__description--muted': netOpisaniya }">
            {{ opisanie }}
        </p>

        <p class="navyk-card__meta">
            <span>{{ $t('skill.card.version', { version: navyk.version }) }}</span>
            <span aria-hidden="true">·</span>
            <span>{{ $t('skill.card.updated', { date: dataObnovleniya }) }}</span>
        </p>
    </GhBox>
</template>

<style scoped>
.navyk-card {
    color: var(--fgColor-default);
}

.navyk-card__head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1 1 auto;
}

.navyk-card__name {
    overflow: hidden;
    color: var(--fgColor-default);
    font-size: var(--fontSize-body);
    font-weight: var(--fontWeight-semibold);
    line-height: var(--lineHeight-tight);
    text-overflow: ellipsis;
    white-space: nowrap;
}

.navyk-card__actions {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 4px;
    margin-left: auto;
}

.navyk-card__description {
    margin: 0;
    color: var(--fgColor-default);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

.navyk-card__description--muted {
    color: var(--fgColor-muted);
    font-style: italic;
}

.navyk-card__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin: 8px 0 0;
    color: var(--fgColor-muted);
    font-size: var(--fontSize-caption);
}
</style>
