<script setup lang="ts">
import {ref} from "vue";
import {storeToRefs} from "pinia";
import type {Hranilishe} from "@/modules/unit/store/SpisokHranilish/model/Hranilishe";
import {useSpisokHranilishStore} from "@/modules/unit/store/SpisokHranilishStore";
import HranilishaCardHeader from "@/modules/unit/view/Hranilisha/SpisokHranilish/HranilishaCardHeader.vue";
import HranilishaCardMenu from "@/modules/unit/view/Hranilisha/SpisokHranilish/HranilishaCardMenu.vue";

const props = defineProps<{
  item: Hranilishe;
}>();

const hranilishaStore = useSpisokHranilishStore();
const {loaderObnovleniyaHranilisha} = storeToRefs(hranilishaStore);

const prompt = ref(false);

/** Верификация запускается из меню сразу: подтверждение не требуется. */
async function podtverditDostup() {
  await hranilishaStore.activirovatHranilishe(props.item.id);
}

function pokazatPodtverzhdenieUdaleniya() {
  prompt.value = true;
}

async function podtverditUdalenie() {
  await hranilishaStore.udalitHranilishe(props.item.id);
  prompt.value = false;
}
</script>

<template>
  <q-dialog v-model="prompt" persistent>
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">{{ $t('unit.spisok_rep.card.delete_confirm.title') }}</div>
        <div class="text-caption-muted q-mt-sm">
          {{ $t('unit.spisok_rep.card.delete_confirm.message', {name: item.name}) }}
        </div>
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat :label="$t('unit.spisok_rep.card.delete_confirm.no')" v-close-popup />
        <q-btn
            flat
            color="negative"
            :label="$t('unit.spisok_rep.card.delete_confirm.yes')"
            :loading="loaderObnovleniyaHranilisha"
            @click="podtverditUdalenie"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <article class="hranilisha-card">
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
        <q-icon name="category" size="14px" />
        <span class="hranilisha-card__field-value">{{ item.type }}</span>
      </div>

      <div v-if="item.repoUrl" class="hranilisha-card__field">
        <q-icon name="link" size="14px" />
        <a
            class="hranilisha-card__field-value hranilisha-card__url"
            :href="item.repoUrl"
            target="_blank"
            rel="noopener noreferrer"
            :title="item.repoUrl"
        >{{ item.repoUrl }}</a>
      </div>
    </div>
  </article>
</template>

<style scoped>
.hranilisha-card {
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

/* Border-first: тень появляется только на hover. */
.hranilisha-card:hover {
  box-shadow: var(--app-shadow-md);
}

.hranilisha-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-2);
  padding: var(--app-space-3) var(--app-space-4);
}

.hranilisha-card__field {
  display: flex;
  align-items: center;
  gap: var(--app-space-1);
  min-width: 0;
  color: var(--app-text-secondary);
  font-size: var(--app-font-size-caption);
}

.hranilisha-card__field-value {
  overflow: hidden;
  color: var(--app-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hranilisha-card__url {
  font-family: var(--app-font-family-mono);
  font-size: 0.9em;
  text-decoration: none;
}

.hranilisha-card__url:hover {
  text-decoration: underline;
}
</style>
