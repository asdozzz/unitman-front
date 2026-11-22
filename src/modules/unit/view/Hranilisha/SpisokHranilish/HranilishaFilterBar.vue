<script setup lang="ts">
import {computed, ref, watch} from "vue";
import {useI18n} from "vue-i18n";
import {
  GhInput,
  GhSelect,
} from "@/components/ui";
import type {GhSelectOption} from "@/components/ui";
import type {
  HranilishaFilterChip,
  HranilishaFilterKey,
  HranilishaFilterStatus,
  HranilishaFiltri,
  HranilishaSort,
} from "@/modules/unit/store/SpisokHranilish/model/HranilishaFiltri";
import type {TipHranilisha} from "@/modules/unit/store/SpisokHranilishStore";
import {convertDate} from "@/utils/dates";
import HranilishaFilterStatusComponent from "@/modules/unit/view/Hranilisha/SpisokHranilish/HranilishaFilterStatus.vue";
import HranilishaFilterChips from "@/modules/unit/view/Hranilisha/SpisokHranilish/HranilishaFilterChips.vue";

const props = defineProps<{
  filters: HranilishaFiltri;
  /** Уникальные типы репозиториев из загруженного списка. */
  types: TipHranilisha[];
  counts: Record<HranilishaFilterStatus, number>;
  /** Всего репозиториев в выборке — используется счётчиками статусов. */
  total: number;
  /** Сколько репозиториев видно после клиентских фильтров — подпись справа. */
  visibleTotal: number;
  loading: boolean;
  lastUpdatedAt: number | null;
  /** Чипы активных фильтров — рендерятся в строке 2 после статусов. */
  chips: HranilishaFilterChip[];
  /** Лимит обрезанного списка; null — список не обрезан. */
  truncatedLimit: number | null;
}>();

const emit = defineEmits<{
  change: [payload: {filters: HranilishaFiltri; immediate: boolean}];
  submit: [];
  create: [];
  removeChip: [chip: {key: HranilishaFilterKey; value?: string}];
  clearFilters: [];
}>();

const {t, locale} = useI18n();

/** id нативного поиска: на него опирается хоткей `/` страницы. */
const IDENTIFIKATOR_POISKA = "hranilisha-filter-search";

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
function skopirovatFiltri(patch: Partial<HranilishaFiltri>): HranilishaFiltri {
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

function izmenitTip(znachenie: string | number | null) {
  emit("change", {
    filters: skopirovatFiltri({type: znachenie === null ? null : String(znachenie)}),
    immediate: true,
  });
}

function izmenitSort(znachenie: string | number | null) {
  if (typeof znachenie !== "string") {
    return;
  }

  emit("change", {filters: skopirovatFiltri({sort: znachenie as HranilishaSort}), immediate: true});
}

function izmenitStatusi(statuses: HranilishaFilterStatus[]) {
  emit("change", {filters: skopirovatFiltri({statuses}), immediate: true});
}

const SORTIROVKI: HranilishaSort[] = ["name_asc", "type_asc"];

const sortOptions = computed<GhSelectOption[]>(() => {
  return SORTIROVKI.map((sort: HranilishaSort) => ({
    value: sort,
    label: t("unit.spisok_rep.filter.sort." + sort),
  }));
});

/** Подпись текущей сортировки — для tooltip и доступного имени селекта. */
const tekushayaSortirovka = computed<string>(() => {
  const option = sortOptions.value.find((item) => item.value === props.filters.sort);

  return option?.label ?? t("unit.spisok_rep.filter.sort.label");
});

const tipOptions = computed<GhSelectOption[]>(() => {
  return [
    {value: null, label: t("unit.spisok_rep.filter.all_types")},
    ...props.types,
  ];
});

/**
 * Счётчик репозиториев с корректной плюральной формой.
 * Intl.PluralRules даёт форму для текущей локали (one/few/many/other),
 * а vue-i18n только подставляет число — без неоднозначных перегрузок t().
 */
const reposCount = computed<string>(() => {
  const forma = new Intl.PluralRules(locale.value).select(props.visibleTotal);

  return t(`unit.spisok_rep.filter.repos_count.${forma}`, {count: props.visibleTotal});
});
</script>

<template>
  <div class="hranilisha-filter" role="toolbar" :aria-label="$t('unit.spisok_rep.filter.filters_button')">
    <div class="hranilisha-filter__row">
      <div class="hranilisha-filter__search">
        <label :for="IDENTIFIKATOR_POISKA" class="gh-visually-hidden">
          {{ $t('unit.spisok_rep.filter.search') }}
        </label>
        <GhInput
            :id="IDENTIFIKATOR_POISKA"
            size="sm"
            icon="search"
            clearable
            :disabled="loading"
            :model-value="poisk"
            :placeholder="$t('unit.spisok_rep.filter.search')"
            @update:model-value="izmenitPoisk"
        />
      </div>

      <div class="hranilisha-filter__select">
        <GhSelect
            size="sm"
            :model-value="filters.type"
            :options="tipOptions"
            :placeholder="$t('unit.spisok_rep.filter.all_types')"
            :aria-label="$t('unit.spisok_rep.filter.type_label')"
            @update:model-value="izmenitTip"
        />
      </div>

      <div class="hranilisha-filter__sort">
        <GhSelect
            size="sm"
            :model-value="filters.sort"
            :options="sortOptions"
            :placeholder="tekushayaSortirovka"
            :aria-label="$t('unit.spisok_rep.filter.sort.label')"
            @update:model-value="izmenitSort"
        />
      </div>

      <span class="hranilisha-filter__spacer" />

      <span v-if="lastUpdatedAt !== null" class="hranilisha-filter__updated">
        {{ $t('unit.spisok_rep.filter.updated_at', {time: convertDate(lastUpdatedAt)}) }}
      </span>
    </div>

    <div class="hranilisha-filter__bottom">
      <HranilishaFilterStatusComponent
          class="hranilisha-filter__statuses"
          :model-value="filters.statuses"
          :counts="counts"
          :total="total"
          @update:model-value="izmenitStatusi"
      />

      <HranilishaFilterChips
          v-if="chips.length > 0"
          :chips="chips"
          @remove="emit('removeChip', $event)"
          @clear="emit('clearFilters')"
      />

      <span class="hranilisha-filter__spacer" />

      <span class="hranilisha-filter__count">{{ reposCount }}</span>

      <span v-if="truncatedLimit !== null" class="hranilisha-filter__truncated">
        {{ $t('unit.spisok_rep.filter.truncated', {limit: truncatedLimit}) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.hranilisha-filter {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  margin-bottom: 16px;
}

.hranilisha-filter__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.hranilisha-filter__search {
  flex: 1 1 220px;
  min-width: 160px;
}

.hranilisha-filter__select {
  flex: 0 1 auto;
  min-width: 160px;
  max-width: 240px;
}

.hranilisha-filter__sort {
  flex: 0 1 auto;
  min-width: 160px;
  max-width: 240px;
}

/* Текст сортировки и стрелка — без лишнего зазора внутри контрола. */
.hranilisha-filter__sort :deep(.q-field__native) {
  display: flex;
  align-items: center;
}

.hranilisha-filter__sort :deep(.q-field__append) {
  height: auto;
  padding: 0 8px;
}

.hranilisha-filter__spacer {
  flex: 1 1 0;
  min-width: 8px;
}

.hranilisha-filter__updated {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  white-space: nowrap;
}

.hranilisha-filter__bottom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.hranilisha-filter__statuses {
  flex: 0 0 auto;
}

.hranilisha-filter__count,
.hranilisha-filter__truncated {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  white-space: nowrap;
}
</style>
