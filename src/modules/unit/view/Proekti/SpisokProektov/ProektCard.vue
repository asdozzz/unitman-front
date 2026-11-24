<script setup lang="ts">
import {computed, ref} from "vue";
import {storeToRefs} from "pinia";
import {useRouter} from "vue-router";
import {copyToClipboard} from "quasar";
import {
  GhBox,
  GhButton,
  GhDialog,
  GhFormField,
  GhInput,
} from "@/components/ui";
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

/** Лоадер процесса: ожидание результата раннера. */
const prozesAktiven = computed<boolean>(() => {
  return props.item.waitResultRunner;
});

/** Левый красный акцент — неудачное удаление. */
const estOshibka = computed<boolean>(() => {
  return props.item.state === "REMOVE_ERROR";
});

const sloman = computed<boolean>(() => proektiStore.proektSloman(props.item.id));

const prompt = ref(false);

/** Введённое имя проекта для mistake-proofing удаления. */
const podtverzhdenieImeni = ref<string>("");

/** Кнопка удаления активна только при точном совпадении имени. */
const imyaSovpadaet = computed<boolean>(
    () => podtverzhdenieImeni.value.trim() === props.item.name,
);

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

async function aktivirovat() {
  await proektiStore.aktivirovat(props.item.id);
}

async function deaktivirovat() {
  await proektiStore.deaktivirovat(props.item.id);
}

function pokazatPodtverzhdenieUdaleniya() {
  podtverzhdenieImeni.value = "";
  prompt.value = true;
}

async function podtverditUdalenie() {
  if (!imyaSovpadaet.value) {
    return;
  }

  if (sloman.value) {
    await proektiStore.udalitSlomaniiProekt(props.item.id);
  } else {
    await proektiStore.udalitProekt(props.item.id);
  }

  prompt.value = false;
}
</script>

<template>
  <GhDialog
      v-model="prompt"
      :title="$t('unit.spisok_proektov.card.delete_confirm.title')"
      width="440px"
  >
    <p class="proekt-card__dialog-text">
      {{ $t('unit.spisok_proektov.card.delete_confirm.message', {name: item.name}) }}
    </p>

    <GhFormField
        :label="$t('unit.spisok_proektov.card.delete_confirm.input_label')"
        :caption="$t('unit.spisok_proektov.card.delete_confirm.input_hint', {name: item.name})"
    >
      <GhInput
          :model-value="podtverzhdenieImeni"
          :placeholder="item.name"
          autocomplete="off"
          @update:model-value="podtverzhdenieImeni = $event === null ? '' : String($event)"
      />
    </GhFormField>

    <template #footer>
      <GhButton
          variant="default"
          :label="$t('unit.spisok_proektov.card.delete_confirm.no')"
          @click="prompt = false"
      />
      <GhButton
          variant="danger"
          icon="trash"
          :label="$t('unit.spisok_proektov.card.delete_confirm.yes')"
          :disabled="!imyaSovpadaet"
          :loading="getProjectLoader(item.id)"
          @click="podtverditUdalenie"
      />
    </template>
  </GhDialog>

  <GhBox padding="none" class="proekt-card" :class="{'proekt-card--error': estOshibka}">
    <div v-if="prozesAktiven" class="proekt-card__process" role="progressbar" aria-busy="true">
      <span class="proekt-card__process-bar" />
    </div>

    <ProektCardHeader :item="item" :state="state">
      <!-- Единственный кебаб карточки живёт в шапке-тулбаре. -->
      <template #actions>
        <ProektCardMenu
            :item="item"
            :sloman="sloman"
            @jobs="otkritZadachi"
            @edit="otkritRedaktirovanie"
            @activate="aktivirovat"
            @deactivate="deaktivirovat"
            @remove="pokazatPodtverzhdenieUdaleniya"
            @remove-manually="pokazatPodtverzhdenieUdaleniya"
        />
      </template>
    </ProektCardHeader>

    <div class="proekt-card__body">
      <GhButton
          variant="default"
          size="sm"
          icon="copy"
          :label="$t('unit.proekt.hook_settings.chip_label')"
          :title="$t('unit.spisok_proektov.card.buttons.copy_hook')"
          @click="skopirovatHook"
      />

      <div class="proekt-card__field">
        <span class="proekt-card__field-label">{{ $t('unit.spisok_proektov.card_fields.repo_id') }}</span>
        <span class="proekt-card__field-value gh-mono">{{ item.repoId }}</span>
      </div>
    </div>
  </GhBox>
</template>

<style scoped>
.proekt-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
}

/* Индикатор процесса: тонкая полоса сверху карточки. */
.proekt-card__process {
  height: 3px;
  overflow: hidden;
  background: var(--bgColor-neutral-muted);
}

.proekt-card__process-bar {
  display: block;
  width: 35%;
  height: 100%;
  background: var(--fgColor-accent);
  animation: proekt-card-process 1.2s ease-in-out infinite;
}

@keyframes proekt-card-process {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(300%);
  }
}

/* Ошибка читается левым акцентом, а не красной рамкой по всему периметру. */
.proekt-card--error {
  border-left: 3px solid var(--fgColor-danger);
}

.proekt-card__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
}

.proekt-card__field {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.proekt-card__field-label {
  flex: 0 0 auto;
}

.proekt-card__field-value {
  overflow: hidden;
  color: var(--fgColor-default);
  font-size: 0.9em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proekt-card__dialog-text {
  margin: 0 0 12px;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-normal);
}
</style>
