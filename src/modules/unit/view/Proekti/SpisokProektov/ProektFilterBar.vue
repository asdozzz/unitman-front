<script setup lang="ts">
import {computed, ref, watch} from "vue";
import {useI18n} from "vue-i18n";
import {
  GhCheckbox,
  GhInput,
  GhSelect,
} from "@/components/ui";
import type {GhSelectOption} from "@/components/ui";
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

/** id нативного поиска: на него опирается хоткей `/` страницы. */
const IDENTIFIKATOR_POISKA = "proekt-filter-search";

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

function pereklyuchitTolkoAktivnie(znachenie: boolean) {
  emit("change", {filters: skopirovatFiltri({onlyActive: znachenie}), immediate: true});
}

function izmenitSort(znachenie: string | number | null) {
  if (typeof znachenie !== "string") {
    return;
  }

  emit("change", {filters: skopirovatFiltri({sort: znachenie as ProektSort}), immediate: true});
}

function izmenitStatusi(states: ProektFilterStatus[]) {
  emit("change", {filters: skopirovatFiltri({states}), immediate: true});
}

const SORTIROVKI: ProektSort[] = ["name_asc", "code_asc", "state_priority"];

const sortOptions = computed<GhSelectOption[]>(() => {
  return SORTIROVKI.map((sort: ProektSort) => ({
    value: sort,
    label: t("unit.spisok_proektov.filter.sort." + sort),
  }));
});

/** Подпись текущей сортировки — для tooltip и доступного имени селекта. */
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
    <div class="proekt-filter__row">
      <div class="proekt-filter__search">
        <label :for="IDENTIFIKATOR_POISKA" class="gh-visually-hidden">
          {{ $t('unit.spisok_proektov.filter.search') }}
        </label>
        <GhInput
            :id="IDENTIFIKATOR_POISKA"
            size="sm"
            icon="search"
            clearable
            :disabled="loading"
            :model-value="poisk"
            :placeholder="$t('unit.spisok_proektov.filter.search')"
            @update:model-value="izmenitPoisk"
        />
      </div>

      <GhCheckbox
          :model-value="filters.onlyActive"
          :label="$t('unit.spisok_proektov.filter.only_active')"
          @update:model-value="pereklyuchitTolkoAktivnie"
      />

      <div class="proekt-filter__sort">
        <GhSelect
            size="sm"
            :model-value="filters.sort"
            :options="sortOptions"
            :placeholder="tekushayaSortirovka"
            :aria-label="$t('unit.spisok_proektov.filter.sort.label')"
            @update:model-value="izmenitSort"
        />
      </div>

      <span class="proekt-filter__spacer" />

      <span v-if="lastUpdatedAt !== null" class="proekt-filter__updated">
        {{ $t('unit.spisok_proektov.filter.updated_at', {time: convertDate(lastUpdatedAt)}) }}
      </span>
    </div>

    <div class="proekt-filter__bottom">
      <ProektFilterStatusComponent
          class="proekt-filter__statuses"
          :model-value="filters.states"
          :counts="counts"
          :total="total"
          @update:model-value="izmenitStatusi"
      />

      <ProektFilterChips
          v-if="chips.length > 0"
          :chips="chips"
          @remove="emit('removeChip', $event)"
          @clear="emit('clearFilters')"
      />

      <span class="proekt-filter__spacer" />

      <span class="proekt-filter__count">{{ proektiCount }}</span>

      <span v-if="truncatedLimit !== null" class="proekt-filter__truncated">
        {{ $t('unit.spisok_proektov.filter.truncated', {limit: truncatedLimit}) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.proekt-filter {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  margin-bottom: 16px;
}

.proekt-filter__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.proekt-filter__search {
  flex: 1 1 220px;
  min-width: 160px;
}

/*
 * F4: строка GhCheckbox в kit — 32px. В фильтр-баре все контролы size="sm"
 * (28px), поэтому локально выравниваем чекбокс по высоте строки, не меняя kit.
 */
.proekt-filter__row :deep(.gh-checkbox) {
  min-height: var(--control-height-sm);
}

.proekt-filter__sort {
  flex: 0 1 auto;
  min-width: 160px;
  max-width: 240px;
}

/* Текст сортировки и стрелка — без лишнего зазора внутри контрола. */
.proekt-filter__sort :deep(.q-field__native) {
  display: flex;
  align-items: center;
}

.proekt-filter__sort :deep(.q-field__append) {
  height: auto;
  padding: 0 8px;
}

.proekt-filter__spacer {
  flex: 1 1 0;
  min-width: 8px;
}

.proekt-filter__updated {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  white-space: nowrap;
}

.proekt-filter__bottom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.proekt-filter__statuses {
  flex: 0 0 auto;
}

.proekt-filter__count,
.proekt-filter__truncated {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  white-space: nowrap;
}
</style>
