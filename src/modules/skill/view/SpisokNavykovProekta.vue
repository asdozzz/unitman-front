<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import {
    GhBanner,
    GhBox,
    GhButton,
    GhCheckbox,
    GhDialog,
    GhEmptyState,
    GhInput,
    GhPageHeader,
    GhSkeleton,
} from "@/components/ui";
import ProektiService from "@/modules/unit/services/ProektiService";
import type { Proekt } from "@/modules/unit/store/SpisokProektov/model/Proekt";
import { useAuthStore } from "@/modules/account/store/auth";
import SkillService from "@/modules/skill/services/SkillService";
import { useStorSpiskaNavykov } from "@/modules/skill/store/StorSpiskaNavykov";
import { klyuchOshibkiNavyka, type Navyk, type NavykKratko } from "@/modules/skill/model/Navyk";
import NavykCard from "@/modules/skill/view/NavykCard.vue";
import FormaNavyka from "@/modules/skill/view/FormaNavyka.vue";
import OknoNavyka from "@/modules/skill/view/OknoNavyka.vue";

const { t, te } = useI18n();
const route = useRoute();
const authStore = useAuthStore();
const store = useStorSpiskaNavykov();

const {
    loaderSpiska,
    oshibkaZagruzki,
    oshibkaDejstviya,
    spisok,
    filtr,
    dejstvieId,
    dejstvie,
} = storeToRefs(store);

const projectId = computed<string>(() => String(route.params.id ?? ""));

const proekt = ref<Proekt | null>(null);
const loaderProekta = ref<boolean>(false);
const oshibkaProekta = ref<string | null>(null);

const formaOtkryta = ref<boolean>(false);
const redaktiruemyyNavyk = ref<Navyk | null>(null);
const oknoOtkryto = ref<boolean>(false);
const vibranyyId = ref<string | null>(null);
const arhivCeli = ref<NavykKratko | null>(null);
const arhivPodtverzhdenie = ref<boolean>(false);
const zagruzkaRedaktirovaniya = ref<string | null>(null);
const lokalnayaOshibka = ref<string | null>(null);

const imyaProekta = computed<string>(() => proekt.value?.name ?? projectId.value);

/** Проектный администратор видит действия; участник — только чтение. */
const mozhnoRedaktirovat = computed<boolean>(() => {
    const userId = authStore.userId;

    if (userId === null || proekt.value === null) {
        return false;
    }

    return proekt.value.users.some(
        (polzovatel) => polzovatel.userId === userId && polzovatel.role === "ADMIN",
    );
});

const itogovayaOshibka = computed<string | null>(
    () => lokalnayaOshibka.value ?? oshibkaDejstviya.value,
);

const otfiltrovanniy = computed<NavykKratko[]>(() => store.otfiltrovanniy);
const pustPoisk = computed<boolean>(() => store.pustPoisk);

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

async function zagruzitProekt(): Promise<void> {
    if (projectId.value === "") {
        return;
    }

    loaderProekta.value = true;
    oshibkaProekta.value = null;

    const response = await ProektiService.read(projectId.value);

    loaderProekta.value = false;

    if (response.status === "success") {
        proekt.value = response.data;
        return;
    }

    proekt.value = null;
    oshibkaProekta.value = soobshchenieOshibki(response);
}

function povtoritZagruzku(): void {
    lokalnayaOshibka.value = null;
    store.sbrOsitOshibkuDejstviya();
    void zagruzitProekt();
    void store.zagruzit({ scope: "project", projectId: projectId.value });
}

function izmenitPoisk(znachenie: string | number | null): void {
    store.primenitPoisk(znachenie === null ? "" : String(znachenie));
}

function pereklyuchitArhivnie(znachenie: boolean): void {
    void store.pereklyuchitArhivnie(znachenie);
}

function otkrytSozdanie(): void {
    redaktiruemyyNavyk.value = null;
    formaOtkryta.value = true;
}

function otkrytOkno(id: string): void {
    vibranyyId.value = id;
    oknoOtkryto.value = true;
}

async function redaktirovat(kratko: NavykKratko): Promise<void> {
    lokalnayaOshibka.value = null;
    zagruzkaRedaktirovaniya.value = kratko.id;

    const response = await SkillService.read(kratko.id);

    zagruzkaRedaktirovaniya.value = null;

    if (response.status !== "success") {
        lokalnayaOshibka.value = soobshchenieOshibki(response);
        return;
    }

    redaktiruemyyNavyk.value = response.data;
    formaOtkryta.value = true;
}

function redaktirovatIzOkna(navyk: Navyk): void {
    oknoOtkryto.value = false;
    redaktiruemyyNavyk.value = navyk;
    formaOtkryta.value = true;
}

function otkrytPodtverzhdenieArhiva(navyk: NavykKratko): void {
    lokalnayaOshibka.value = null;
    arhivCeli.value = navyk;
    arhivPodtverzhdenie.value = true;
}

async function podtverditArhivaciyu(): Promise<void> {
    if (arhivCeli.value === null) {
        return;
    }

    const uspeh = await store.arhivirovat(arhivCeli.value.id);

    arhivPodtverzhdenie.value = false;

    if (uspeh) {
        arhivCeli.value = null;
    }
}

function posleSohraneniya(): void {
    void store.zagruzit();
}

function posleIzmeneniya(): void {
    void store.zagruzit();
}

async function zagruzitStranicu(): Promise<void> {
    await zagruzitProekt();
    await store.zagruzit({ scope: "project", projectId: projectId.value });
}

onMounted(zagruzitStranicu);

watch(projectId, () => {
    if (projectId.value !== "") {
        void zagruzitStranicu();
    }
});
</script>

<template>
    <div class="spisok-navykov-proekta">
        <GhPageHeader
            :title="t('skill.project.title')"
            :description="t('skill.project.description', { project: imyaProekta })"
            :counter="spisok.length"
        >
            <template #actions>
                <GhButton
                    v-if="mozhnoRedaktirovat"
                    variant="primary"
                    icon="plus"
                    :label="t('skill.actions.create')"
                    @click="otkrytSozdanie"
                />
            </template>
        </GhPageHeader>

        <GhBanner
            v-if="oshibkaProekta"
            variant="danger"
            :title="t('common.states.error')"
            class="spisok-navykov-proekta__banner"
        >
            {{ oshibkaPoKlyuchu(oshibkaProekta) }}
            <template #actions>
                <GhButton
                    variant="default"
                    icon="sync"
                    :label="t('common.buttons.retry')"
                    @click="povtoritZagruzku"
                />
            </template>
        </GhBanner>

        <GhBox v-if="!loaderProekta && !mozhnoRedaktirovat && proekt !== null" padding="sm" class="spisok-navykov-proekta__readonly">
            {{ t('skill.project.read_only_hint') }}
        </GhBox>

        <div class="spisok-navykov-proekta__toolbar">
            <GhInput
                :model-value="filtr.search"
                type="search"
                icon="search"
                :placeholder="t('skill.panel.search_placeholder')"
                :aria-label="t('skill.panel.search_placeholder')"
                class="spisok-navykov-proekta__search"
                @update:model-value="izmenitPoisk"
            />

            <GhCheckbox
                :model-value="filtr.includeArchived"
                :label="t('skill.filters.include_archived')"
                @update:model-value="pereklyuchitArhivnie"
            />
        </div>

        <GhBanner
            v-if="itogovayaOshibka"
            variant="danger"
            :title="t('common.states.error')"
        >
            {{ oshibkaPoKlyuchu(itogovayaOshibka) }}
            <template #actions>
                <GhButton
                    variant="default"
                    icon="sync"
                    :label="t('common.buttons.retry')"
                    @click="povtoritZagruzku"
                />
            </template>
        </GhBanner>

        <GhBanner
            v-if="oshibkaZagruzki"
            variant="danger"
            :title="t('common.states.error')"
        >
            {{ oshibkaPoKlyuchu(oshibkaZagruzki) }}
            <template #actions>
                <GhButton
                    variant="default"
                    icon="sync"
                    :label="t('common.buttons.retry')"
                    @click="povtoritZagruzku"
                />
            </template>
        </GhBanner>

        <div v-else-if="loaderSpiska" class="spisok-navykov-proekta__skeleton" aria-busy="true">
            <GhSkeleton v-for="n in 3" :key="`navyk-project-skeleton-${n}`" variant="rect" width="100%" height="92" />
        </div>

        <GhEmptyState
            v-else-if="spisok.length === 0"
            icon="book"
            :title="t('skill.states.empty')"
            :description="t('skill.states.empty_project_hint')"
        >
            <template #actions>
                <GhButton
                    v-if="mozhnoRedaktirovat"
                    variant="primary"
                    icon="plus"
                    :label="t('skill.actions.create')"
                    @click="otkrytSozdanie"
                />
            </template>
        </GhEmptyState>

        <GhEmptyState
            v-else-if="pustPoisk"
            icon="search"
            :title="t('common.no_results')"
        />

        <ul v-else class="spisok-navykov-proekta__list">
            <li v-for="navyk in otfiltrovanniy" :key="navyk.id">
                <NavykCard :navyk="navyk" :project-name="imyaProekta">
                    <template #actions>
                        <GhButton
                            variant="invisible"
                            size="sm"
                            icon="eye"
                            :aria-label="t('skill.actions.details')"
                            @click="otkrytOkno(navyk.id)"
                        />

                        <template v-if="mozhnoRedaktirovat">
                            <GhButton
                                variant="invisible"
                                size="sm"
                                icon="pencil"
                                :aria-label="t('common.buttons.edit')"
                                :loading="zagruzkaRedaktirovaniya === navyk.id"
                                :disabled="navyk.archived"
                                @click="redaktirovat(navyk)"
                            />
                            <GhButton
                                variant="invisible"
                                size="sm"
                                icon="archive"
                                :aria-label="t('skill.actions.archive')"
                                :loading="dejstvie === 'archive' && dejstvieId === navyk.id"
                                :disabled="navyk.archived"
                                @click="otkrytPodtverzhdenieArhiva(navyk)"
                            />
                        </template>
                    </template>
                </NavykCard>
            </li>
        </ul>

        <FormaNavyka
            v-model="formaOtkryta"
            :navyk="redaktiruemyyNavyk"
            scope="project"
            :project-id="projectId"
            lock-scope
            lock-project
            :allow-global="false"
            @saved="posleSohraneniya"
        />

        <OknoNavyka
            v-model="oknoOtkryto"
            :navyk-id="vibranyyId"
            :project-id="projectId"
            :project-name="imyaProekta"
            @edit="redaktirovatIzOkna"
            @changed="posleIzmeneniya"
        />

        <GhDialog
            v-model="arhivPodtverzhdenie"
            :title="t('skill.archive.title')"
            width="440px"
            :close-label="t('common.buttons.close')"
        >
            <p class="spisok-navykov-proekta__confirm-text">
                {{ t('skill.archive.message', { name: arhivCeli?.name ?? '' }) }}
            </p>

            <template #footer>
                <GhButton
                    variant="default"
                    :label="t('common.buttons.cancel')"
                    @click="arhivPodtverzhdenie = false"
                />
                <GhButton
                    variant="danger"
                    icon="archive"
                    :label="t('skill.archive.confirm')"
                    :loading="dejstvie === 'archive' && dejstvieId === arhivCeli?.id"
                    @click="podtverditArhivaciyu"
                />
            </template>
        </GhDialog>
    </div>
</template>

<style scoped>
.spisok-navykov-proekta {
    display: flex;
    flex-direction: column;
    gap: 16px;
    color: var(--fgColor-default);
}

.spisok-navykov-proekta__banner {
    margin: 0;
}

.spisok-navykov-proekta__readonly {
    color: var(--fgColor-muted);
    font-size: var(--fontSize-caption);
}

.spisok-navykov-proekta__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 16px;
}

.spisok-navykov-proekta__search {
    max-width: 360px;
}

.spisok-navykov-proekta__skeleton {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.spisok-navykov-proekta__list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.spisok-navykov-proekta__confirm-text {
    margin: 0;
}
</style>
