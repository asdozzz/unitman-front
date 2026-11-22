<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useQuasar } from "quasar";
import { useRoute, useRouter } from "vue-router";
import { useSpisokUnitovStore } from "@/modules/unit/store/SpisokUnitovStore";
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
import FormaSozdaniyaSessiiUnita from "@/modules/opencode/view/FormaSozdaniyaSessiiUnita.vue";
import { useFormaDobavleniyaUnitaStore } from "@/modules/unit/store/SpisokUnitov/FormaDobavleniyaUnitaStore";
import { useFormaZapolneniyaPeremenihUnitaStore } from "@/modules/unit/store/SpisokUnitov/FormaZapolneniyaPeremenihUnitStore";
import { storFormiDeistviyUnita } from "@/modules/unit/store/SpisokUnitov/StorFormiDeistviy";
import { ModelForChannelSpisokUnitov } from "@/modules/unit/model/websocket/ModelForChannelSpisokUnitov";
import { podpisatsyaNaSobitiyaUnitov } from "@/modules/unit/model/websocket/PodpiskaNaSobitiyaUnitov";
import { useStorSpiskaRekvizitovOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/StorSpiskaRekvizitovOpenCode";
import {
  DEFAULT_UNIT_FILTERS,
  type UnitFilterKey,
  type UnitFilters,
} from "@/modules/unit/store/SpisokUnitov/model/UnitFilters";
import {
  prochitatFiltriIzQuery,
  serializovatFiltriVQuery,
} from "@/modules/unit/utils/unitFiltersUrl";
import {
  GhBanner,
  GhBox,
  GhButton,
  GhDialog,
  GhEmptyState,
  GhKbd,
  GhPageHeader,
  GhSkeleton,
} from "@/components/ui";
import { ozhidaetsyaVtorayaKlavishaPosledovatelnosti } from "@/utils/useHotkeys";

const unitiStore = useSpisokUnitovStore();
const {
  spisok,
  oshibkaZagruzkiSpiska,
  nastroikiSpiska,
  proekti,
  loaderSpiskaUnitov,
} = storeToRefs(unitiStore);

const viewStore = useSpisokUnitovViewStore();
const { rezhim, selectedUnitId } = storeToRefs(viewStore);

const addFormStore = useFormaDobavleniyaUnitaStore();
const { enable: enableAddForm } = storeToRefs(addFormStore);

const konfigFormStore = useFormaZapolneniyaPeremenihUnitaStore();
const { enable: enableKonfigForm } = storeToRefs(konfigFormStore);

const storFormiDeistviy = storFormiDeistviyUnita();
const { enable: enableFormiDeistviya } = storeToRefs(storFormiDeistviy);

const route = useRoute();
const router = useRouter();
const storRekvizitov = useStorSpiskaRekvizitovOpenCode();
const quasar = useQuasar();

/** Ссылка на тулбар: нужна для хоткея `/` и фокуса в поиск. */
const filterBar = ref<InstanceType<typeof UnitFilterBar> | null>(null);

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

/** Показываем скелетоны только на первичной загрузке, без мигания при обновлении. */
const pokazatSkeletony = computed<boolean>(
  () => loaderSpiskaUnitov.value && spisok.value.length === 0,
);

function izmenitRezhim(noviyRezhim: UnitListViewMode) {
  viewStore.setRezhim(noviyRezhim);

  if (noviyRezhim === "workspace") {
    viewStore.sinhronizovatVibor(spisok.value.map((unit) => unit.id));
  }
}

function vybratUnit(unitId: string) {
  viewStore.vybratUnit(unitId);
}

/** После создания сессии из карточки юнита открываем её в новом окне. */
function pereytiVSessiyu(id: string) {
  const url = router.resolve({
    name: "opencode_unit_session_chat",
    params: { id },
  }).href;

  window.open(url, "_blank", "noopener,noreferrer");
}

function openAddForm() {
  addFormStore.otkritFormu();
}

/** Обновление списка: не дёргаем стор, пока идёт загрузка. */
function obnovitSpisok() {
  if (loaderSpiskaUnitov.value) {
    return;
  }

  void unitiStore.poluchitSpisokUnitov();
}

/**
 * Обработчик `change` от тулбара: фильтр уже собран компонентом, страница лишь
 * записывает его и решает, нужен ли debounce (он живёт в сторе).
 */
function obrabotatIzmenenieFiltrov(payload: { filters: UnitFilters; immediate: boolean }) {
  nastroikiSpiska.value.filter = payload.filters;
  unitiStore.sohranitNastroiki();

  if (payload.immediate) {
    unitiStore.zaprositSpisokUnitov();
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
function udalitChip(chip: { key: UnitFilterKey; value?: string }) {
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
      void unitiStore.primenitFiltri({ unitId: null });
      return;
    case "search":
      void unitiStore.primenitFiltri({ search: DEFAULT_UNIT_FILTERS.search });
      return;
    case "name":
      void unitiStore.primenitFiltri({ name: DEFAULT_UNIT_FILTERS.name });
      return;
    case "branch":
      void unitiStore.primenitFiltri({ branch: DEFAULT_UNIT_FILTERS.branch });
      return;
    case "projectId":
      void unitiStore.primenitFiltri({ projectId: DEFAULT_UNIT_FILTERS.projectId });
      return;
    case "onlyMine":
      void unitiStore.primenitFiltri({ onlyMine: DEFAULT_UNIT_FILTERS.onlyMine });
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

    void router.replace({ query: serializovannie });
  },
  { deep: true },
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
  window.addEventListener("keydown", obrabotatKlavishu);
});

onUnmounted(() => {
  otpisatsyaOtSobitiy?.();
  otpisatsyaOtSobitiy = null;
  unitiStore.stopProzesPolling();
  window.removeEventListener("keydown", obrabotatKlavishu);
});

function handleWebsocketEvent(event: ModelForChannelSpisokUnitov) {
  console.log(event.eventType, event);
  switch (event.eventType) {
    case "OBNOVLEN":
    case "OBNOVLENA_STATA":
      if (unitiStore.issetUnit(event.id)) {
        unitiStore.obnovitUnit(event.id);
      }
      break;
    case "UDALEN":
      unitiStore.udalitUnitIzSpiska(event.id);
      break;
    case "SOZDAN":
      unitiStore.poluchitSpisokUnitov();
      break;
  }
}

/** Селекторы, внутри которых страничные хоткеи не перехватываются. */
function ignorirovatVvod(event: KeyboardEvent): boolean {
  const cel = event.target;

  if (!(cel instanceof HTMLElement)) {
    return false;
  }

  if (cel.isContentEditable) {
    return true;
  }

  return (
    cel.closest(
      'input, textarea, select, [contenteditable], [role="textbox"], [role="dialog"], .q-dialog, .q-menu',
    ) !== null
  );
}

/**
 * Страничные хоткеи: `/` — поиск, `c` — создать, `R` — обновить.
 * Регистрируется раньше глобального `useHotkeys`, поэтому `/` переводит
 * фокус в фильтр страницы, а не в поиск хедера.
 */
function obrabotatKlavishu(event: KeyboardEvent): void {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    ignorirovatVvod(event)
  ) {
    return;
  }

  // `g` уже нажата и глобальный `useHotkeys` ожидает вторую клавишу.
  if (ozhidaetsyaVtorayaKlavishaPosledovatelnosti()) {
    return;
  }

  if (event.key === "r" || event.key === "R") {
    event.preventDefault();
    obnovitSpisok();
    return;
  }

  if (event.key === "/" && filterBar.value?.focusPoisk()) {
    event.preventDefault();
    return;
  }

  if ((event.key === "c" || event.key === "C") && !enableAddForm.value) {
    event.preventDefault();
    openAddForm();
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
  { immediate: true },
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
  <div class="unit-page primer">
    <GhPageHeader
      :title="$t('unit.spisok_unitov.page.title')"
      :description="$t('unit.spisok_unitov.page.description')"
      :counter="spisok.length"
    >
      <template #actions>
        <GhButton
          icon="sync"
          :loading="loaderSpiskaUnitov"
          :disabled="loaderSpiskaUnitov"
          :label="$t('unit.spisok_unitov.buttons.refresh')"
          @click="obnovitSpisok"
        >
          <q-tooltip>
            {{ $t("unit.spisok_unitov.page.refresh_hint") }}
            <GhKbd>R</GhKbd>
          </q-tooltip>
        </GhButton>

        <GhButton
          variant="primary"
          icon="plus"
          :label="$t('unit.spisok_unitov.buttons.add')"
          @click="openAddForm"
        >
          <q-tooltip>
            {{ $t("unit.spisok_unitov.page.create_hint") }}
            <GhKbd>c</GhKbd>
          </q-tooltip>
        </GhButton>
      </template>
    </GhPageHeader>

    <UnitFilterBar
      ref="filterBar"
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

    <GhBanner
      v-if="oshibkaZagruzkiSpiska"
      variant="danger"
      :title="$t('unit.spisok_unitov.list.error_title')"
      class="unit-page__error"
    >
      <p class="unit-page__error-text">
        {{ $t("unit.spisok_unitov.page.error_description") }}
      </p>

      <template #actions>
        <GhButton
          size="sm"
          icon="sync"
          :label="$t('unit.spisok_unitov.list.retry')"
          @click="obnovitSpisok"
        />
      </template>
    </GhBanner>

    <template v-else>
      <div
        v-if="pokazatSkeletony"
        class="unit-cards-grid"
        aria-busy="true"
      >
        <GhBox
          v-for="n in 6"
          :key="`unit-skeleton-${n}`"
          padding="none"
          class="unit-card-skeleton"
        >
          <div class="unit-card-skeleton__body" aria-hidden="true">
            <GhSkeleton variant="text" width="55%" height="16" />
            <GhSkeleton variant="text" width="35%" height="12" />
            <GhSkeleton variant="rect" width="100%" height="32" />
            <GhSkeleton variant="text" width="80%" height="12" />
          </div>
        </GhBox>
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
        <GhEmptyState
          v-if="spisok.length === 0"
          :icon="unitiStore.estAktivnieFiltri ? 'search' : 'rocket'"
          :title="
            unitiStore.estAktivnieFiltri
              ? $t('unit.spisok_unitov.list.empty_filtered')
              : $t('unit.spisok_unitov.list.empty_result')
          "
          :description="$t('unit.spisok_unitov.page.empty_description')"
        >
          <template #actions>
            <GhButton
              v-if="unitiStore.estAktivnieFiltri"
              icon="filter"
              :label="$t('unit.spisok_unitov.filter.reset')"
              @click="unitiStore.sbrozitFiltri()"
            />
            <GhButton
              v-else
              variant="primary"
              icon="plus"
              :label="$t('unit.spisok_unitov.buttons.add')"
              @click="openAddForm"
            />
          </template>
        </GhEmptyState>

        <div v-else class="unit-cards-grid">
          <UnitCard
            v-for="item in spisok"
            :key="'unit_card' + item.id"
            :item="item"
          />
        </div>
      </template>
    </template>

    <GhDialog
      v-model="enableAddForm"
      persistent
      width="700px"
      :title="$t('unit.form_add_unit.caption')"
    >
      <FormaSozdaniyaUnita @formaBilaOtpravlena="unitiStore.poluchitSpisokUnitov()" />
    </GhDialog>

    <GhDialog
      v-model="enableKonfigForm"
      persistent
      width="700px"
      :title="$t('unit.form_fill_variables.caption')"
    >
      <FormaZapolneniyaPeremenihUnita @formaBilaOtpravlena="unitiStore.poluchitSpisokUnitov()" />
    </GhDialog>

    <GhDialog
      v-model="enableFormiDeistviya"
      persistent
      width="700px"
      :title="$t('unit.form_actions.caption')"
    >
      <FormaDeistviyUnita @formaBilaOtpravlena="unitiStore.poluchitSpisokUnitov()" />
    </GhDialog>

    <!-- Диалог создания сессии общий с модулем OpenCode: карточка юнита
         только открывает его с предвыбранным юнитом. -->
    <FormaSozdaniyaSessiiUnita @sozdana="pereytiVSessiyu" />
  </div>
</template>

<style scoped>
.unit-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.unit-page__error-text {
  margin: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.unit-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
  align-items: start;
  gap: 16px;
}

.unit-card-skeleton__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.unit-workspace {
  display: grid;
  grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
  align-items: start;
  gap: 16px;
}

@media (max-width: 1023.98px) {
  .unit-workspace {
    grid-template-columns: 1fr;
  }
}
</style>
