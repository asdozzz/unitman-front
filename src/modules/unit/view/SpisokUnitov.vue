<script setup lang="ts">
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from "vue";
import {storeToRefs} from "pinia";
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
import UnitFilterBar from "@/modules/unit/view/Unit/SpisokUnitov/UnitFilterBar.vue";
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
import {
  DEFAULT_UNIT_FILTERS,
  type UnitFilterKey,
  type UnitFilters,
} from "@/modules/unit/store/SpisokUnitov/model/UnitFilters";
import {
  prochitatFiltriIzQuery,
  serializovatFiltriVQuery,
} from "@/modules/unit/utils/unitFiltersUrl";

const unitiStore = useSpisokUnitovStore();
const {
  spisok,
  oshibkaZagruzkiSpiska,
  nastroikiSpiska,
  proekti,
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

const route = useRoute();
const router = useRouter();
const storRekvizitov = useStorSpiskaRekvizitovOpenCode();
const quasar = useQuasar();

/** Время последней успешной загрузки списка (unix-секунды, как в `convertDate`). */
const posledneeObnovlenie = ref<number | null>(null);

/**
 * Защита от цикла «фильтр → URL → фильтр»: пока фильтр применён из URL,
 * его изменение не должно снова писать URL.
 */
const propuskatZapisVUrl = ref(false);

const KLYUCHI_FILTRA = [
  "search",
  "name",
  "branch",
  "projectId",
  "onlyMine",
  "statuses",
  "unitId",
  "unitIds",
  "sort",
] as const;

/**
 * Режим D доступен только на широких экранах: ниже 1024px показываем карточки,
 * чтобы не появлялся третий макет и не ломалась двухпанельная раскладка.
 */
const effektivniyRezhim = computed<UnitListViewMode>(() => {
  return quasar.screen.gt.sm ? rezhim.value : "cards";
});

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
 * Обработчик `change` от тулбара: фильтр уже собран компонентом, страница лишь
 * записывает его и решает, нужен ли debounce (он живёт в сторе).
 */
function obrabotatIzmenenieFiltrov(payload: {filters: UnitFilters; immediate: boolean}) {
  nastroikiSpiska.value.filter = payload.filters;
  unitiStore.sohranitNastroiki();

  if (payload.immediate) {
    void unitiStore.poluchitSpisokUnitov();
  } else {
    unitiStore.zaprositSpisokUnitov();
  }
}

/**
 * Удаление одного чипа активного фильтра.
 *
 * Для `statuses`/`unitIds` убирается конкретное значение, для `unitId` —
 * обнуляется, для остальных ключей возвращается значение по умолчанию.
 */
function udalitChip(chip: {key: UnitFilterKey; value?: string}) {
  const filter = nastroikiSpiska.value.filter;

  switch (chip.key) {
    case "statuses":
      void unitiStore.primenitFiltri({
        statuses: filter.statuses.filter((status) => status !== chip.value),
      });
      return;
    case "unitIds":
      void unitiStore.primenitFiltri({
        unitIds: filter.unitIds.filter((unitId) => unitId !== chip.value),
      });
      return;
    case "unitId":
      void unitiStore.primenitFiltri({unitId: null});
      return;
    case "search":
      void unitiStore.primenitFiltri({search: DEFAULT_UNIT_FILTERS.search});
      return;
    case "name":
      void unitiStore.primenitFiltri({name: DEFAULT_UNIT_FILTERS.name});
      return;
    case "branch":
      void unitiStore.primenitFiltri({branch: DEFAULT_UNIT_FILTERS.branch});
      return;
    case "projectId":
      void unitiStore.primenitFiltri({projectId: DEFAULT_UNIT_FILTERS.projectId});
      return;
    case "onlyMine":
      void unitiStore.primenitFiltri({onlyMine: DEFAULT_UNIT_FILTERS.onlyMine});
      return;
  }
}

/** Есть ли в query хоть один параметр фильтра (включая устаревший `?id=`). */
function estFiltriVQuery(query: Record<string, unknown>): boolean {
  const estKlyuch = KLYUCHI_FILTRA.some((key) => {
    const znachenie = query[key];

    return znachenie !== undefined && znachenie !== null && znachenie !== "";
  });

  return estKlyuch || (typeof query.id === "string" && query.id !== "");
}

/**
 * Собирает фильтр из query.
 *
 * Старый deep-link `?id=` кодек не знает — поддержку добавляем здесь, не
 * меняя `unitFiltersUrl.ts`.
 */
function sobratFiltriIzQuery(query: Record<string, unknown>): UnitFilters {
  const filter = prochitatFiltriIzQuery(query);
  const stariyId = typeof query.id === "string" ? query.id : null;

  if (filter.unitId === null && stariyId !== null && stariyId !== "") {
    filter.unitId = stariyId;
  }

  return filter;
}

/** Строковое представление фильтрующих параметров текущего `route.query`. */
function tekushieFiltriQuery(query: Record<string, unknown>): Record<string, string> {
  const rezultat: Record<string, string> = {};

  KLYUCHI_FILTRA.forEach((key) => {
    const znachenie = query[key];

    if (typeof znachenie === "string") {
      rezultat[key] = znachenie;
    }
  });

  return rezultat;
}

/** Эквивалентность сериализованных фильтров: одинаковый набор ключей и значений. */
function ekvivalentni(a: Record<string, string>, b: Record<string, string>): boolean {
  const klyuchiA = Object.keys(a);
  const klyuchiB = Object.keys(b);

  if (klyuchiA.length !== klyuchiB.length) {
    return false;
  }

  return klyuchiA.every((key) => a[key] === b[key]);
}

/**
 * Применяет фильтр из URL к текущему фильтру.
 *
 * При обратной навигации (`zaprositSpisok = true`) фильтр применяется, только
 * если сериализованные значения отличаются, и без повторной записи URL.
 */
function primenitFiltriIzUrl(query: Record<string, unknown>, zaprositSpisok: boolean): void {
  const noviyFilter = sobratFiltriIzQuery(query);
  const tekushiy = serializovatFiltriVQuery(nastroikiSpiska.value.filter);
  const noviy = serializovatFiltriVQuery(noviyFilter);

  if (ekvivalentni(tekushiy, noviy)) {
    return;
  }

  propuskatZapisVUrl.value = true;
  nastroikiSpiska.value.filter = noviyFilter;

  void nextTick(() => {
    propuskatZapisVUrl.value = false;
  });

  if (zaprositSpisok) {
    void unitiStore.poluchitSpisokUnitov();
  }
}

// Инициализация из URL — до создания watcher'ов, чтобы применение query не
// вызвало обратную запись. Пустой query оставляет фильтр из localStorage.
if (estFiltriVQuery(route.query)) {
  primenitFiltriIzUrl(route.query, false);
}

// Изменение фильтра (тулбар, чипы, сброс) синхронизирует query через replace.
// Пишем только если сериализованное представление отличается от текущего URL.
watch(
    () => nastroikiSpiska.value.filter,
    () => {
      if (propuskatZapisVUrl.value) {
        return;
      }

      const serializovannie = serializovatFiltriVQuery(nastroikiSpiska.value.filter);

      if (ekvivalentni(serializovannie, tekushieFiltriQuery(route.query))) {
        return;
      }

      void router.replace({query: serializovannie});
    },
    {deep: true},
);

// Обратная навигация (back/forward): фильтр восстанавливается из URL без
// повторной записи query.
watch(
    () => route.query,
    (noviyQuery) => {
      primenitFiltriIzUrl(noviyQuery, true);
    },
);

// Фиксируем момент окончания загрузки, чтобы тулбар показал «обновлено …».
watch(loaderSpiskaUnitov, (zagruzka: boolean, bilaZagruzka: boolean | undefined) => {
  if (bilaZagruzka === true && zagruzka === false) {
    posledneeObnovlenie.value = Math.floor(Date.now() / 1000);
  }
});

/**
 * Отписка от канала событий юнитов.
 *
 * Подписка общая с окном задач runner'а, поэтому создаётся и снимается
 * через модуль-реестр, а не напрямую через клиент Centrifugo.
 */
let otpisatsyaOtSobitiy: (() => void) | null = null;

onMounted(async () => {
  unitiStore.poluchitMoiProekti();
  unitiStore.poluchitSpisokUnitov();
  // Реквизиты нужны диалогу создания сессии из карточки юнита.
  storRekvizitov.poluchitSpisok();

  otpisatsyaOtSobitiy = podpisatsyaNaSobitiyaUnitov(handleWebsocketEvent);
});

onUnmounted(() => {
  otpisatsyaOtSobitiy?.();
  otpisatsyaOtSobitiy = null;
  unitiStore.stopProzesPolling();
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

/**
 * Пока есть хотя бы один активный процесс, страхуем обновления опросом:
 * WebSocket-событие может потеряться, и лоадер «зависнет» на карточке.
 */
watch(
    () => spisok.value.some((unit) => unitiStore.esliEstAktivniyProzes(unit)),
    (estAktivnie: boolean) => {
      if (estAktivnie) {
        unitiStore.startProzesPolling();
      } else {
        unitiStore.stopProzesPolling();
      }
    },
    {immediate: true},
);

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
    <UnitFilterBar
        :filters="nastroikiSpiska.filter"
        :projects="proekti.spisok"
        :counts="unitiStore.statusiSoSchetchikami"
        :total="spisok.length"
        :loading="loaderSpiskaUnitov"
        :last-updated-at="posledneeObnovlenie"
        :view-mode="rezhim"
        :show-view-mode="quasar.screen.gt.sm"
        :chips="unitiStore.aktivnieFiltri"
        :truncated-limit="unitiStore.obrezanSpisok ? nastroikiSpiska.limit : null"
        @change="obrabotatIzmenenieFiltrov"
        @submit="unitiStore.poluchitSpisokUnitov()"
        @remove-chip="udalitChip"
        @clear-filters="unitiStore.sbrozitFiltri()"
        @create="openAddForm"
        @update:view-mode="izmenitRezhim"
    />

    <q-linear-progress
        v-if="loaderSpiskaUnitov"
        indeterminate
        color="primary"
        class="q-mb-md"
    />

    <div v-if="oshibkaZagruzkiSpiska" class="unit-list__error" role="alert">
      <q-icon name="error_outline" size="20px" />
      <span class="unit-list__error-text">{{ $t('unit.spisok_unitov.list.error_title') }}</span>
      <q-btn
          flat
          dense
          no-caps
          color="primary"
          :label="$t('unit.spisok_unitov.list.retry')"
          @click="unitiStore.poluchitSpisokUnitov()"
      />
    </div>

    <template v-else-if="effektivniyRezhim === 'workspace'">
      <div class="unit-workspace">
        <UnitListPane
            :items="spisok"
            :selected-id="selectedUnitId"
            :empty-filtered="unitiStore.estAktivnieFiltri"
            @select="vybratUnit"
            @reset="unitiStore.sbrozitFiltri()"
        />
        <UnitDetailsPane :item="vibraniyUnit" />
      </div>
    </template>

    <template v-else>
      <div v-if="spisok.length === 0" class="unit-cards-grid__empty">
        <template v-if="unitiStore.estAktivnieFiltri">
          <span class="unit-cards-grid__empty-title">
            {{ $t('unit.spisok_unitov.list.empty_filtered') }}
          </span>
          <q-btn
              class="unit-cards-grid__empty-action"
              flat
              dense
              no-caps
              color="primary"
              icon="filter_alt_off"
              :label="$t('unit.spisok_unitov.filter.reset')"
              @click="unitiStore.sbrozitFiltri()"
          />
        </template>
        <template v-else>
          {{ $t('unit.spisok_unitov.list.empty_result') }}
        </template>
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

.unit-cards-grid__empty-title {
  display: block;
}

.unit-cards-grid__empty-action {
  margin-top: var(--app-space-2);
}

.unit-list__error {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--app-space-2);
  padding: var(--app-space-3);
  border: 1px solid color-mix(in srgb, var(--app-negative) 35%, transparent);
  border-radius: var(--app-radius-md);
  background: color-mix(in srgb, var(--app-negative) 8%, transparent);
  color: var(--app-negative);
}

.unit-list__error-text {
  flex: 1 1 auto;
  min-width: 0;
  font-size: var(--app-font-size-body);
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
