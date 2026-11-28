<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import dayjs from "dayjs";
import {
    GhBanner,
    GhButton,
    GhDialog,
    GhEmptyState,
    GhFormField,
    GhLabel,
    GhSelect,
    GhSkeleton,
} from "@/components/ui";
import type { GhSelectOption } from "@/components/ui";
import SkillService from "@/modules/skill/services/SkillService";
import ProektiService from "@/modules/unit/services/ProektiService";
import type { Proekt } from "@/modules/unit/store/SpisokProektov/model/Proekt";
import {
    klyuchOshibkiNavyka,
    type Navyk,
    type VersiyaNavyka,
} from "@/modules/skill/model/Navyk";

const props = withDefaults(
    defineProps<{
        modelValue: boolean;
        navykId?: string | null;
        /** Текущий проект (для открепления и бейджа области). */
        projectId?: string | null;
        projectName?: string | null;
    }>(),
    {
        navykId: null,
        projectId: null,
        projectName: null,
    },
);

const emit = defineEmits<{
    (e: "update:modelValue", value: boolean): void;
    (e: "edit", navyk: Navyk): void;
    /** Навык изменён (архив/привязка/открепление) — список стоит перечитать. */
    (e: "changed"): void;
}>();

const { t, te } = useI18n();

const navyk = ref<Navyk | null>(null);
const versii = ref<VersiyaNavyka[]>([]);
const loader = ref<boolean>(false);
const oshibka = ref<string | null>(null);
const loaderVersii = ref<boolean>(false);
const oshibkaVersii = ref<string | null>(null);

const podtverzhdenieArhiva = ref<boolean>(false);
const rezhimPrikrepleniya = ref<boolean>(false);
const vybrannieProekty = ref<string[]>([]);
const proekti = ref<Proekt[]>([]);
const loaderProektov = ref<boolean>(false);
const oshibkaProektov = ref<string | null>(null);

const loaderDejstviya = ref<boolean>(false);
const oshibkaDejstviya = ref<string | null>(null);

const zagruzheno = computed<boolean>(() => navyk.value !== null);
const mozhnoRedaktirovat = computed<boolean>(() =>
    navyk.value !== null && navyk.value.canEdit && !navyk.value.archived,
);
const mozhnoArhivirovat = computed<boolean>(() => mozhnoRedaktirovat.value);
const estProektnayaPrivyazka = computed<boolean>(() =>
    navyk.value !== null
    && !navyk.value.isGlobal
    && props.projectId !== null
    && navyk.value.projectIds.includes(props.projectId),
);
const mozhnoPrikreplyat = computed<boolean>(() =>
    mozhnoRedaktirovat.value && navyk.value !== null && !navyk.value.isGlobal,
);

const oblast = computed<string>(() => {
    if (navyk.value === null) {
        return "";
    }

    if (navyk.value.isGlobal) {
        return t("skill.scopes.global");
    }

    return props.projectName ?? t("skill.scopes.project");
});

const opciiProektov = computed<GhSelectOption[]>(() =>
    proekti.value
        .filter((proekt) => !(navyk.value?.projectIds ?? []).includes(proekt.id))
        .map((proekt) => ({
            value: proekt.id,
            label: proekt.name,
            description: proekt.code,
        })),
);

function oshibkaPoKlyuchu(code: string): string {
    const klyuch = klyuchOshibkiNavyka(code);

    return klyuch !== null && te(klyuch) ? t(klyuch) : code;
}

function soobshchenieOshibki(response: {
    status: "fail" | "error";
    data?: { message: string };
    message?: string;
}): string {
    return response.status === "fail"
        ? (response.data?.message ?? "")
        : (response.message ?? "");
}

function data(sekundi: number): string {
    return dayjs.unix(sekundi).format("DD.MM.YYYY HH:mm");
}

function zakryt(): void {
    emit("update:modelValue", false);
}

async function zagruzit(): Promise<void> {
    if (props.navykId === null || props.navykId === "") {
        return;
    }

    loader.value = true;
    oshibka.value = null;
    navyk.value = null;
    versii.value = [];
    oshibkaVersii.value = null;
    loaderVersii.value = true;

    const [otvet, otvetVersii] = await Promise.all([
        SkillService.read(props.navykId),
        SkillService.versii({ id: props.navykId }),
    ]);

    loader.value = false;
    loaderVersii.value = false;

    if (otvet.status === "success") {
        navyk.value = otvet.data;
    } else {
        oshibka.value = soobshchenieOshibki(otvet);
    }

    if (otvetVersii.status === "success") {
        versii.value = otvetVersii.data ?? [];
    } else {
        oshibkaVersii.value = soobshchenieOshibki(otvetVersii);
    }
}

function redaktirovat(): void {
    if (navyk.value === null) {
        return;
    }

    emit("edit", navyk.value);
}

function otkrytPodtverzhdenieArhiva(): void {
    oshibkaDejstviya.value = null;
    podtverzhdenieArhiva.value = true;
}

async function podtverditArhivaciyu(): Promise<void> {
    if (navyk.value === null || loaderDejstviya.value) {
        return;
    }

    loaderDejstviya.value = true;
    const response = await SkillService.udalit({ id: navyk.value.id });
    loaderDejstviya.value = false;

    if (response.status !== "success") {
        podtverzhdenieArhiva.value = false;
        oshibkaDejstviya.value = soobshchenieOshibki(response);
        return;
    }

    podtverzhdenieArhiva.value = false;
    emit("changed");
    zakryt();
}

async function zagruzitProekty(): Promise<void> {
    if (proekti.value.length > 0 || loaderProektov.value) {
        return;
    }

    loaderProektov.value = true;
    oshibkaProektov.value = null;

    const response = await ProektiService.poluchitMoiProekti({ limit: 100 });

    loaderProektov.value = false;

    if (response.status === "success") {
        proekti.value = [...(response.data ?? [])].sort((a: Proekt, b: Proekt) =>
            a.name.localeCompare(b.name, "ru", { sensitivity: "base" }),
        );
        return;
    }

    oshibkaProektov.value = soobshchenieOshibki(response);
}

function otkrytPrikreplenie(): void {
    vybrannieProekty.value = [];
    oshibkaDejstviya.value = null;
    rezhimPrikrepleniya.value = true;
    void zagruzitProekty();
}

async function podtverditPrikreplenie(): Promise<void> {
    if (
        navyk.value === null
        || loaderDejstviya.value
        || vybrannieProekty.value.length === 0
    ) {
        return;
    }

    loaderDejstviya.value = true;

    const response = await SkillService.prikrepit({
        id: navyk.value.id,
        projectIds: [...vybrannieProekty.value],
    });

    loaderDejstviya.value = false;

    if (response.status !== "success") {
        oshibkaDejstviya.value = soobshchenieOshibki(response);
        return;
    }

    navyk.value.projectIds = response.data.projectIds ?? [];
    rezhimPrikrepleniya.value = false;
    vybrannieProekty.value = [];
    emit("changed");
}

async function otkrepit(): Promise<void> {
    if (navyk.value === null || props.projectId === null || loaderDejstviya.value) {
        return;
    }

    loaderDejstviya.value = true;

    const response = await SkillService.otkrepit({
        id: navyk.value.id,
        projectId: props.projectId,
    });

    loaderDejstviya.value = false;

    if (response.status !== "success") {
        oshibkaDejstviya.value = soobshchenieOshibki(response);
        return;
    }

    navyk.value.projectIds = response.data.projectIds ?? [];
    emit("changed");
}

function izmenitVyborProektov(znachenie: Array<string | number>): void {
    vybrannieProekty.value = znachenie.map(String);
}

function svernutPrikreplenie(): void {
    rezhimPrikrepleniya.value = false;
    vybrannieProekty.value = [];
}

watch(
    () => [props.modelValue, props.navykId] as const,
    ([otkryt]) => {
        if (otkryt) {
            void zagruzit();
        }
    },
    { immediate: true },
);
</script>

<template>
    <GhDialog
        :model-value="modelValue"
        :title="navyk ? navyk.name : t('skill.detail.title')"
        width="760px"
        :close-label="t('common.buttons.close')"
        @update:model-value="emit('update:modelValue', $event)"
    >
        <GhBanner
            v-if="oshibka"
            variant="danger"
            :title="t('common.states.error')"
        >
            {{ oshibkaPoKlyuchu(oshibka) }}
            <template #actions>
                <GhButton
                    variant="default"
                    icon="sync"
                    :label="t('common.buttons.retry')"
                    @click="zagruzit"
                />
            </template>
        </GhBanner>

        <div v-else-if="loader" class="okno-navyka__skeleton" aria-busy="true">
            <GhSkeleton variant="text" width="40%" height="20" />
            <GhSkeleton variant="rect" width="100%" height="72" />
            <GhSkeleton variant="rect" width="100%" height="140" />
        </div>

        <template v-else-if="zagruzheno && navyk">
            <GhBanner
                v-if="oshibkaDejstviya"
                variant="danger"
                :title="t('common.states.error')"
                class="okno-navyka__banner"
            >
                {{ oshibkaPoKlyuchu(oshibkaDejstviya) }}
            </GhBanner>

            <div class="okno-navyka__meta">
                <GhLabel
                    :variant="navyk.isGlobal ? 'accent' : 'neutral'"
                    :label="oblast"
                />
                <GhLabel
                    v-if="navyk.archived"
                    variant="attention"
                    :label="t('skill.card.archived')"
                />
                <span class="okno-navyka__meta-item">
                    {{ t('skill.card.version', { version: navyk.version }) }}
                </span>
                <span class="okno-navyka__meta-item">
                    {{ t('skill.card.updated', { date: data(navyk.updatedAt) }) }}
                </span>
            </div>

            <p v-if="!mozhnoRedaktirovat" class="okno-navyka__readonly">
                {{ t('skill.detail.read_only') }}
            </p>

            <section class="okno-navyka__section">
                <h3 class="okno-navyka__section-title">{{ t('skill.detail.what_is_it') }}</h3>
                <p v-if="navyk.description" class="okno-navyka__description">
                    {{ navyk.description }}
                </p>
                <p v-else class="okno-navyka__empty">{{ t('skill.card.no_description') }}</p>
            </section>

            <section class="okno-navyka__section">
                <h3 class="okno-navyka__section-title">{{ t('skill.detail.how_to_use') }}</h3>
                <pre v-if="navyk.content" class="okno-navyka__content">{{ navyk.content }}</pre>
                <p v-else class="okno-navyka__empty">{{ t('skill.detail.content_empty') }}</p>
            </section>

            <section v-if="rezhimPrikrepleniya" class="okno-navyka__section">
                <h3 class="okno-navyka__section-title">{{ t('skill.attach.title') }}</h3>

                <GhBanner
                    v-if="oshibkaProektov"
                    variant="danger"
                    :title="t('common.states.error')"
                >
                    {{ oshibkaPoKlyuchu(oshibkaProektov) }}
                </GhBanner>

                <GhFormField
                    v-else
                    :label="t('skill.attach.select_label')"
                    :caption="t('skill.attach.hint')"
                >
                    <GhSelect
                        :model-value="vybrannieProekty"
                        :options="opciiProektov"
                        :loading="loaderProektov"
                        :placeholder="t('skill.fields.projects_placeholder')"
                        multiple
                        use-chips
                        use-input
                        :aria-label="t('skill.attach.select_label')"
                        @update:model-value="izmenitVyborProektov"
                    />
                </GhFormField>

                <div class="okno-navyka__inline-actions">
                    <GhButton
                        variant="default"
                        :label="t('common.buttons.cancel')"
                        :disabled="loaderDejstviya"
                        @click="svernutPrikreplenie"
                    />
                    <GhButton
                        variant="primary"
                        icon="link"
                        :label="t('skill.attach.confirm')"
                        :loading="loaderDejstviya"
                        :disabled="vybrannieProekty.length === 0"
                        @click="podtverditPrikreplenie"
                    />
                </div>
            </section>

            <section class="okno-navyka__section">
                <h3 class="okno-navyka__section-title">{{ t('skill.detail.versions') }}</h3>

                <GhBanner
                    v-if="oshibkaVersii"
                    variant="danger"
                    :title="t('common.states.error')"
                >
                    {{ oshibkaPoKlyuchu(oshibkaVersii) }}
                    <template #actions>
                        <GhButton
                            variant="default"
                            icon="sync"
                            :label="t('common.buttons.retry')"
                            @click="zagruzit"
                        />
                    </template>
                </GhBanner>

                <div v-else-if="loaderVersii" class="okno-navyka__skeleton" aria-busy="true">
                    <GhSkeleton variant="text" width="60%" height="20" />
                    <GhSkeleton variant="text" width="45%" height="20" />
                </div>

                <p v-else-if="versii.length === 0" class="okno-navyka__empty">
                    {{ t('skill.detail.no_versions') }}
                </p>

                <ul v-else class="okno-navyka__versions">
                    <li v-for="versiya in versii" :key="versiya.version">
                        <details class="okno-navyka__version">
                            <summary class="okno-navyka__version-summary">
                                <span class="okno-navyka__version-title">
                                    {{ t('skill.detail.version', { version: versiya.version }) }}
                                </span>
                                <span class="okno-navyka__version-meta">
                                    {{ t('skill.detail.created_by', { author: versiya.createdBy }) }}
                                    · {{ data(versiya.createdAt) }}
                                </span>
                            </summary>

                            <p v-if="versiya.description" class="okno-navyka__description">
                                {{ versiya.description }}
                            </p>

                            <pre class="okno-navyka__content">{{ versiya.content }}</pre>
                        </details>
                    </li>
                </ul>
            </section>
        </template>

        <GhEmptyState
            v-else
            icon="book"
            :title="t('skill.detail.not_found')"
        />

        <template #footer>
            <div class="okno-navyka__footer">
                <div v-if="mozhnoRedaktirovat" class="okno-navyka__footer-actions">
                    <GhButton
                        variant="default"
                        icon="pencil"
                        :label="t('common.buttons.edit')"
                        @click="redaktirovat"
                    />
                    <GhButton
                        v-if="mozhnoPrikreplyat"
                        variant="default"
                        icon="link"
                        :label="t('skill.actions.attach')"
                        @click="otkrytPrikreplenie"
                    />
                    <GhButton
                        v-if="estProektnayaPrivyazka"
                        variant="default"
                        icon="unlink"
                        :label="t('skill.actions.detach')"
                        :loading="loaderDejstviya"
                        @click="otkrepit"
                    />
                    <GhButton
                        v-if="mozhnoArhivirovat"
                        variant="danger"
                        icon="archive"
                        :label="t('skill.actions.archive')"
                        @click="otkrytPodtverzhdenieArhiva"
                    />
                </div>

                <GhButton
                    variant="default"
                    :label="t('common.buttons.close')"
                    @click="zakryt"
                />
            </div>
        </template>
    </GhDialog>

    <GhDialog
        v-model="podtverzhdenieArhiva"
        :title="t('skill.archive.title')"
        width="440px"
        :close-label="t('common.buttons.close')"
    >
        <p class="okno-navyka__confirm-text">
            {{ t('skill.archive.message', { name: navyk?.name ?? '' }) }}
        </p>

        <template #footer>
            <GhButton
                variant="default"
                :label="t('common.buttons.cancel')"
                @click="podtverzhdenieArhiva = false"
            />
            <GhButton
                variant="danger"
                icon="archive"
                :label="t('skill.archive.confirm')"
                :loading="loaderDejstviya"
                @click="podtverditArhivaciyu"
            />
        </template>
    </GhDialog>
</template>

<style scoped>
.okno-navyka__skeleton {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.okno-navyka__banner {
    margin-bottom: 16px;
}

.okno-navyka__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    color: var(--fgColor-muted);
    font-size: var(--fontSize-caption);
}

.okno-navyka__readonly {
    margin: 0 0 16px;
    padding: 8px 12px;
    border: 1px solid var(--borderColor-muted);
    border-radius: var(--borderRadius-medium);
    background-color: var(--bgColor-muted);
    color: var(--fgColor-muted);
    font-size: var(--fontSize-caption);
}

.okno-navyka__section + .okno-navyka__section {
    margin-top: 20px;
}

.okno-navyka__section-title {
    margin: 0 0 8px;
    color: var(--fgColor-default);
    font-size: var(--fontSize-body);
    font-weight: var(--fontWeight-semibold);
}

.okno-navyka__description {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

.okno-navyka__content {
    margin: 0;
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

.okno-navyka__empty {
    margin: 0;
    color: var(--fgColor-muted);
    font-style: italic;
}

.okno-navyka__inline-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 12px;
}

.okno-navyka__versions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.okno-navyka__version {
    border: 1px solid var(--borderColor-default);
    border-radius: var(--borderRadius-medium);
}

.okno-navyka__version-summary {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px;
    padding: 8px 12px;
    cursor: pointer;
}

.okno-navyka__version-title {
    font-weight: var(--fontWeight-semibold);
}

.okno-navyka__version-meta {
    color: var(--fgColor-muted);
    font-size: var(--fontSize-caption);
}

.okno-navyka__version > .okno-navyka__description,
.okno-navyka__version > .okno-navyka__content {
    margin: 0 12px 12px;
}

.okno-navyka__footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
}

.okno-navyka__footer-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.okno-navyka__confirm-text {
    margin: 0;
}
</style>
