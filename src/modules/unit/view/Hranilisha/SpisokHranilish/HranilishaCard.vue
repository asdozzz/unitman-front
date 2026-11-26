<script setup lang="ts">
import {computed, ref} from "vue";
import {storeToRefs} from "pinia";
import type {Hranilishe} from "@/modules/unit/store/SpisokHranilish/model/Hranilishe";
import {useSpisokHranilishStore} from "@/modules/unit/store/SpisokHranilishStore";
import HranilishaCardHeader from "@/modules/unit/view/Hranilisha/SpisokHranilish/HranilishaCardHeader.vue";
import HranilishaCardMenu from "@/modules/unit/view/Hranilisha/SpisokHranilish/HranilishaCardMenu.vue";
import {
  GhBox,
  GhButton,
  GhDialog,
  GhFormField,
  GhIcon,
  GhInput,
} from "@/components/ui";

const props = defineProps<{
  item: Hranilishe;
}>();

const hranilishaStore = useSpisokHranilishStore();
const {loaderObnovleniyaHranilisha} = storeToRefs(hranilishaStore);

const prompt = ref(false);
const podtverzhdenieImeni = ref<string>("");

/** Кнопка удаления активна только при точном совпадении имени. */
const imyaSovpadaet = computed<boolean>(
    () => podtverzhdenieImeni.value.trim() === props.item.name,
);

/** Верификация запускается из меню сразу: подтверждение не требуется. */
async function podtverditDostup() {
  await hranilishaStore.activirovatHranilishe(props.item.id);
}

function pokazatPodtverzhdenieUdaleniya() {
  podtverzhdenieImeni.value = "";
  prompt.value = true;
}

async function podtverditUdalenie() {
  if (!imyaSovpadaet.value) {
    return;
  }

  await hranilishaStore.udalitHranilishe(props.item.id);
  prompt.value = false;
}
</script>

<template>
  <GhDialog
      v-model="prompt"
      :title="$t('unit.spisok_rep.card.delete_confirm.title')"
      width="440px"
  >
    <p class="hranilisha-card__dialog-text">
      {{ $t('unit.spisok_rep.card.delete_confirm.message', {name: item.name}) }}
    </p>

    <GhFormField
        :label="$t('unit.spisok_rep.card.delete_confirm.input_label')"
        :caption="$t('unit.spisok_rep.card.delete_confirm.input_hint', {name: item.name})"
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
          :label="$t('unit.spisok_rep.card.delete_confirm.no')"
          @click="prompt = false"
      />
      <GhButton
          variant="danger"
          icon="trash"
          :label="$t('unit.spisok_rep.card.delete_confirm.yes')"
          :disabled="!imyaSovpadaet"
          :loading="loaderObnovleniyaHranilisha"
          @click="podtverditUdalenie"
      />
    </template>
  </GhDialog>

  <GhBox padding="none" class="hranilisha-card">
    <HranilishaCardHeader :item="item">
      <!-- Единственный кебаб карточки живёт в шапке-тулбаре. -->
      <template #actions>
        <HranilishaCardMenu
            :item="item"
            @confirm="podtverditDostup"
            @remove="pokazatPodtverzhdenieUdaleniya"
        />
      </template>
    </HranilishaCardHeader>

    <div class="hranilisha-card__body">
      <div class="hranilisha-card__field">
        <GhIcon name="repo" :size="14" />
        <span class="hranilisha-card__field-value">{{ item.type }}</span>
      </div>

      <div v-if="item.repoUrl" class="hranilisha-card__field">
        <GhIcon name="link" :size="14" />
        <a
            class="hranilisha-card__field-value hranilisha-card__url"
            :href="item.repoUrl"
            target="_blank"
            rel="noopener noreferrer"
            :title="item.repoUrl"
        >{{ item.repoUrl }}</a>
      </div>

      <div v-if="item.tokenHint" class="hranilisha-card__field">
        <GhIcon name="key" :size="14" />
        <span class="hranilisha-card__field-value">
          {{ $t('unit.spisok_rep.card.token_hint', {hint: item.tokenHint}) }}
        </span>
      </div>
    </div>
  </GhBox>
</template>

<style scoped>
.hranilisha-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
}

.hranilisha-card__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
}

.hranilisha-card__field {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.hranilisha-card__field-value {
  overflow: hidden;
  color: var(--fgColor-default);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hranilisha-card__url {
  color: var(--fgColor-accent);
  font-family: var(--fontStack-monospace);
  font-size: 0.9em;
  text-decoration: none;
}

.hranilisha-card__url:hover {
  text-decoration: underline;
}

.hranilisha-card__dialog-text {
  margin: 0 0 12px;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-normal);
}
</style>
