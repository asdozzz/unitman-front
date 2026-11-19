<script setup lang="ts">
import {computed, onMounted, onUnmounted, watch} from "vue";
import {storeToRefs} from "pinia";
import {useI18n} from "vue-i18n";
import {useQuasar} from "quasar";
import {useRoute, useRouter} from "vue-router";
import {useSpisokUnitovStore} from "@/modules/unit/store/SpisokUnitovStore";
import {
  useSpisokUnitovViewStore,
  type UnitListViewMode,
} from "@/modules/unit/store/SpisokUnitovViewStore";
import UnitCard from "@/modules/unit/view/Unit/SpisokUnitov/UnitCard.vue";
import UnitListPane from "@/modules/unit/view/Unit/SpisokUnitov/UnitListPane.vue";
import UnitDetailsPane from "@/modules/unit/view/Unit/SpisokUnitov/UnitDetailsPane.vue";
import FormaSozdaniyaUnita from "@/modules/unit/view/Unit/FormaSozdaniyaUnita.vue";
import FormaZapolneniyaPeremenihUnita from "@/modules/unit/view/Unit/FormaZapolneniyaPeremenihUnita.vue";
import FormaDeistviyUnita from "@/modules/unit/view/Unit/FormaDeistviyUnita.vue";
import FormaSozdaniyaSessii from "@/modules/opencode/view/FormaSozdaniyaSessii.vue";
import {useFormaDobavleniyaUnitaStore} from "@/modules/unit/store/SpisokUnitov/FormaDobavleniyaUnitaStore";
import {useFormaZapolneniyaPeremenihUnitaStore} from "@/modules/unit/store/SpisokUnitov/FormaZapolneniyaPeremenihUnitStore";
import {storFormiDeistviyUnita} from "@/modules/unit/store/SpisokUnitov/StorFormiDeistviy";
import {ModelForChannelSpisokUnitov} from "@/modules/unit/model/websocket/ModelForChannelSpisokUnitov";
import {podpisatsyaNaSobitiyaUnitov} from "@/modules/unit/model/websocket/PodpiskaNaSobitiyaUnitov";
import {useStorSpiskaRekvizitovOpenCode} from "@/modules/account/store/SpisokRekvizitovOpenCode/StorSpiskaRekvizitovOpenCode";

const unitiStore = useSpisokUnitovStore();
const {
  spisok,
  oshibkaZagruzkiSpiska,
  nastroikiSpiska,
  proekti,
  nazvanieUnitaPoId,
  loaderSpiskaUnitov,
} = storeToRefs(unitiStore);

const viewStore = useSpisokUnitovViewStore();
const {rezhim, selectedUnitId} = storeToRefs(viewStore);

const addFormStore = useFormaDobavleniyaUnitaStore();
const {enable: enableAddForm} = storeToRefs(addFormStore);

const konfigFormStore = useFormaZapolneniyaPeremenihUnitaStore();
const {enable: enableKonfigForm} = storeToRefs(konfigFormStore);

const storFormiDeistviy = storFormiDeistviyUnita();
const {enable: enableFormiDeistviya} = storeToRefs(storFormiDeistviy);

const router = useRouter();
const storRekvizitov = useStorSpiskaRekvizitovOpenCode();
const quasar = useQuasar();
const {t} = useI18n();

/**
 * Режим D доступен только на широких экранах: ниже 1024px показываем карточки,
 * чтобы не появлялся третий макет и не ломалась двухпанельная раскладка.
 */
const effektivniyRezhim = computed<UnitListViewMode>(() => {
  return quasar.screen.gt.sm ? rezhim.value : "cards";
});

const rezhimy = computed<Array<{key: UnitListViewMode; label: string; icon: string}>>(() => [
  {
    key: "cards",
    label: t('unit.spisok_unitov.view.cards'),
    icon: "grid_view",
  },
  {
    key: "workspace",
    label: t('unit.spisok_unitov.view.workspace'),
    icon: "view_sidebar",
  },
]);

const vibraniyUnit = computed(() => {
  return spisok.value.find((unit) => unit.id === selectedUnitId.value) ?? null;
});

function izmenitRezhim(noviyRezhim: UnitListViewMode) {
  viewStore.setRezhim(noviyRezhim);

  if (noviyRezhim === "workspace") {
    viewStore.sinhronizovatVibor(spisok.value.map((unit) => unit.id));
  }
}

function vybratUnit(unitId: string) {
  viewStore.vybratUnit(unitId);
}

/** После создания сессии из карточки юнита сразу открываем её чат. */
function pereytiVSessiyu(id: string) {
  router.push({name: "opencode_chat", params: {id}});
}

function openAddForm() {
  addFormStore.otkritFormu();
}

/**
 * Отписка от канала событий юнитов.
 *
 * Подписка общая с окном задач runner'а, поэтому создаётся и снимается
 * через модуль-реестр, а не напрямую через клиент Centrifugo.
 */
let otpisatsyaOtSobitiy: (() => void) | null = null;

onMounted(async () => {
  const route = useRoute();
  if (route.query.id) {
    nastroikiSpiska.value.filter.unitId = route.query.id as string;
  }

  unitiStore.poluchitMoiProekti();
  unitiStore.poluchitSpisokUnitov();
  // Реквизиты нужны диалогу создания сессии из карточки юнита.
  storRekvizitov.poluchitSpisok();

  otpisatsyaOtSobitiy = podpisatsyaNaSobitiyaUnitov(handleWebsocketEvent);
});

onUnmounted(() => {
  otpisatsyaOtSobitiy?.();
  otpisatsyaOtSobitiy = null;
});

function handleWebsocketEvent(event: ModelForChannelSpisokUnitov) {
  console.log(event.eventType, event);
  switch (event.eventType) {
    case 'OBNOVLEN':
    case 'OBNOVLENA_STATA':
      if (unitiStore.issetUnit(event.id)) {
        unitiStore.obnovitUnit(event.id);
      }
      break;
    case 'UDALEN':
      unitiStore.udalitUnitIzSpiska(event.id);
      break;
    case 'SOZDAN':
      unitiStore.poluchitSpisokUnitov();
      break;
  }
}

function clearUnitIdFilter() {
  nastroikiSpiska.value.filter.unitId = null;
  unitiStore.poluchitSpisokUnitov();
}

/** Подпись чипа фильтра связей: имя юнита из кеша либо его идентификатор. */
function podpisSvyazi(unitId: string): string {
  return nazvanieUnitaPoId.value(unitId) ?? unitId;
}

function clearSvyaziFilter() {
  unitiStore.ochistitSvyaziUnita();
}

async function udalitSvyazIzFiltra(unitId: string) {
  await unitiStore.perekluchitSvyazUnita(unitId);
}

// Список перезапрашивается после действий и по WebSocket-событиям: выбор
// должен пережить обновление, а исчезнувший юнит — замениться первым.
watch(
    () => spisok.value.map((unit) => unit.id),
    (ids: string[]) => {
      if (effektivniyRezhim.value === "workspace") {
        viewStore.sinhronizovatVibor(ids);
      }
    },
);

watch(effektivniyRezhim, (noviyRezhim: UnitListViewMode) => {
  if (noviyRezhim === "workspace") {
    viewStore.sinhronizovatVibor(spisok.value.map((unit) => unit.id));
  }
});
</script>

<template>
  <div class="full-width flex column">
    <div class="row wrap items-start content-start q-pb-md">
      <div class="col-auto">
        <q-input
            square
            style="width: 235px"
            dense
            outlined
            v-model="nastroikiSpiska.filter.name"
            :label="$t('unit.spisok_unitov.filter.unit_name')"
            @update:model-value="unitiStore.poluchitSpisokUnitov()"
        />
      </div>

      <div class="col-auto q-pl-md">
        <q-input
            square
            style="width: 235px"
            dense
            outlined
            v-model="nastroikiSpiska.filter.branch"
            :label="$t('unit.spisok_unitov.filter.branch')"
            @update:model-value="unitiStore.poluchitSpisokUnitov()"
        />
      </div>

      <div class="col-auto q-pl-md">
        <q-select
            square
            style="width: 235px"
            dense
            outlined
            v-model="nastroikiSpiska.filter.projectId"
            :options="proekti.spisok"
            :label="$t('unit.spisok_unitov.filter.project')"
            emit-value
            map-options
            clearable
            @update:model-value="unitiStore.poluchitSpisokUnitov()"
        />
      </div>

      <div class="col-auto q-pl-md">
        <div style="width: 335px">
          <q-toggle
              v-model="nastroikiSpiska.filter.onlyMine"
              :label="$t('unit.spisok_unitov.filter.only_mine')"
              @update:model-value="unitiStore.poluchitSpisokUnitov()"
          />

          <q-btn
              square
              padding="7px 7px"
              class="q-ml-md"
              size="md"
              color="primary"
              icon="refresh"
              @click="unitiStore.poluchitSpisokUnitov()"
          >
            <q-tooltip>{{ $t('unit.spisok_unitov.buttons.refresh') }}</q-tooltip>
          </q-btn>

          <q-btn
              square
              padding="7px 7px"
              class="q-ml-md"
              size="md"
              color="primary"
              icon="add"
              @click="openAddForm"
          >
            <q-tooltip>{{ $t('unit.spisok_unitov.buttons.add') }}</q-tooltip>
          </q-btn>
        </div>
      </div>
    </div>

    <div v-if="quasar.screen.gt.sm" class="row items-center q-gutter-sm q-mb-md">
      <q-btn
          v-for="variant in rezhimy"
          :key="variant.key"
          no-caps
          size="sm"
          :icon="variant.icon"
          :label="variant.label"
          color="primary"
          :outline="rezhim !== variant.key"
          :unelevated="rezhim === variant.key"
          :aria-pressed="rezhim === variant.key"
          @click="izmenitRezhim(variant.key)"
      />
    </div>

    <div class="q-mb-md" v-if="nastroikiSpiska.filter.unitId">
      <q-chip
          removable
          color="primary"
          square
          text-color="white"
          :label="'id: ' + nastroikiSpiska.filter.unitId"
          @remove="clearUnitIdFilter"
      />
    </div>

    <div class="q-mb-md row items-center q-gutter-xs" v-if="nastroikiSpiska.filter.unitIds.length > 0">
      <span class="fs-12 text-grey-8">{{ $t('unit.spisok_unitov.filter.svyazi') }}:</span>
      <q-chip
          v-for="unitId in nastroikiSpiska.filter.unitIds"
          :key="'svyaz_filter_' + unitId"
          removable
          square
          color="primary"
          text-color="white"
          icon="link"
          :label="podpisSvyazi(unitId)"
          @remove="udalitSvyazIzFiltra(unitId)"
      />
      <q-btn flat dense size="sm" color="primary" icon="clear" @click="clearSvyaziFilter">
        <q-tooltip>{{ $t('unit.spisok_unitov.filter.clear_svyazi') }}</q-tooltip>
      </q-btn>
    </div>

    <q-linear-progress
        v-if="loaderSpiskaUnitov"
        indeterminate
        color="primary"
        class="q-mb-md"
    />

    <template v-if="oshibkaZagruzkiSpiska">
      <div v-html="oshibkaZagruzkiSpiska"></div>
    </template>

    <template v-else-if="effektivniyRezhim === 'workspace'">
      <div class="unit-workspace">
        <UnitListPane
            :items="spisok"
            :selected-id="selectedUnitId"
            @select="vybratUnit"
        />
        <UnitDetailsPane :item="vibraniyUnit" />
      </div>
    </template>

    <template v-else>
      <div v-if="spisok.length === 0" class="unit-cards-grid__empty">
        {{ $t('unit.spisok_unitov.list.empty_result') }}
      </div>

      <div v-else class="unit-cards-grid">
        <UnitCard
            v-for="item in spisok"
            :key="'unit_card' + item.id"
            :item="item"
        />
      </div>
    </template>

    <q-dialog v-model="enableAddForm" persistent transition-show="scale" transition-hide="scale" backdrop-filter="blur(4px)">
      <FormaSozdaniyaUnita @formaBilaOtpravlena="unitiStore.poluchitSpisokUnitov()" />
    </q-dialog>

    <q-dialog v-model="enableKonfigForm" persistent transition-show="scale" transition-hide="scale">
      <FormaZapolneniyaPeremenihUnita @formaBilaOtpravlena="unitiStore.poluchitSpisokUnitov()" />
    </q-dialog>

    <q-dialog v-model="enableFormiDeistviya" persistent transition-show="scale" transition-hide="scale">
      <FormaDeistviyUnita @formaBilaOtpravlena="unitiStore.poluchitSpisokUnitov()" />
    </q-dialog>

    <!-- Диалог создания сессии общий с модулем OpenCode: карточка юнита
         только открывает его с предвыбранным юнитом. -->
    <FormaSozdaniyaSessii @sozdana="pereytiVSessiyu" />
  </div>
</template>

<style scoped>
.unit-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
  align-items: start;
  gap: var(--app-space-4);
}

.unit-cards-grid__empty {
  padding: var(--app-space-4);
  color: var(--app-text-secondary);
}

.unit-workspace {
  display: grid;
  grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
  align-items: start;
  gap: var(--app-space-4);
}

@media (max-width: 1023.98px) {
  .unit-workspace {
    grid-template-columns: 1fr;
  }
}
</style>
