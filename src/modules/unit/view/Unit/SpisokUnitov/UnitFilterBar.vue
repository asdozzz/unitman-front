<script setup lang="ts">
import {computed, ref, watch} from "vue";
import {useI18n} from "vue-i18n";
import {useQuasar} from "quasar";
import type {
  UnitFilterChip,
  UnitFilterKey,
  UnitFilters,
  UnitFilterStatus as UnitFilterStatusTip,
  UnitSort,
} from "@/modules/unit/store/SpisokUnitov/model/UnitFilters";
import type {UnitListViewMode} from "@/modules/unit/store/SpisokUnitovViewStore";
import {convertDate} from "@/utils/dates";
import UnitFilterStatus from "@/modules/unit/view/Unit/SpisokUnitov/UnitFilterStatus.vue";
import UnitFilterChips from "@/modules/unit/view/Unit/SpisokUnitov/UnitFilterChips.vue";

const props = defineProps<{
  filters: UnitFilters;
  projects: {value: string; label: string}[];
  counts: Record<UnitFilterStatusTip, number>;
  total: number;
  loading: boolean;
  lastUpdatedAt: number | null;
  viewMode: UnitListViewMode;
  showViewMode: boolean;
  /** Чипсы активных фильтров — рендерятся в строке 2 после статусов. */
  chips: UnitFilterChip[];
  /** Лимит обрезанного списка; null — список не обрезан. */
  truncatedLimit: number | null;
}>();

const emit = defineEmits<{
  change: [payload: {filters: UnitFilters; immediate: boolean}];
  submit: [];
  create: [];
  removeChip: [chip: {key: UnitFilterKey; value?: string}];
  clearFilters: [];
  "update:viewMode": [mode: UnitListViewMode];
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
function skopirovatFiltri(patch: Partial<UnitFilters>): UnitFilters {
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

function izmenitProekt(projectId: string | null) {
  emit("change", {filters: skopirovatFiltri({projectId}), immediate: true});
}

function pereklyuchitTolkoMoi() {
  emit("change", {filters: skopirovatFiltri({onlyMine: !props.filters.onlyMine}), immediate: true});
}

function izmenitSort(sort: UnitSort) {
  emit("change", {filters: skopirovatFiltri({sort}), immediate: true});
}

function izmenitStatusi(statuses: UnitFilterStatusTip[]) {
  emit("change", {filters: skopirovatFiltri({statuses}), immediate: true});
}

function izmenitRezhim(rezhim: UnitListViewMode) {
  emit("update:viewMode", rezhim);
}

const SORTIROVKI: UnitSort[] = ["created_desc", "updated_desc", "name_asc", "status_priority"];

const sortOptions = computed<Array<{value: UnitSort; label: string}>>(() => {
  return SORTIROVKI.map((sort: UnitSort) => ({
    value: sort,
    label: t("unit.spisok_unitov.filter.sort." + sort),
  }));
});

/** Подпись текущей сортировки — для tooltip иконки-меню. */
const tekushayaSortirovka = computed<string>(() => {
  const option = sortOptions.value.find((item) => item.value === props.filters.sort);

  return option?.label ?? t("unit.spisok_unitov.filter.sort.label");
});

const projectOptions = computed<Array<{value: string | null; label: string}>>(() => {
  return [
    {value: null, label: t("unit.spisok_unitov.filter.all_projects")},
    ...props.projects,
  ];
});

const rezhimy = computed<Array<{value: UnitListViewMode; label: string; icon: string}>>(() => [
  {value: "cards", label: t("unit.spisok_unitov.view.cards"), icon: "grid_view"},
  {value: "workspace", label: t("unit.spisok_unitov.view.workspace"), icon: "view_sidebar"},
]);

/**
 * Счётчик юнитов с корректной плюральной формой.
 * Intl.PluralRules даёт форму для текущей локали (one/few/many/other),
 * а vue-i18n только подставляет число — без неоднозначных перегрузок t().
 */
const unitsCount = computed<string>(() => {
  const forma = new Intl.PluralRules(locale.value).select(props.total);

  return t(`unit.spisok_unitov.filter.units_count.${forma}`, {count: props.total});
});
</script>

<template>
  <div class="unit-filter" role="toolbar" :aria-label="$t('unit.spisok_unitov.filter.filters_button')">
    <!-- Строка 1: тулбар. На десктопе без переносов, на <1024px — горизонтальный скролл. -->
    <div class="unit-filter__row">
      <q-input
          class="unit-filter__search"
          dense
          borderless
          clearable
          hide-bottom-space
          :model-value="poisk"
          :placeholder="$t('unit.spisok_unitov.filter.search')"
          @update:model-value="izmenitPoisk"
      >
        <template #prepend>
          <q-icon name="search" size="18px" />
        </template>
      </q-input>

      <q-select
          class="unit-filter__select"
          dense
          borderless
          hide-bottom-space
          emit-value
          map-options
          options-dense
          popup-content-class="unit-filter__project-menu"
          :model-value="filters.projectId"
          :options="projectOptions"
          :aria-label="$t('unit.spisok_unitov.filter.project')"
          @update:model-value="izmenitProekt"
      />

      <button
          type="button"
          class="unit-filter__mine"
          :class="{'unit-filter__mine--active': filters.onlyMine}"
          :aria-pressed="filters.onlyMine ? 'true' : 'false'"
          @click="pereklyuchitTolkoMoi"
      >
        {{ $t('unit.spisok_unitov.filter.only_mine') }}
      </button>

      <q-btn
          class="unit-filter__sort"
          dense
          flat
          color="primary"
          icon="sort"
          :aria-label="tekushayaSortirovka"
      >
        <q-tooltip>{{ tekushayaSortirovka }}</q-tooltip>

        <q-menu anchor="bottom right" self="top right">
          <q-list dense class="unit-filter__sort-list">
            <q-item
                v-for="option in sortOptions"
                :key="option.value"
                clickable
                :active="filters.sort === option.value"
                active-class="unit-filter__sort-item--active"
                @click="izmenitSort(option.value)"
            >
              <q-item-section avatar class="unit-filter__sort-check">
                <q-icon v-if="filters.sort === option.value" name="check" size="18px" />
              </q-item-section>
              <q-item-section>{{ option.label }}</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>

      <span class="unit-filter__spacer" />

      <q-btn
          dense
          flat
          color="primary"
          icon="refresh"
          :loading="loading"
          :aria-label="$t('unit.spisok_unitov.buttons.refresh')"
          @click="emit('submit')"
      >
        <q-tooltip>{{ $t('unit.spisok_unitov.buttons.refresh') }}</q-tooltip>
      </q-btn>

      <span v-if="lastUpdatedAt !== null" class="unit-filter__updated">
        {{ $t('unit.spisok_unitov.filter.updated_at', {time: convertDate(lastUpdatedAt)}) }}
      </span>

      <div v-if="showViewMode" class="unit-filter__segmented" role="group">
        <button
            v-for="rezhim in rezhimy"
            :key="rezhim.value"
            type="button"
            class="unit-filter__segment"
            :class="{'unit-filter__segment--active': viewMode === rezhim.value}"
            :aria-pressed="viewMode === rezhim.value ? 'true' : 'false'"
            @click="izmenitRezhim(rezhim.value)"
        >
          <q-icon :name="rezhim.icon" size="16px" />
          <span class="unit-filter__segment-label">{{ rezhim.label }}</span>
        </button>
      </div>

      <q-btn
          class="unit-filter__add"
          dense
          no-caps
          unelevated
          color="primary"
          icon="add"
          :label="$t('unit.spisok_unitov.buttons.add')"
          @click="emit('create')"
      />
    </div>

    <!-- Строка 2: статусы + чипсы активных фильтров + счётчик/обрезание. -->
    <div class="unit-filter__bottom">
      <UnitFilterStatus
          v-if="statusiNaDesktope"
          class="unit-filter__statuses"
          :model-value="filters.statuses"
          :counts="counts"
          :total="total"
          @update:model-value="izmenitStatusi"
      />

      <q-btn
          v-else
          class="unit-filter__filters-btn"
          dense
          no-caps
          outline
          color="primary"
          icon="tune"
          :label="$t('unit.spisok_unitov.filter.filters_button')"
      >
        <q-badge v-if="filters.statuses.length > 0" color="primary" floating>
          {{ filters.statuses.length }}
        </q-badge>

        <q-menu anchor="bottom left" self="top left">
          <div class="unit-filter__menu">
            <UnitFilterStatus
                :model-value="filters.statuses"
                :counts="counts"
                :total="total"
                @update:model-value="izmenitStatusi"
            />
          </div>
        </q-menu>
      </q-btn>

      <UnitFilterChips
          v-if="chips.length > 0"
          :chips="chips"
          @remove="emit('removeChip', $event)"
          @clear="emit('clearFilters')"
      />

      <span class="unit-filter__spacer" />

      <span class="unit-filter__count text-tabular">{{ unitsCount }}</span>

      <span v-if="truncatedLimit !== null" class="unit-filter__truncated">
        {{ $t('unit.spisok_unitov.filter.truncated', {limit: truncatedLimit}) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.unit-filter {
  /* Единая высота всех контролов строки: поля, кнопки, чип, segmented. */
  --unit-control-height: 40px;

  display: flex;
  flex-direction: column;
  gap: var(--app-space-2);
  min-width: 0;
}

/* Строка 1: теперь без переносов; на узких экранах уходит в горизонтальный скролл. */
.unit-filter__row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: var(--app-space-2);
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.unit-filter__row::-webkit-scrollbar,
.unit-filter__bottom::-webkit-scrollbar {
  display: none;
}

.unit-filter__search {
  flex: 1 1 220px;
  min-width: 160px;
}

.unit-filter__select {
  flex: 0 0 160px;
  width: 160px;
  min-width: 150px;
}

/* Поля фильтра: заметная граница в покое, темнее на hover, primary на фокусе. */
.unit-filter__search :deep(.q-field__control),
.unit-filter__select :deep(.q-field__control) {
  height: var(--unit-control-height);
  min-height: var(--unit-control-height);
  padding: 0 var(--app-space-3);
  border: 1px solid var(--app-border);
  border-radius: 0;
  background: var(--app-surface-muted);
  transition:
      background-color var(--app-duration-fast) var(--app-easing),
      border-color var(--app-duration-fast) var(--app-easing);
}

.unit-filter__search :deep(.q-field__control:hover),
.unit-filter__select :deep(.q-field__control:hover) {
  border-color: var(--app-text-disabled);
}

.unit-filter__search :deep(.q-field--focused .q-field__control),
.unit-filter__select :deep(.q-field--focused .q-field__control) {
  border-color: var(--app-focus-ring);
  background: var(--app-surface);
}

.unit-filter__search :deep(.q-field__native),
.unit-filter__select :deep(.q-field__native) {
  min-height: 30px;
  color: var(--app-text);
}

/* Выбранное значение проекта не прилипает к левой границе поля. */
.unit-filter__select :deep(.q-field__native) {
  padding-left: var(--app-space-1);
}

.unit-filter__search :deep(.q-field__prepend),
.unit-filter__select :deep(.q-field__append) {
  padding: 0;
  color: var(--app-text-secondary);
}

/* «Только мои» — pill-чип с фиксированной геометрией, без прыгающей иконки. */
.unit-filter__mine {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  height: var(--unit-control-height);
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

.unit-filter__mine:hover {
  border-color: var(--app-border);
}

.unit-filter__mine--active {
  background: var(--app-primary);
  color: var(--app-primary-contrast);
}

.unit-filter__mine:focus-visible,
.unit-filter__segment:focus-visible {
  outline: 2px solid var(--app-focus-ring);
  outline-offset: 2px;
}

.unit-filter__sort {
  flex: 0 0 auto;
}

/* Primary-кнопка строки: та же высота, что у полей, и воздух вокруг подписи. */
.unit-filter .unit-filter__add {
  height: var(--unit-control-height);
  padding-inline: var(--app-space-4);
}

.unit-filter .unit-filter__add :deep(.q-btn__content) {
  gap: var(--app-space-1);
}

.unit-filter__sort-list {
  min-width: 220px;
}

.unit-filter__sort-check {
  min-width: 32px;
  padding-right: 0;
}

.unit-filter__sort-item--active {
  color: var(--app-primary);
  background: var(--app-surface-muted);
}

.unit-filter__spacer {
  flex: 1 1 0;
  min-width: var(--app-space-2);
}

.unit-filter__updated {
  color: var(--app-text-secondary);
  font-size: var(--app-font-size-caption);
  white-space: nowrap;
}

/* Segmented-переключатель вида: два сегмента в одной рамке. */
.unit-filter__segmented {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 2px;
  height: var(--unit-control-height);
  padding: 3px;
  border: 1px solid var(--app-border);
  border-radius: 0;
  background: var(--app-surface);
}

.unit-filter__segment {
  display: inline-flex;
  align-items: center;
  gap: var(--app-space-1);
  height: 100%;
  padding: 0 var(--app-space-3);
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--app-text-secondary);
  font-family: inherit;
  font-size: var(--app-font-size-caption);
  line-height: var(--app-line-height-tight);
  white-space: nowrap;
  cursor: pointer;
  transition:
      background-color var(--app-duration-fast) var(--app-easing),
      color var(--app-duration-fast) var(--app-easing);
}

.unit-filter__segment:hover {
  color: var(--app-text);
}

.unit-filter__segment--active {
  background: var(--app-surface-muted);
  color: var(--app-text);
}

/* Строка 2: статусы + чипсы + счётчик; отдельной строки для чипсов больше нет. */
.unit-filter__bottom {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: var(--app-space-2);
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.unit-filter__statuses {
  flex: 0 0 auto;
}

.unit-filter__filters-btn {
  flex: 0 0 auto;
}

.unit-filter__menu {
  padding: var(--app-space-2);
  max-width: 320px;
}

.unit-filter__count,
.unit-filter__truncated {
  color: var(--app-text-secondary);
  font-size: var(--app-font-size-caption);
  white-space: nowrap;
}

@media (max-width: 1023.98px) {
  .unit-filter__bottom {
    flex-wrap: wrap;
    overflow-x: visible;
  }
}
</style>

<!-- Меню селекта рендерится в портале, поэтому scoped-стили до него не достают. -->
<style>
.unit-filter__project-menu .q-item {
  padding-right: var(--app-space-4);
  padding-left: var(--app-space-4);
}

.unit-filter__project-menu .q-item__section--main {
  min-width: 0;
}
</style>
