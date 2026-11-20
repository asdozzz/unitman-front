<script setup lang="ts">
import {computed, ref} from "vue";
import {storeToRefs} from "pinia";
import {useRouter} from "vue-router";
import {copyToClipboard} from "quasar";
import type {Proekt} from "@/modules/unit/store/SpisokProektov/model/Proekt";
import {useSpisokProektovStore} from "@/modules/unit/store/SpisokProekotovStore";
import {deriveProektUiStatus} from "@/modules/unit/utils/proektStatus";
import {storeHelper} from "@/modules/app/store/HelperStore";
import ProektCardHeader from "@/modules/unit/view/Proekti/SpisokProektov/ProektCardHeader.vue";
import ProektCardMenu from "@/modules/unit/view/Proekti/SpisokProektov/ProektCardMenu.vue";

const props = defineProps<{
  item: Proekt;
}>();

const proektiStore = useSpisokProektovStore();
const {getProjectLoader} = storeToRefs(proektiStore);

const helperStore = storeHelper();
const {baseUrl} = storeToRefs(helperStore);

const router = useRouter();

const state = computed(() => deriveProektUiStatus(props.item));

/** Лоадер процесса: незавершённая сборка или ожидание результата раннера. */
const prozesAktiven = computed<boolean>(() => {
  return props.item.waitResultRunner || props.item.state === "BUILD_PENDING";
});

/** Левый красный акцент — неуспешная сборка или неудачное удаление. */
const estOshibka = computed<boolean>(() => {
  return props.item.state === "BUILD_ERROR" || props.item.state === "REMOVE_ERROR";
});

const neSobirali = computed<boolean>(() => proektiStore.proektNeSobirali(props.item.id));
const sloman = computed<boolean>(() => proektiStore.proektSloman(props.item.id));

const prompt = ref(false);

/** URL хука репозитория: копируется по клику на чип. */
const urlHuka = computed<string>(() => {
  return `${baseUrl.value}/project/${props.item.id}/hook`;
});

async function skopirovatHook() {
  await copyToClipboard(urlHuka.value);
}

function otkritZadachi() {
  router.push({name: "project_jobs", params: {id: props.item.id}});
}

function otkritRedaktirovanie() {
  router.push({name: "project_edit", params: {id: props.item.id}});
}

async function sobrat() {
  await proektiStore.sobrat(props.item.id);
}

async function aktivirovat() {
  await proektiStore.aktivirovat(props.item.id);
}

async function deaktivirovat() {
  await proektiStore.deaktivirovat(props.item.id);
}

function pokazatPodtverzhdenieUdaleniya() {
  prompt.value = true;
}

async function podtverditUdalenie() {
  if (sloman.value) {
    await proektiStore.udalitSlomaniiProekt(props.item.id);
  } else {
    await proektiStore.udalitProekt(props.item.id);
  }

  prompt.value = false;
}
</script>

<template>
  <q-dialog v-model="prompt" persistent>
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">{{ $t('unit.spisok_proektov.card.delete_confirm.title') }}</div>
        <div class="text-caption-muted q-mt-sm">
          {{ $t('unit.spisok_proektov.card.delete_confirm.message', {name: item.name}) }}
        </div>
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat :label="$t('unit.spisok_proektov.card.delete_confirm.no')" v-close-popup />
        <q-btn
            flat
            color="negative"
            :label="$t('unit.spisok_proektov.card.delete_confirm.yes')"
            :loading="getProjectLoader(item.id)"
            @click="podtverditUdalenie"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <article
      class="proekt-card"
      :class="{'proekt-card--error': estOshibka}"
  >
    <q-linear-progress
        v-if="prozesAktiven"
        indeterminate
        color="primary"
        size="3px"
        class="proekt-card__process-loader"
        :aria-label="$t('unit.spisok_proektov.card.status.process_in_progress')"
    />

    <ProektCardHeader :item="item" :state="state">
      <!-- Единственный кебаб карточки живёт в шапке-тулбаре. -->
      <template #actions>
        <ProektCardMenu
            :item="item"
            :ne-sobirali="neSobirali"
            :sloman="sloman"
            @jobs="otkritZadachi"
            @edit="otkritRedaktirovanie"
            @build="sobrat"
            @activate="aktivirovat"
            @deactivate="deaktivirovat"
            @remove="pokazatPodtverzhdenieUdaleniya"
            @remove-manually="pokazatPodtverzhdenieUdaleniya"
        />
      </template>
    </ProektCardHeader>

    <div class="proekt-card__body">
      <q-chip
          class="proekt-card__hook"
          dark
          square
          color="primary"
          icon="content_copy"
          clickable
          :title="$t('unit.spisok_proektov.card.buttons.copy_hook')"
          @click="skopirovatHook"
      >
        {{ $t('unit.proekt.hook_settings.chip_label') }}
      </q-chip>

      <div class="proekt-card__field">
        <span class="proekt-card__field-label">{{ $t('unit.spisok_proektov.card_fields.repo_id') }}</span>
        <span class="proekt-card__field-value">{{ item.repoId }}</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.proekt-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-lg);
  background: var(--app-surface);
  transition: box-shadow var(--app-duration-base) var(--app-easing);
}

.proekt-card__process-loader {
  flex: 0 0 auto;
  border-radius: var(--app-radius-lg) var(--app-radius-lg) 0 0;
}

/* Border-first: тень появляется только на hover. */
.proekt-card:hover {
  box-shadow: var(--app-shadow-md);
}

/* Ошибка читается левым акцентом, а не красной рамкой по всему периметру. */
.proekt-card--error {
  border-left: 3px solid var(--app-negative);
}

.proekt-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-3);
  padding: var(--app-space-3) var(--app-space-4);
}

.proekt-card__hook {
  align-self: flex-start;
  margin: 0;
}

.proekt-card__field {
  display: flex;
  align-items: center;
  gap: var(--app-space-1);
  min-width: 0;
  color: var(--app-text-secondary);
  font-size: var(--app-font-size-caption);
}

.proekt-card__field-label {
  flex: 0 0 auto;
}

.proekt-card__field-value {
  overflow: hidden;
  color: var(--app-text);
  font-family: var(--app-font-family-mono);
  font-size: 0.9em;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
