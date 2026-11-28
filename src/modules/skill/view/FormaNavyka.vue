<script setup lang="ts">
import { computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import {
    GhBanner,
    GhButton,
    GhDialog,
    GhFormField,
    GhInput,
    GhSelect,
} from "@/components/ui";
import type { GhSelectOption } from "@/components/ui";
import { useStorFormiNavyka } from "@/modules/skill/store/StorFormiNavyka";
import {
    klyuchOshibkiNavyka,
    type Navyk,
    type OblastNavyka,
} from "@/modules/skill/model/Navyk";

const props = withDefaults(
    defineProps<{
        modelValue: boolean;
        /** Существующий навык для режима редактирования. */
        navyk?: Navyk | null;
        /** Предвыбранная область для создания. */
        scope?: OblastNavyka | null;
        /** Предвыбранный проект для создания (например, со страницы проекта). */
        projectId?: string | null;
        /** Запретить смену области (проектная страница). */
        lockScope?: boolean;
        /** Запретить смену проектов (проектная страница). */
        lockProject?: boolean;
        /** Разрешить создание глобального навыка. */
        allowGlobal?: boolean;
    }>(),
    {
        navyk: null,
        scope: null,
        projectId: null,
        lockScope: false,
        lockProject: false,
        allowGlobal: true,
    },
);

const emit = defineEmits<{
    (e: "update:modelValue", value: boolean): void;
    (e: "saved", value: { id: string; slug: string }): void;
}>();

const { t, te } = useI18n();
const store = useStorFormiNavyka();
const { form, oshibki, loaderSohraneniya, oshibka, proekti, loaderProektov, oshibkaProektov } =
    storeToRefs(store);

const rezhimRedaktirovaniya = computed<boolean>(() => store.rezhim === "edit");

const zagolovok = computed<string>(() =>
    rezhimRedaktirovaniya.value
        ? t("skill.form.edit_title")
        : t("skill.form.create_title"),
);

const scopeZablokirovan = computed<boolean>(() =>
    props.lockScope || rezhimRedaktirovaniya.value || !props.allowGlobal,
);

/**
 * Редактирование не меняет привязки: `/skill/izmenit` принимает только
 * name/description/content, а привязка управляется в карточке навыка.
 */
const vyborProektaZablokirovan = computed<boolean>(() =>
    props.lockProject
    || rezhimRedaktirovaniya.value
    || (form.value.projectIds.length !== 0 && props.projectId !== null),
);

const opciiOblasti = computed<GhSelectOption[]>(() => {
    const opcii: GhSelectOption[] = [];

    if (props.allowGlobal) {
        opcii.push({ value: "global", label: t("skill.scopes.global") });
    }

    opcii.push({ value: "project", label: t("skill.scopes.project") });

    return opcii;
});

const opciiProektov = computed<GhSelectOption[]>(() =>
    proekti.value.map((proekt) => ({
        value: proekt.id,
        label: proekt.name,
        description: proekt.code,
    })),
);

/** Локализует код ошибки бэкенда, если для него есть ключ. */
function oshibkaPoKlyuchu(code: string): string {
    const klyuch = klyuchOshibkiNavyka(code);

    return klyuch !== null && te(klyuch) ? t(klyuch) : code;
}

function podgotovit(): void {
    if (props.navyk !== null) {
        store.otkritRedaktirovanie(props.navyk);
    } else {
        const scope: OblastNavyka = props.scope ?? (props.projectId !== null ? "project" : "global");
        store.otkritSozdanie(scope, props.projectId !== null ? [props.projectId] : []);
    }

    if (form.value.scope === "project") {
        void store.zagruzitProekty();
    }
}

watch(
    () => props.modelValue,
    (otkryt) => {
        if (otkryt) {
            podgotovit();
        }
    },
    { immediate: true },
);

function izmenitOblast(znachenie: string | number | null): void {
    if (znachenie !== "global" && znachenie !== "project") {
        return;
    }

    store.ustanovitOblast(znachenie);

    if (znachenie === "project") {
        void store.zagruzitProekty();
    }
}

function izmenitProekty(znachenie: Array<string | number>): void {
    store.ustanovitProekty(znachenie.map(String));
}

async function otpravit(): Promise<void> {
    const rezultat = await store.sohranit();

    if (rezultat === null) {
        return;
    }

    emit("saved", rezultat);
    emit("update:modelValue", false);
}
</script>

<template>
    <GhDialog
        :model-value="modelValue"
        :title="zagolovok"
        width="640px"
        :persistent="loaderSohraneniya"
        :close-label="t('common.buttons.close')"
        @update:model-value="emit('update:modelValue', $event)"
    >
        <form class="forma-navyka" novalidate @submit.prevent="otpravit">
            <GhBanner v-if="oshibka" variant="danger" :title="t('common.states.error')">
                {{ oshibkaPoKlyuchu(oshibka) }}
            </GhBanner>

            <GhFormField
                :label="t('skill.fields.name')"
                :error="oshibki.name ? t(oshibki.name) : ''"
                required
            >
                <GhInput
                    id="navyk-name"
                    :model-value="form.name"
                    :maxlength="128"
                    autocomplete="off"
                    @update:model-value="store.ustanovitImya($event === null ? '' : String($event))"
                />
            </GhFormField>

            <GhFormField
                :label="t('skill.fields.slug')"
                :caption="rezhimRedaktirovaniya ? t('skill.hints.slug_locked') : t('skill.hints.slug')"
                :error="oshibki.slug ? t(oshibki.slug) : ''"
                :required="!rezhimRedaktirovaniya"
            >
                <GhInput
                    id="navyk-slug"
                    :model-value="form.slug"
                    :readonly="rezhimRedaktirovaniya"
                    :disabled="rezhimRedaktirovaniya"
                    :maxlength="64"
                    autocomplete="off"
                    class="forma-navyka__slug"
                    @update:model-value="store.ustanovitSlug($event === null ? '' : String($event))"
                />
            </GhFormField>

            <GhFormField
                :label="t('skill.fields.description')"
                :caption="t('skill.hints.description')"
                :error="oshibki.description ? t(oshibki.description) : ''"
            >
                <GhInput
                    id="navyk-description"
                    :model-value="form.description"
                    type="textarea"
                    :rows="3"
                    :maxlength="512"
                    @update:model-value="store.ustanovitOpisanie($event === null ? '' : String($event))"
                />
            </GhFormField>

            <GhFormField
                :label="t('skill.fields.content')"
                :caption="t('skill.hints.content')"
                :error="oshibki.content ? t(oshibki.content) : ''"
            >
                <GhInput
                    id="navyk-content"
                    :model-value="form.content"
                    type="textarea"
                    :rows="12"
                    class="forma-navyka__content"
                    @update:model-value="store.ustanovitSoderzhimoe($event === null ? '' : String($event))"
                />
            </GhFormField>

            <GhFormField
                :label="t('skill.fields.scope')"
                :caption="rezhimRedaktirovaniya ? t('skill.hints.scope_locked') : ''"
            >
                <GhSelect
                    :model-value="form.scope"
                    :options="opciiOblasti"
                    :disabled="scopeZablokirovan"
                    :aria-label="t('skill.fields.scope')"
                    @update:model-value="izmenitOblast"
                />
            </GhFormField>

            <GhFormField
                v-if="form.scope === 'project'"
                :label="t('skill.fields.projects')"
                :caption="rezhimRedaktirovaniya ? t('skill.hints.projects_locked') : t('skill.hints.projects')"
                :error="oshibki.projectIds ? t(oshibki.projectIds) : ''"
                :required="!lockProject"
            >
                <GhBanner v-if="oshibkaProektov" variant="danger" :title="t('common.states.error')">
                    {{ oshibkaPoKlyuchu(oshibkaProektov) }}
                </GhBanner>

                <GhSelect
                    v-else
                    :model-value="form.projectIds"
                    :options="opciiProektov"
                    :loading="loaderProektov"
                    multiple
                    use-chips
                    use-input
                    :disabled="vyborProektaZablokirovan"
                    :aria-label="t('skill.fields.projects')"
                    :placeholder="t('skill.fields.projects_placeholder')"
                    @update:model-value="izmenitProekty"
                />
            </GhFormField>
        </form>

        <template #footer>
            <GhButton
                variant="default"
                :label="t('common.buttons.cancel')"
                :disabled="loaderSohraneniya"
                @click="emit('update:modelValue', false)"
            />
            <GhButton
                variant="primary"
                icon="check"
                :label="rezhimRedaktirovaniya ? t('skill.actions.save') : t('skill.actions.create')"
                :loading="loaderSohraneniya"
                @click="otpravit"
            />
        </template>
    </GhDialog>
</template>

<style scoped>
.forma-navyka {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.forma-navyka__slug :deep(input),
.forma-navyka__content :deep(textarea) {
    font-family: var(--fontStack-monospace);
}

.forma-navyka__content :deep(textarea) {
    white-space: pre;
}
</style>
