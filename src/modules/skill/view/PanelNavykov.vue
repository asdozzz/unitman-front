<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
    GhBanner,
    GhBox,
    GhButton,
    GhCounter,
    GhEmptyState,
    GhInput,
    GhLabel,
    GhSkeleton,
} from "@/components/ui";
import type { EffektivnyyNavyk } from "@/modules/skill/model/Navyk";

const props = withDefaults(
    defineProps<{
        /** Эффективные навыки (глобальные и проектные). */
        navyki: EffektivnyyNavyk[];
        loading?: boolean;
        error?: string | null;
        /** Имена проектов по id для бейджей проектных навыков. */
        projectNames?: Record<string, string>;
        /** Переопределение текста пустого состояния (чат/создание). */
        emptyTitle?: string;
        emptyHint?: string;
    }>(),
    {
        loading: false,
        error: null,
        projectNames: () => ({}),
        emptyTitle: "",
        emptyHint: "",
    },
);

const emit = defineEmits<{
    (e: "retry"): void;
}>();

const { t } = useI18n();

const poisk = ref<string>("");
const raskrytye = ref<Set<string>>(new Set());

function klyuch(navyk: EffektivnyyNavyk): string {
    return `${navyk.skillId}:${navyk.scope}:${navyk.projectId ?? "global"}`;
}

function raskryt(navyk: EffektivnyyNavyk): boolean {
    return raskrytye.value.has(klyuch(navyk));
}

function pereklyuchit(navyk: EffektivnyyNavyk): void {
    const sleduyushchie = new Set(raskrytye.value);

    if (sleduyushchie.has(klyuch(navyk))) {
        sleduyushchie.delete(klyuch(navyk));
    } else {
        sleduyushchie.add(klyuch(navyk));
    }

    raskrytye.value = sleduyushchie;
}

const otfiltrovannye = computed<EffektivnyyNavyk[]>(() => {
    const igla = poisk.value.trim().toLowerCase();

    if (igla === "") {
        return props.navyki;
    }

    return props.navyki.filter((navyk) =>
        navyk.name.toLowerCase().includes(igla)
        || navyk.slug.toLowerCase().includes(igla)
        || navyk.description.toLowerCase().includes(igla),
    );
});

const globalnie = computed<EffektivnyyNavyk[]>(() =>
    otfiltrovannye.value.filter((navyk) => navyk.scope === "global"),
);

const proektnie = computed<EffektivnyyNavyk[]>(() =>
    otfiltrovannye.value.filter((navyk) => navyk.scope === "project"),
);

const pust = computed<boolean>(() =>
    !props.loading && props.error === null && props.navyki.length === 0,
);

const tekstPustogo = computed<string>(() =>
    props.emptyTitle !== "" ? props.emptyTitle : t("skill.panel.empty"),
);

const tekstPustogoPodskazki = computed<string>(() =>
    props.emptyHint !== "" ? props.emptyHint : t("skill.panel.empty_hint"),
);

const netRezultatov = computed<boolean>(() =>
    !props.loading
    && props.error === null
    && props.navyki.length > 0
    && otfiltrovannye.value.length === 0,
);

function oblast(navyk: EffektivnyyNavyk): string {
    if (navyk.scope === "global") {
        return t("skill.scopes.global");
    }

    if (navyk.projectId !== null && props.projectNames[navyk.projectId] !== undefined) {
        return props.projectNames[navyk.projectId];
    }

    return t("skill.scopes.project");
}
</script>

<template>
    <div class="panel-navykov">
        <GhInput
            :model-value="poisk"
            type="search"
            icon="search"
            :placeholder="t('skill.panel.search_placeholder')"
            :aria-label="t('skill.panel.search_placeholder')"
            class="panel-navykov__search"
            @update:model-value="poisk = $event === null ? '' : String($event)"
        />

        <GhBanner
            v-if="error"
            variant="danger"
            :title="t('common.states.error')"
        >
            {{ error }}
            <template #actions>
                <GhButton
                    variant="default"
                    icon="sync"
                    :label="t('common.buttons.retry')"
                    @click="emit('retry')"
                />
            </template>
        </GhBanner>

        <div v-else-if="loading" class="panel-navykov__skeleton" aria-busy="true">
            <GhSkeleton variant="text" width="35%" height="18" />
            <GhSkeleton variant="rect" width="100%" height="60" />
            <GhSkeleton variant="rect" width="100%" height="60" />
        </div>

        <GhEmptyState
            v-else-if="pust"
            icon="book"
            :title="tekstPustogo"
            :description="tekstPustogoPodskazki"
        />

        <p v-else-if="netRezultatov" class="panel-navykov__no-results">
            {{ t('common.no_results') }}
        </p>

        <template v-else>
            <GhBox v-if="globalnie.length > 0" padding="none" class="panel-navykov__group">
                <template #header>
                    <span>{{ t('skill.panel.global_group') }}</span>
                    <GhCounter :value="globalnie.length" />
                </template>

                <ul class="panel-navykov__list">
                    <li v-for="navyk in globalnie" :key="klyuch(navyk)" class="panel-navykov__item">
                        <div class="panel-navykov__item-head">
                            <span class="panel-navykov__item-name">{{ navyk.name }}</span>
                            <GhLabel variant="accent" :label="oblast(navyk)" />
                            <span class="panel-navykov__item-version">
                                {{ t('skill.card.version', { version: navyk.version }) }}
                            </span>

                            <GhButton
                                variant="invisible"
                                size="sm"
                                :icon="raskryt(navyk) ? 'chevron-up' : 'chevron-down'"
                                :aria-label="raskryt(navyk) ? t('skill.panel.hide_content') : t('skill.panel.show_content')"
                                :aria-expanded="raskryt(navyk)"
                                @click="pereklyuchit(navyk)"
                            />
                        </div>

                        <p v-if="navyk.description" class="panel-navykov__item-description">
                            {{ navyk.description }}
                        </p>

                        <pre v-if="raskryt(navyk)" class="panel-navykov__item-content">{{ navyk.content }}</pre>
                    </li>
                </ul>
            </GhBox>

            <GhBox v-if="proektnie.length > 0" padding="none" class="panel-navykov__group">
                <template #header>
                    <span>{{ t('skill.panel.project_group') }}</span>
                    <GhCounter :value="proektnie.length" />
                </template>

                <ul class="panel-navykov__list">
                    <li v-for="navyk in proektnie" :key="klyuch(navyk)" class="panel-navykov__item">
                        <div class="panel-navykov__item-head">
                            <span class="panel-navykov__item-name">{{ navyk.name }}</span>
                            <GhLabel variant="neutral" :label="oblast(navyk)" />
                            <span class="panel-navykov__item-version">
                                {{ t('skill.card.version', { version: navyk.version }) }}
                            </span>

                            <GhButton
                                variant="invisible"
                                size="sm"
                                :icon="raskryt(navyk) ? 'chevron-up' : 'chevron-down'"
                                :aria-label="raskryt(navyk) ? t('skill.panel.hide_content') : t('skill.panel.show_content')"
                                :aria-expanded="raskryt(navyk)"
                                @click="pereklyuchit(navyk)"
                            />
                        </div>

                        <p v-if="navyk.description" class="panel-navykov__item-description">
                            {{ navyk.description }}
                        </p>

                        <pre v-if="raskryt(navyk)" class="panel-navykov__item-content">{{ navyk.content }}</pre>
                    </li>
                </ul>
            </GhBox>
        </template>
    </div>
</template>

<style scoped>
.panel-navykov {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.panel-navykov__skeleton {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.panel-navykov__no-results {
    margin: 0;
    color: var(--fgColor-muted);
    text-align: center;
}

.panel-navykov__group {
    color: var(--fgColor-default);
}

.panel-navykov__list {
    margin: 0;
    padding: 0;
    list-style: none;
}

.panel-navykov__item {
    padding: 12px 16px;
}

.panel-navykov__item + .panel-navykov__item {
    border-top: 1px solid var(--borderColor-muted);
}

.panel-navykov__item-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
}

.panel-navykov__item-name {
    font-weight: var(--fontWeight-semibold);
}

.panel-navykov__item-version {
    color: var(--fgColor-muted);
    font-size: var(--fontSize-caption);
}

.panel-navykov__item-head :deep(.gh-button) {
    margin-left: auto;
}

.panel-navykov__item-description {
    margin: 4px 0 0;
    color: var(--fgColor-muted);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

.panel-navykov__item-content {
    margin: 8px 0 0;
    padding: 12px;
    overflow-x: auto;
    border: 1px solid var(--borderColor-default);
    border-radius: var(--borderRadius-medium);
    background-color: var(--bgColor-inset);
    color: var(--fgColor-default);
    font-family: var(--fontStack-monospace);
    font-size: var(--fontSize-caption);
    line-height: var(--lineHeight-normal);
    white-space: pre;
}
</style>
