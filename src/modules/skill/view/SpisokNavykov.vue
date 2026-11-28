<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import {
    GhBanner,
    GhButton,
    GhCheckbox,
    GhDialog,
    GhEmptyState,
    GhInput,
    GhPageHeader,
    GhSkeleton,
} from "@/components/ui";
import SkillService from "@/modules/skill/services/SkillService";
import { useStorSpiskaNavykov } from "@/modules/skill/store/StorSpiskaNavykov";
import { klyuchOshibkiNavyka, type Navyk, type NavykKratko } from "@/modules/skill/model/Navyk";
import NavykCard from "@/modules/skill/view/NavykCard.vue";
import FormaNavyka from "@/modules/skill/view/FormaNavyka.vue";
import OknoNavyka from "@/modules/skill/view/OknoNavyka.vue";

const { t, te } = useI18n();
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

const formaOtkryta = ref<boolean>(false);
const redaktiruemyyNavyk = ref<Navyk | null>(null);
const oknoOtkryto = ref<boolean>(false);
const vibranyyId = ref<string | null>(null);
const arhivCeli = ref<NavykKratko | null>(null);
const arhivPodtverzhdenie = ref<boolean>(false);
const zagruzkaRedaktirovaniya = ref<string | null>(null);
const lokalnayaOshibka = ref<string | null>(null);

const itogovayaOshibka = computed<string | null>(
    () => lokalnayaOshibka.value ?? oshibkaDejstviya.value,
);

const otfiltrovanniy = computed<NavykKratko[]>(() => store.otfiltrovanniy);

const pustPoisk = computed<boolean>(() => store.pustPoisk);

function oshibkaPoKlyuchu(code: string): string {
    const klyuch = klyuchOshibkiNavyka(code);

    return klyuch !== null && te(klyuch) ? t(klyuch) : code;
}

function povtoritZagruzku(): void {
    lokalnayaOshibka.value = null;
    store.sbrOsitOshibkuDejstviya();
    void store.zagruzit();
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
        lokalnayaOshibka.value = response.status === "fail"
            ? response.data.message
            : response.message;
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

onMounted(() => {
    void store.zagruzit({ scope: "global", projectId: null });
});
</script>

<template>
    <div class="spisok-navykov">
        <GhPageHeader
            :title="t('skill.admin.title')"
            :description="t('skill.admin.description')"
            :counter="spisok.length"
        >
            <template #actions>
                <GhButton
                    variant="primary"
                    icon="plus"
                    :label="t('skill.actions.create')"
                    @click="otkrytSozdanie"
                />
            </template>
        </GhPageHeader>

        <div class="spisok-navykov__toolbar">
            <GhInput
                :model-value="filtr.search"
                type="search"
                icon="search"
                :placeholder="t('skill.panel.search_placeholder')"
                :aria-label="t('skill.panel.search_placeholder')"
                class="spisok-navykov__search"
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
            class="spisok-navykov__banner"
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
            class="spisok-navykov__banner"
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

        <div v-else-if="loaderSpiska" class="spisok-navykov__skeleton" aria-busy="true">
            <GhSkeleton v-for="n in 4" :key="`navyk-skeleton-${n}`" variant="rect" width="100%" height="92" />
        </div>

        <GhEmptyState
            v-else-if="spisok.length === 0"
            icon="book"
            :title="t('skill.states.empty')"
            :description="t('skill.states.empty_hint')"
        >
            <template #actions>
                <GhButton
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

        <ul v-else class="spisok-navykov__list">
            <li v-for="navyk in otfiltrovanniy" :key="navyk.id">
                <NavykCard :navyk="navyk">
                    <template #actions>
                        <GhButton
                            variant="invisible"
                            size="sm"
                            icon="eye"
                            :aria-label="t('skill.actions.details')"
                            @click="otkrytOkno(navyk.id)"
                        />
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
                </NavykCard>
            </li>
        </ul>

        <FormaNavyka
            v-model="formaOtkryta"
            :navyk="redaktiruemyyNavyk"
            scope="global"
            lock-scope
            @saved="posleSohraneniya"
        />

        <OknoNavyka
            v-model="oknoOtkryto"
            :navyk-id="vibranyyId"
            @edit="redaktirovatIzOkna"
            @changed="posleIzmeneniya"
        />

        <GhDialog
            v-model="arhivPodtverzhdenie"
            :title="t('skill.archive.title')"
            width="440px"
            :close-label="t('common.buttons.close')"
        >
            <p class="spisok-navykov__confirm-text">
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
.spisok-navykov {
    display: flex;
    flex-direction: column;
    gap: 16px;
    color: var(--fgColor-default);
}

.spisok-navykov__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 16px;
}

.spisok-navykov__search {
    max-width: 360px;
}

.spisok-navykov__banner {
    margin: 0;
}

.spisok-navykov__skeleton {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.spisok-navykov__list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.spisok-navykov__confirm-text {
    margin: 0;
}
</style>
