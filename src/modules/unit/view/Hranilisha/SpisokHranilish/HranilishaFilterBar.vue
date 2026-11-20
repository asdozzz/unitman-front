<script setup lang="ts">
import {computed, ref, watch} from "vue";
import {useI18n} from "vue-i18n";
import {useQuasar} from "quasar";
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

function izmenitTip(type: string | null) {
  emit("change", {filters: skopirovatFiltri({type}), immediate: true});
}

function izmenitSort(sort: HranilishaSort) {
  emit("change", {filters: skopirovatFiltri({sort}), immediate: true});
}

function izmenitStatusi(statuses: HranilishaFilterStatus[]) {
  emit("change", {filters: skopirovatFiltri({statuses}), immediate: true});
}

const SORTIROVKI: HranilishaSort[] = ["name_asc", "type_asc"];

const sortOptions = computed<Array<{value: HranilishaSort; label: string}>>(() => {
  return SORTIROVKI.map((sort: HranilishaSort) => ({
    value: sort,
    label: t("unit.spisok_rep.filter.sort." + sort),
  }));
});

/** Подпись текущей сортировки — для tooltip иконки-меню. */
const tekushayaSortirovka = computed<string>(() => {
  const option = sortOptions.value.find((item) => item.value === props.filters.sort);

  return option?.label ?? t("unit.spisok_rep.filter.sort.label");
});

const tipOptions = computed<Array<{value: string | null; label: string}>>(() => {
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
    <!-- Строка 1: тулбар. На десктопе без переносов, на <1024px — горизонтальный скролл. -->
    <div class="hranilisha-filter__row">
      <q-input
          class="hranilisha-filter__search"
          dense
          borderless
          clearable
          hide-bottom-space
          :model-value="poisk"
          :placeholder="$t('unit.spisok_rep.filter.search')"
          @update:model-value="izmenitPoisk"
      >
        <template #prepend>
          <q-icon name="search" size="18px" />
        </template>
      </q-input>

      <q-select
          class="hranilisha-filter__select"
          dense
          borderless
          hide-bottom-space
          emit-value
          map-options
          options-dense
          popup-content-class="hranilisha-filter__type-menu"
          :model-value="filters.type"
          :options="tipOptions"
          :aria-label="$t('unit.spisok_rep.filter.type_label')"
          @update:model-value="izmenitTip"
      />

      <q-btn
          class="hranilisha-filter__sort"
          dense
          flat
          color="primary"
          icon="sort"
          :aria-label="tekushayaSortirovka"
      >
        <q-tooltip>{{ tekushayaSortirovka }}</q-tooltip>

        <q-menu anchor="bottom right" self="top right">
          <q-list dense class="hranilisha-filter__sort-list">
            <q-item
                v-for="option in sortOptions"
                :key="option.value"
                clickable
                :active="filters.sort === option.value"
                active-class="hranilisha-filter__sort-item--active"
                @click="izmenitSort(option.value)"
            >
              <q-item-section avatar class="hranilisha-filter__sort-check">
                <q-icon v-if="filters.sort === option.value" name="check" size="18px" />
              </q-item-section>
              <q-item-section>{{ option.label }}</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>

      <span class="hranilisha-filter__spacer" />

      <q-btn
          dense
          flat
          color="primary"
          icon="refresh"
          :loading="loading"
          :aria-label="$t('unit.spisok_rep.filter.refresh')"
          @click="emit('submit')"
      >
        <q-tooltip>{{ $t('unit.spisok_rep.filter.refresh') }}</q-tooltip>
      </q-btn>

      <span v-if="lastUpdatedAt !== null" class="hranilisha-filter__updated">
        {{ $t('unit.spisok_rep.filter.updated_at', {time: convertDate(lastUpdatedAt)}) }}
      </span>

      <q-btn
          class="hranilisha-filter__add"
          dense
          no-caps
          unelevated
          color="primary"
          icon="add"
          :label="$t('unit.spisok_rep.buttons.add')"
          @click="emit('create')"
      />
    </div>

    <!-- Строка 2: статусы + чипы активных фильтров + счётчик/обрезание. -->
    <div class="hranilisha-filter__bottom">
      <HranilishaFilterStatusComponent
          v-if="statusiNaDesktope"
          class="hranilisha-filter__statuses"
          :model-value="filters.statuses"
          :counts="counts"
          :total="total"
          @update:model-value="izmenitStatusi"
      />

      <q-btn
          v-else
          class="hranilisha-filter__filters-btn"
          dense
          no-caps
          outline
          color="primary"
          icon="tune"
          :label="$t('unit.spisok_rep.filter.filters_button')"
      >
        <q-badge v-if="filters.statuses.length > 0" color="primary" floating>
          {{ filters.statuses.length }}
        </q-badge>

        <q-menu anchor="bottom left" self="top left">
          <div class="hranilisha-filter__menu">
            <HranilishaFilterStatusComponent
                :model-value="filters.statuses"
                :counts="counts"
                :total="total"
                @update:model-value="izmenitStatusi"
            />
          </div>
        </q-menu>
      </q-btn>

      <HranilishaFilterChips
          v-if="chips.length > 0"
          :chips="chips"
          @remove="emit('removeChip', $event)"
          @clear="emit('clearFilters')"
      />

      <span class="hranilisha-filter__spacer" />

      <span class="hranilisha-filter__count text-tabular">{{ reposCount }}</span>

      <span v-if="truncatedLimit !== null" class="hranilisha-filter__truncated">
        {{ $t('unit.spisok_rep.filter.truncated', {limit: truncatedLimit}) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.hranilisha-filter {
  /* Единая высота всех контролов строки: поля, кнопки, чип. */
  --hranilisha-control-height: 40px;

  display: flex;
  flex-direction: column;
  gap: var(--app-space-2);
  min-width: 0;
}

/* Строка 1: без переносов; на узких экранах уходит в горизонтальный скролл. */
.hranilisha-filter__row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: var(--app-space-2);
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.hranilisha-filter__row::-webkit-scrollbar,
.hranilisha-filter__bottom::-webkit-scrollbar {
  display: none;
}

.hranilisha-filter__search {
  flex: 1 1 220px;
  min-width: 160px;
}

.hranilisha-filter__select {
  flex: 0 0 160px;
  width: 160px;
  min-width: 150px;
}

/* Поля фильтра: заметная граница в покое, темнее на hover, primary на фокусе. */
.hranilisha-filter__search :deep(.q-field__control),
.hranilisha-filter__select :deep(.q-field__control) {
  height: var(--hranilisha-control-height);
  min-height: var(--hranilisha-control-height);
  padding: 0 var(--app-space-3);
  border: 1px solid var(--app-border);
  border-radius: 0;
  background: var(--app-surface-muted);
  transition:
      background-color var(--app-duration-fast) var(--app-easing),
      border-color var(--app-duration-fast) var(--app-easing);
}

.hranilisha-filter__search :deep(.q-field__control:hover),
.hranilisha-filter__select :deep(.q-field__control:hover) {
  border-color: var(--app-text-disabled);
}

.hranilisha-filter__search :deep(.q-field--focused .q-field__control),
.hranilisha-filter__select :deep(.q-field--focused .q-field__control) {
  border-color: var(--app-focus-ring);
  background: var(--app-surface);
}

.hranilisha-filter__search :deep(.q-field__native),
.hranilisha-filter__select :deep(.q-field__native) {
  min-height: 30px;
  color: var(--app-text);
}

/* Выбранное значение типа не прилипает к левой границе поля. */
.hranilisha-filter__select :deep(.q-field__native) {
  padding-left: var(--app-space-1);
}

.hranilisha-filter__search :deep(.q-field__prepend),
.hranilisha-filter__select :deep(.q-field__append) {
  padding: 0;
  color: var(--app-text-secondary);
}

.hranilisha-filter__sort {
  flex: 0 0 auto;
}

/* Primary-кнопка строки: та же высота, что у поля, и воздух вокруг подписи. */
.hranilisha-filter .hranilisha-filter__add {
  height: var(--hranilisha-control-height);
  padding-inline: var(--app-space-4);
}

.hranilisha-filter .hranilisha-filter__add :deep(.q-btn__content) {
  gap: var(--app-space-1);
}

.hranilisha-filter__sort-list {
  min-width: 220px;
}

.hranilisha-filter__sort-check {
  min-width: 32px;
  padding-right: 0;
}

.hranilisha-filter__sort-item--active {
  color: var(--app-primary);
  background: var(--app-surface-muted);
}

.hranilisha-filter__spacer {
  flex: 1 1 0;
  min-width: var(--app-space-2);
}

.hranilisha-filter__updated {
  color: var(--app-text-secondary);
  font-size: var(--app-font-size-caption);
  white-space: nowrap;
}

/* Строка 2: статусы + чипы + счётчик. */
.hranilisha-filter__bottom {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: var(--app-space-2);
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.hranilisha-filter__statuses {
  flex: 0 0 auto;
}

.hranilisha-filter__filters-btn {
  flex: 0 0 auto;
}

.hranilisha-filter__menu {
  padding: var(--app-space-2);
  max-width: 320px;
}

.hranilisha-filter__count,
.hranilisha-filter__truncated {
  color: var(--app-text-secondary);
  font-size: var(--app-font-size-caption);
  white-space: nowrap;
}

@media (max-width: 1023.98px) {
  .hranilisha-filter__bottom {
    flex-wrap: wrap;
    overflow-x: visible;
  }
}
</style>

<!-- Меню селекта рендерится в портале, поэтому scoped-стили до него не достают. -->
<style>
.hranilisha-filter__type-menu .q-item {
  padding-right: var(--app-space-4);
  padding-left: var(--app-space-4);
}

.hranilisha-filter__type-menu .q-item__section--main {
  min-width: 0;
}
</style>
