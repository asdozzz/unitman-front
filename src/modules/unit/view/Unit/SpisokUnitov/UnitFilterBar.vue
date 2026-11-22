<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useQuasar } from "quasar";
import type {
  UnitFilterChip,
  UnitFilterKey,
  UnitFilters,
  UnitFilterStatus as UnitFilterStatusTip,
  UnitSort,
} from "@/modules/unit/store/SpisokUnitov/model/UnitFilters";
import type { UnitListViewMode } from "@/modules/unit/store/SpisokUnitovViewStore";
import { convertDate } from "@/utils/dates";
import {
  GhButton,
  GhCounter,
  GhInput,
  GhSegmentedControl,
  GhSelect,
  GhSwitch,
} from "@/components/ui";
import type { GhSegmentedOption, GhSelectOption } from "@/components/ui";
import UnitFilterStatus from "@/modules/unit/view/Unit/SpisokUnitov/UnitFilterStatus.vue";
import UnitFilterChips from "@/modules/unit/view/Unit/SpisokUnitov/UnitFilterChips.vue";

const props = defineProps<{
  filters: UnitFilters;
  projects: { value: string; label: string }[];
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
  change: [payload: { filters: UnitFilters; immediate: boolean }];
  submit: [];
  create: [];
  removeChip: [chip: { key: UnitFilterKey; value?: string }];
  clearFilters: [];
  "update:viewMode": [mode: UnitListViewMode];
}>();

const { t, locale } = useI18n();
const quasar = useQuasar();

/**
 * Статусы рендерятся отдельной строкой только на десктопе (>= 1024px).
 * На узких экранах они прячутся в меню кнопки «Фильтры».
 */
const statusiNaDesktope = computed<boolean>(() => quasar.screen.gt.sm);

/** Локальное значение поиска: props не мутируем, наружу уходит копия. */
const poisk = ref<string>(props.filters.search ?? "");

/** Контейнер поля поиска — на него переводит фокус хоткей `/`. */
const konteynerPoiska = ref<HTMLElement | null>(null);

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
  return { ...props.filters, ...patch };
}

/** Текстовый поиск: страница сама решает, когда применить debounce. */
function izmenitPoisk(znachenie: string | number | null) {
  const tekst = znachenie === null || znachenie === undefined ? "" : String(znachenie);
  poisk.value = tekst;

  emit("change", {
    filters: skopirovatFiltri({ search: tekst.trim() === "" ? null : tekst }),
    immediate: false,
  });
}

function izmenitProekt(projectId: string | number | null) {
  const znachenie = projectId === null ? null : String(projectId);
  emit("change", { filters: skopirovatFiltri({ projectId: znachenie }), immediate: true });
}

function pereklyuchitTolkoMoi(znachenie: boolean) {
  emit("change", {
    filters: skopirovatFiltri({ onlyMine: znachenie }),
    immediate: true,
  });
}

function izmenitSort(znachenie: string | number | null) {
  if (typeof znachenie !== "string") {
    return;
  }

  emit("change", { filters: skopirovatFiltri({ sort: znachenie as UnitSort }), immediate: true });
}

function izmenitStatusi(statuses: UnitFilterStatusTip[]) {
  emit("change", { filters: skopirovatFiltri({ statuses }), immediate: true });
}

function izmenitRezhim(rezhim: UnitListViewMode) {
  emit("update:viewMode", rezhim);
}

/** GhSegmentedControl отдаёт строку — приводим к режиму списка. */
function obrabotatRezhim(znachenie: string) {
  izmenitRezhim(znachenie as UnitListViewMode);
}

const SORTIROVKI: UnitSort[] = ["created_desc", "updated_desc", "name_asc", "status_priority"];

/** Пункты выпадающего селекта сортировки. */
const sortOptions = computed<GhSelectOption[]>(() =>
  SORTIROVKI.map((sort: UnitSort) => ({
    value: sort,
    label: t("unit.spisok_unitov.filter.sort." + sort),
  })),
);

/** Подпись текущей сортировки — для placeholder и доступного имени селекта. */
const tekushayaSortirovka = computed<string>(() => {
  return t("unit.spisok_unitov.filter.sort." + props.filters.sort);
});

const projectOptions = computed<Array<{ value: string | null; label: string }>>(() => {
  return [
    { value: null, label: t("unit.spisok_unitov.filter.all_projects") },
    ...props.projects,
  ];
});

const rezhimy = computed<GhSegmentedOption[]>(() => [
  { value: "cards", label: t("unit.spisok_unitov.view.cards"), icon: "rows" },
  { value: "workspace", label: t("unit.spisok_unitov.view.workspace"), icon: "columns" },
]);

/**
 * Счётчик юнитов с корректной плюральной формой.
 * Intl.PluralRules даёт форму для текущей локали (one/few/many/other),
 * а vue-i18n только подставляет число — без неоднозначных перегрузок t().
 */
const unitsCount = computed<string>(() => {
  const forma = new Intl.PluralRules(locale.value).select(props.total);

  return t(`unit.spisok_unitov.filter.units_count.${forma}`, { count: props.total });
});

/** Переводит фокус в поле поиска. `false`, если поля нет. */
function focusPoisk(): boolean {
  const pole = konteynerPoiska.value?.querySelector<HTMLInputElement>("input");

  if (!pole) {
    return false;
  }

  pole.focus();
  pole.select();

  return true;
}

defineExpose({ focusPoisk });
</script>

<template>
  <div
    class="unit-filter primer"
    role="toolbar"
    :aria-label="$t('unit.spisok_unitov.filter.filters_button')"
  >
    <!-- Строка 1: тулбар с переносом контролов на узких экранах (375px, F3). -->
    <div class="unit-filter__row">
      <div ref="konteynerPoiska" class="unit-filter__search">
        <GhInput
          size="sm"
          icon="search"
          clearable
          :model-value="poisk"
          :placeholder="$t('unit.spisok_unitov.filter.search')"
          :aria-label="$t('unit.spisok_unitov.filter.search')"
          @update:model-value="izmenitPoisk"
        />
      </div>

      <div class="unit-filter__select">
        <GhSelect
          size="sm"
          :model-value="filters.projectId"
          :options="projectOptions"
          :placeholder="$t('unit.spisok_unitov.filter.project')"
          :aria-label="$t('unit.spisok_unitov.filter.project')"
          @update:model-value="izmenitProekt"
        />
      </div>

      <GhSwitch
        :model-value="filters.onlyMine"
        :label="$t('unit.spisok_unitov.filter.only_mine')"
        @update:model-value="pereklyuchitTolkoMoi"
      />

      <div class="unit-filter__sort">
        <GhSelect
          size="sm"
          :model-value="filters.sort"
          :options="sortOptions"
          :placeholder="tekushayaSortirovka"
          :aria-label="tekushayaSortirovka"
          @update:model-value="izmenitSort"
        />
      </div>

      <span class="unit-filter__spacer" />

      <span v-if="lastUpdatedAt !== null" class="unit-filter__updated">
        {{ $t("unit.spisok_unitov.filter.updated_at", { time: convertDate(lastUpdatedAt) }) }}
      </span>

      <GhSegmentedControl
        v-if="showViewMode"
        size="sm"
        :model-value="viewMode"
        :options="rezhimy"
        :aria-label="$t('unit.spisok_unitov.view.cards')"
        @update:model-value="obrabotatRezhim"
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

      <GhButton
        v-else
        size="sm"
        icon="filter"
        :label="$t('unit.spisok_unitov.filter.filters_button')"
      >
        <GhCounter
          v-if="filters.statuses.length > 0"
          :value="filters.statuses.length"
          variant="accent"
        />

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
      </GhButton>

      <UnitFilterChips
        v-if="chips.length > 0"
        :chips="chips"
        @remove="emit('removeChip', $event)"
        @clear="emit('clearFilters')"
      />

      <span class="unit-filter__spacer" />

      <span class="unit-filter__count text-tabular">{{ unitsCount }}</span>

      <span v-if="truncatedLimit !== null" class="unit-filter__truncated">
        {{ $t("unit.spisok_unitov.filter.truncated", { limit: truncatedLimit }) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.unit-filter {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

/* Строка 1: контролы переносятся, не выходя за контейнер по горизонтали (F3). */
.unit-filter__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.unit-filter__row::-webkit-scrollbar,
.unit-filter__bottom::-webkit-scrollbar {
  display: none;
}

.unit-filter__search {
  flex: 1 1 220px;
  min-width: 160px;
}

/*
 * F4: тумблер «Только мои» в kit рассчитан на 32px. В фильтр-баре все
 * контролы size="sm" (28px), поэтому локально выравниваем его по строке.
 */
.unit-filter__row :deep(.gh-switch) {
  min-height: var(--control-height-sm);
}

.unit-filter__select {
  flex: 0 1 auto;
  min-width: 160px;
  max-width: 240px;
}

.unit-filter__sort {
  flex: 0 1 auto;
  min-width: 160px;
  max-width: 240px;
}

.unit-filter__spacer {
  flex: 1 1 0;
  min-width: 8px;
}

.unit-filter__updated {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  white-space: nowrap;
}

/* Строка 2: статусы + чипсы + счётчик. */
.unit-filter__bottom {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.unit-filter__statuses {
  flex: 0 0 auto;
}

.unit-filter__menu {
  max-width: 320px;
  padding: 8px;
}

.unit-filter__count,
.unit-filter__truncated {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  white-space: nowrap;
}

@media (max-width: 1023.98px) {
  .unit-filter__bottom {
    flex-wrap: wrap;
    overflow-x: visible;
  }
}
</style>
