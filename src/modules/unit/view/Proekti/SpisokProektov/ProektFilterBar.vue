<script setup lang="ts">
import {computed, ref, watch} from "vue";
import {useI18n} from "vue-i18n";
import {useQuasar} from "quasar";
import type {
  ProektFilterChip,
  ProektFilterKey,
  ProektFilterStatus,
  ProektFiltri,
  ProektSort,
} from "@/modules/unit/store/SpisokProektov/model/ProektFiltri";
import {convertDate} from "@/utils/dates";
import ProektFilterStatusComponent from "@/modules/unit/view/Proekti/SpisokProektov/ProektFilterStatus.vue";
import ProektFilterChips from "@/modules/unit/view/Proekti/SpisokProektov/ProektFilterChips.vue";

const props = defineProps<{
  filters: ProektFiltri;
  counts: Record<ProektFilterStatus, number>;
  /** Всего проектов в выборке — используется счётчиками состояний. */
  total: number;
  /** Сколько проектов видно после клиентских фильтров — для подписи справа. */
  visibleTotal: number;
  loading: boolean;
  lastUpdatedAt: number | null;
  /** Чипы активных фильтров — рендерятся в строке 2 после статусов. */
  chips: ProektFilterChip[];
  /** Лимит обрезанного списка; null — список не обрезан. */
  truncatedLimit: number | null;
}>();

const emit = defineEmits<{
  change: [payload: {filters: ProektFiltri; immediate: boolean}];
  submit: [];
  create: [];
  removeChip: [chip: {key: ProektFilterKey; value?: string}];
  clearFilters: [];
}>();

const {t, locale} = useI18n();
const quasar = useQuasar();

/**
 * Статусы рендерятся отдельной строкой только на десктопе (>= 1024px).
 * На узких экранах они прячутся в меню кнопки «Фильтры».
 */
const statusiNaDesktope = computed<boolean>(() => quasar.screen.gt.sm);

/** Локальное значение поиска: props не мутируем, наружу уходит копия. */
const poisk = ref<string>(props.filters.search ?? "");

watch(
    () => props.filters.search,
    (znachenie: string | null) => {
      if ((znachenie ?? "") !== poisk.value) {
        poisk.value = znachenie ?? "";
      }
    },
);

/** Копия фильтров с патчем — компонент никогда не меняет props. */
function skopirovatFiltri(patch: Partial<ProektFiltri>): ProektFiltri {
  return {...props.filters, ...patch};
}

/** Текстовый поиск: страница сама решает, когда применить debounce. */
function izmenitPoisk(znachenie: string | number | null) {
  const tekst = znachenie === null || znachenie === undefined ? "" : String(znachenie);
  poisk.value = tekst;

  emit("change", {
    filters: skopirovatFiltri({search: tekst.trim() === "" ? null : tekst}),
    immediate: false,
  });
}

function pereklyuchitTolkoAktivnie() {
  emit("change", {filters: skopirovatFiltri({onlyActive: !props.filters.onlyActive}), immediate: true});
}

function izmenitSort(sort: ProektSort) {
  emit("change", {filters: skopirovatFiltri({sort}), immediate: true});
}

function izmenitStatusi(states: ProektFilterStatus[]) {
  emit("change", {filters: skopirovatFiltri({states}), immediate: true});
}

const SORTIROVKI: ProektSort[] = ["name_asc", "code_asc", "state_priority"];

const sortOptions = computed<Array<{value: ProektSort; label: string}>>(() => {
  return SORTIROVKI.map((sort: ProektSort) => ({
    value: sort,
    label: t("unit.spisok_proektov.filter.sort." + sort),
  }));
});

/** Подпись текущей сортировки — для tooltip иконки-меню. */
const tekushayaSortirovka = computed<string>(() => {
  const option = sortOptions.value.find((item) => item.value === props.filters.sort);

  return option?.label ?? t("unit.spisok_proektov.filter.sort.label");
});

/**
 * Счётчик проектов с корректной плюральной формой.
 * Intl.PluralRules даёт форму для текущей локали (one/few/many/other),
 * а vue-i18n только подставляет число — без неоднозначных перегрузок t().
 */
const proektiCount = computed<string>(() => {
  const forma = new Intl.PluralRules(locale.value).select(props.visibleTotal);

  return t(`unit.spisok_proektov.filter.projects_count.${forma}`, {count: props.visibleTotal});
});
</script>

<template>
  <div class="proekt-filter" role="toolbar" :aria-label="$t('unit.spisok_proektov.filter.filters_button')">
    <!-- Строка 1: тулбар. На десктопе без переносов, на <1024px — горизонтальный скролл. -->
    <div class="proekt-filter__row">
      <q-input
          class="proekt-filter__search"
          dense
          borderless
          clearable
          hide-bottom-space
          :model-value="poisk"
          :placeholder="$t('unit.spisok_proektov.filter.search')"
          @update:model-value="izmenitPoisk"
      >
        <template #prepend>
          <q-icon name="search" size="18px" />
        </template>
      </q-input>

      <button
          type="button"
          class="proekt-filter__mine"
          :class="{'proekt-filter__mine--active': filters.onlyActive}"
          :aria-pressed="filters.onlyActive ? 'true' : 'false'"
          @click="pereklyuchitTolkoAktivnie"
      >
        {{ $t('unit.spisok_proektov.filter.only_active') }}
      </button>

      <q-btn
          class="proekt-filter__sort"
          dense
          flat
          color="primary"
          icon="sort"
          :aria-label="tekushayaSortirovka"
      >
        <q-tooltip>{{ tekushayaSortirovka }}</q-tooltip>

        <q-menu anchor="bottom right" self="top right">
          <q-list dense class="proekt-filter__sort-list">
            <q-item
                v-for="option in sortOptions"
                :key="option.value"
                clickable
                :active="filters.sort === option.value"
                active-class="proekt-filter__sort-item--active"
                @click="izmenitSort(option.value)"
            >
              <q-item-section avatar class="proekt-filter__sort-check">
                <q-icon v-if="filters.sort === option.value" name="check" size="18px" />
              </q-item-section>
              <q-item-section>{{ option.label }}</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>

      <span class="proekt-filter__spacer" />

      <q-btn
          dense
          flat
          color="primary"
          icon="refresh"
          :loading="loading"
          :aria-label="$t('unit.spisok_proektov.filter.refresh')"
          @click="emit('submit')"
      >
        <q-tooltip>{{ $t('unit.spisok_proektov.filter.refresh') }}</q-tooltip>
      </q-btn>

      <span v-if="lastUpdatedAt !== null" class="proekt-filter__updated">
        {{ $t('unit.spisok_proektov.filter.updated_at', {time: convertDate(lastUpdatedAt)}) }}
      </span>

      <q-btn
          class="proekt-filter__add"
          dense
          no-caps
          unelevated
          color="primary"
          icon="add"
          :label="$t('unit.spisok_proektov.buttons.add')"
          @click="emit('create')"
      />
    </div>

    <!-- Строка 2: статусы + чипы активных фильтров + счётчик/обрезание. -->
    <div class="proekt-filter__bottom">
      <ProektFilterStatusComponent
          v-if="statusiNaDesktope"
          class="proekt-filter__statuses"
          :model-value="filters.states"
          :counts="counts"
          :total="total"
          @update:model-value="izmenitStatusi"
      />

      <q-btn
          v-else
          class="proekt-filter__filters-btn"
          dense
          no-caps
          outline
          color="primary"
          icon="tune"
          :label="$t('unit.spisok_proektov.filter.filters_button')"
      >
        <q-badge v-if="filters.states.length > 0" color="primary" floating>
          {{ filters.states.length }}
        </q-badge>

        <q-menu anchor="bottom left" self="top left">
          <div class="proekt-filter__menu">
            <ProektFilterStatusComponent
                :model-value="filters.states"
                :counts="counts"
                :total="total"
                @update:model-value="izmenitStatusi"
            />
          </div>
        </q-menu>
      </q-btn>

      <ProektFilterChips
          v-if="chips.length > 0"
          :chips="chips"
          @remove="emit('removeChip', $event)"
          @clear="emit('clearFilters')"
      />

      <span class="proekt-filter__spacer" />

      <span class="proekt-filter__count text-tabular">{{ proektiCount }}</span>

      <span v-if="truncatedLimit !== null" class="proekt-filter__truncated">
        {{ $t('unit.spisok_proektov.filter.truncated', {limit: truncatedLimit}) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.proekt-filter {
  /* Единая высота всех контролов строки: поля, кнопки, чип. */
  --proekt-control-height: 40px;

  display: flex;
  flex-direction: column;
  gap: var(--app-space-2);
  min-width: 0;
}

/* Строка 1: без переносов; на узких экранах уходит в горизонтальный скролл. */
.proekt-filter__row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: var(--app-space-2);
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.proekt-filter__row::-webkit-scrollbar,
.proekt-filter__bottom::-webkit-scrollbar {
  display: none;
}

.proekt-filter__search {
  flex: 1 1 220px;
  min-width: 160px;
}

/* Поля фильтра: заметная граница в покое, темнее на hover, primary на фокусе. */
.proekt-filter__search :deep(.q-field__control) {
  height: var(--proekt-control-height);
  min-height: var(--proekt-control-height);
  padding: 0 var(--app-space-3);
  border: 1px solid var(--app-border);
  border-radius: 0;
  background: var(--app-surface-muted);
  transition:
      background-color var(--app-duration-fast) var(--app-easing),
      border-color var(--app-duration-fast) var(--app-easing);
}

.proekt-filter__search :deep(.q-field__control:hover) {
  border-color: var(--app-text-disabled);
}

.proekt-filter__search :deep(.q-field--focused .q-field__control) {
  border-color: var(--app-focus-ring);
  background: var(--app-surface);
}

.proekt-filter__search :deep(.q-field__native) {
  min-height: 30px;
  color: var(--app-text);
}

.proekt-filter__search :deep(.q-field__prepend) {
  padding: 0;
  color: var(--app-text-secondary);
}

/* Pill-чип «Только активные» с фиксированной геометрией. */
.proekt-filter__mine {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  height: var(--proekt-control-height);
  padding: 0 var(--app-space-4);
  border: 1px solid transparent;
  border-radius: 0;
  background: var(--app-surface-muted);
  color: var(--app-text-secondary);
  font-family: inherit;
  font-size: var(--app-font-size-body);
  font-weight: 500;
  line-height: var(--app-line-height-tight);
  white-space: nowrap;
  cursor: pointer;
  transition:
      background-color var(--app-duration-fast) var(--app-easing),
      color var(--app-duration-fast) var(--app-easing);
}

.proekt-filter__mine:hover {
  border-color: var(--app-border);
}

.proekt-filter__mine--active {
  background: var(--app-primary);
  color: var(--app-primary-contrast);
}

.proekt-filter__mine:focus-visible {
  outline: 2px solid var(--app-focus-ring);
  outline-offset: 2px;
}

.proekt-filter__sort {
  flex: 0 0 auto;
}

/* Primary-кнопка строки: та же высота, что у поля, и воздух вокруг подписи. */
.proekt-filter .proekt-filter__add {
  height: var(--proekt-control-height);
  padding-inline: var(--app-space-4);
}

.proekt-filter .proekt-filter__add :deep(.q-btn__content) {
  gap: var(--app-space-1);
}

.proekt-filter__sort-list {
  min-width: 220px;
}

.proekt-filter__sort-check {
  min-width: 32px;
  padding-right: 0;
}

.proekt-filter__sort-item--active {
  color: var(--app-primary);
  background: var(--app-surface-muted);
}

.proekt-filter__spacer {
  flex: 1 1 0;
  min-width: var(--app-space-2);
}

.proekt-filter__updated {
  color: var(--app-text-secondary);
  font-size: var(--app-font-size-caption);
  white-space: nowrap;
}

/* Строка 2: статусы + чипы + счётчик. */
.proekt-filter__bottom {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: var(--app-space-2);
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.proekt-filter__statuses {
  flex: 0 0 auto;
}

.proekt-filter__filters-btn {
  flex: 0 0 auto;
}

.proekt-filter__menu {
  padding: var(--app-space-2);
  max-width: 320px;
}

.proekt-filter__count,
.proekt-filter__truncated {
  color: var(--app-text-secondary);
  font-size: var(--app-font-size-caption);
  white-space: nowrap;
}

@media (max-width: 1023.98px) {
  .proekt-filter__bottom {
    flex-wrap: wrap;
    overflow-x: visible;
  }
}
</style>
