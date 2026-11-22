<script setup lang="ts">
import {computed} from "vue";
import {onMounted } from "vue";
import {storeToRefs} from "pinia";
import {useSpisokPolzovateleiProektaStore} from "@/modules/unit/store/SpisokProektov/SpisokPolzovateleiProektaStore";
import {useSpisokVsehPolzovateleiStore} from "@/modules/account/store/SpisokVsehPolzovateleiStore";
import {useRoute} from "vue-router";
import Polzovatel from "@/modules/account/store/SpisokVsehPolzovatelei/model/Polzovatel";
import {
  GhBanner,
  GhBox,
  GhButton,
  GhEmptyState,
  GhSkeleton,
} from "@/components/ui";

const spisokPolzovateleiProektaStore = useSpisokPolzovateleiProektaStore();
const { loaderSpiskaPolzovatei, oshibkaZagruzkiSpiska, loaderUdaleniya, loaderDobavleniya } = storeToRefs(spisokPolzovateleiProektaStore);

const spisokVsehPolzovateleiStore = useSpisokVsehPolzovateleiStore();
const { spisok: spisokVsehPolzovatelei } = storeToRefs(spisokVsehPolzovateleiStore)

const route = useRoute();

/** Индикатор операции на конкретной кнопке. */
const operatsiyaIdet = computed<boolean>(
    () => loaderDobavleniya.value || loaderUdaleniya.value,
);

onMounted(async () => {
  spisokPolzovateleiProektaStore.pokazatSpisok(route.params.id as string)
  await spisokVsehPolzovateleiStore.poluchitVsehPolzovatelei();
  await spisokPolzovateleiProektaStore.poluchitSpisok();
})

function esliVibran(userId: string): boolean {
  return spisokPolzovateleiProektaStore.spisokIdPolzovatelei.includes(userId)
}

function toggleUser(userId: string): void {
  if (esliVibran(userId)) {
    udalit(userId)
  } else {
    dobavit(userId)
  }
}

async function udalit(userId: string) {
  await spisokPolzovateleiProektaStore.udalitPolzovatelyaIzProekta(userId);
}

async function dobavit(userId: string) {
  await spisokPolzovateleiProektaStore.dobavitPolzovatelya(userId);
}

function getLabel(item: Polzovatel): string {
  let result = item.email;

  if (item.nickname) {
    result += ' ('+item.nickname+')';
  }

  return result;
}

function povtoritZagruzku(): void {
  void spisokPolzovateleiProektaStore.poluchitSpisok();
}
</script>

<template>
  <GhBox padding="md" class="users">
    <template #header>
      {{ $t('unit.proekt.users.title') }}
    </template>

    <p class="users__hint">{{ $t('unit.proekt.users.hint') }}</p>

    <GhBanner
        v-if="oshibkaZagruzkiSpiska"
        variant="danger"
        :title="$t('common.states.error')"
    >
      {{ oshibkaZagruzkiSpiska }}
      <template #actions>
        <GhButton
            variant="default"
            icon="sync"
            :label="$t('common.buttons.retry')"
            @click="povtoritZagruzku"
        />
      </template>
    </GhBanner>

    <div v-else-if="loaderSpiskaPolzovatei" class="users__skeleton" aria-busy="true">
      <GhSkeleton v-for="n in 4" :key="`user-skeleton-${n}`" variant="text" width="60%" height="28" />
    </div>

    <GhEmptyState
        v-else-if="spisokVsehPolzovatelei.length === 0"
        icon="people"
        :title="$t('unit.proekt.users.empty')"
    />

    <ul v-else class="users__list">
      <li v-for="item in spisokVsehPolzovatelei" :key="item.id">
        <GhButton
            :variant="esliVibran(item.id) ? 'primary' : 'default'"
            :icon="esliVibran(item.id) ? 'check' : 'person'"
            :label="getLabel(item)"
            :disabled="operatsiyaIdet"
            :aria-pressed="esliVibran(item.id) ? 'true' : 'false'"
            :title="esliVibran(item.id) ? $t('unit.proekt.users.selected_hint') : undefined"
            @click="toggleUser(item.id)"
        />
      </li>
    </ul>
  </GhBox>
</template>

<style scoped>
.users {
  max-width: 720px;
}

.users__hint {
  margin: 0 0 12px;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-normal);
}

.users__skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.users__list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
