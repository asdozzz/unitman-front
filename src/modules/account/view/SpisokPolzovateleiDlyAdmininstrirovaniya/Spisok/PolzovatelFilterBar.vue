<script setup lang="ts">
import {computed, ref, watch} from "vue";
import {useI18n} from "vue-i18n";
import {useQuasar} from "quasar";
import type {
  PolzovatelFilterChip,
  PolzovatelFilterKey,
  PolzovatelFiltri,
  PolzovatelFilterStatus as PolzovatelFilterStatusTip,
  PolzovatelSort,
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/model/PolzovatelFiltri";
import {convertDate} from "@/utils/dates";
import PolzovatelFilterStatus from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/Spisok/PolzovatelFilterStatus.vue";
import PolzovatelFilterChips from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/Spisok/PolzovatelFilterChips.vue";

const props = defineProps<{
  filters: PolzovatelFiltri;
  roles: {value: string; label: string}[];
  counts: Record<PolzovatelFilterStatusTip, number>;
  total: number;
  loading: boolean;
  lastUpdatedAt: number | null;
  /** Чипы активных фильтров — рендерятся в строке 2 после статусов. */
  chips: PolzovatelFilterChip[];
  /** Лимит обрезанного списка; null — список не обрезан. */
  truncatedLimit: number | null;
}>();

const emit = defineEmits<{
  change: [payload: {filters: PolzovatelFiltri; immediate: boolean}];
  submit: [];
  create: [];
  removeChip: [chip: {key: PolzovatelFilterKey; value?: string}];
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
function skopirovatFiltri(patch: Partial<PolzovatelFiltri>): PolzovatelFiltri {
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

function izmenitRol(role: string | null) {
  emit("change", {filters: skopirovatFiltri({role}), immediate: true});
}

function izmenitSort(sort: PolzovatelSort) {
  emit("change", {filters: skopirovatFiltri({sort}), immediate: true});
}

function izmenitStatusi(statuses: PolzovatelFilterStatusTip[]) {
  emit("change", {filters: skopirovatFiltri({statuses}), immediate: true});
}

const SORTIROVKI: PolzovatelSort[] = ["email_asc", "nickname_asc"];

const sortOptions = computed<Array<{value: PolzovatelSort; label: string}>>(() => {
  return SORTIROVKI.map((sort: PolzovatelSort) => ({
    value: sort,
    label: t("account.spisok.filter.sort." + sort),
  }));
});

/** Подпись текущей сортировки — для tooltip иконки-меню. */
const tekushayaSortirovka = computed<string>(() => {
  const option = sortOptions.value.find((item) => item.value === props.filters.sort);

  return option?.label ?? t("account.spisok.filter.sort.label");
});

const roleOptions = computed<Array<{value: string | null; label: string}>>(() => {
  return [
    {value: null, label: t("account.spisok.filter.all_roles")},
    ...props.roles,
  ];
});

/**
 * Счётчик аккаунтов с корректной плюральной формой.
 * Intl.PluralRules даёт форму для текущей локали (one/few/many/other),
 * а vue-i18n только подставляет число.
 */
const accountsCount = computed<string>(() => {
  const forma = new Intl.PluralRules(locale.value).select(props.total);

  return t(`account.spisok.filter.accounts_count.${forma}`, {count: props.total});
});
</script>

<template>
  <div class="polzovatel-filter" role="toolbar" :aria-label="$t('account.spisok.filter.filters_button')">
    <!-- Строка 1: тулбар. На десктопе без переносов, на <1024px — горизонтальный скролл. -->
    <div class="polzovatel-filter__row">
      <q-input
          class="polzovatel-filter__search"
          dense
          borderless
          clearable
          hide-bottom-space
          :model-value="poisk"
          :placeholder="$t('account.spisok.filter.query')"
          :aria-label="$t('account.spisok.filter.query')"
          @update:model-value="izmenitPoisk"
      >
        <template #prepend>
          <q-icon name="search" size="18px" />
        </template>
      </q-input>

      <q-select
          class="polzovatel-filter__select"
          dense
          borderless
          hide-bottom-space
          emit-value
          map-options
          options-dense
          popup-content-class="polzovatel-filter__role-menu"
          :model-value="filters.role"
          :options="roleOptions"
          :aria-label="$t('account.spisok.filter.chip.role')"
          @update:model-value="izmenitRol"
      />

      <q-btn
          class="polzovatel-filter__sort"
          dense
          flat
          color="primary"
          icon="sort"
          :aria-label="tekushayaSortirovka"
      >
        <q-tooltip>{{ tekushayaSortirovka }}</q-tooltip>

        <q-menu anchor="bottom right" self="top right">
          <q-list dense class="polzovatel-filter__sort-list">
            <q-item
                v-for="option in sortOptions"
                :key="option.value"
                clickable
                :active="filters.sort === option.value"
                active-class="polzovatel-filter__sort-item--active"
                @click="izmenitSort(option.value)"
            >
              <q-item-section avatar class="polzovatel-filter__sort-check">
                <q-icon v-if="filters.sort === option.value" name="check" size="18px" />
              </q-item-section>
              <q-item-section>{{ option.label }}</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>

      <span class="polzovatel-filter__spacer" />

      <q-btn
          dense
          flat
          color="primary"
          icon="refresh"
          :loading="loading"
          :aria-label="$t('account.spisok.filter.refresh')"
          @click="emit('submit')"
      >
        <q-tooltip>{{ $t('account.spisok.filter.refresh') }}</q-tooltip>
      </q-btn>

      <span v-if="lastUpdatedAt !== null" class="polzovatel-filter__updated">
        {{ $t('account.spisok.filter.updated_at', {time: convertDate(lastUpdatedAt)}) }}
      </span>

      <q-btn
          class="polzovatel-filter__add"
          dense
          no-caps
          unelevated
          color="primary"
          icon="add"
          :label="$t('account.spisok.buttons.add')"
          @click="emit('create')"
      />
    </div>

    <!-- Строка 2: статусы + чипы активных фильтров + счётчик/обрезание. -->
    <div class="polzovatel-filter__bottom">
      <PolzovatelFilterStatus
          v-if="statusiNaDesktope"
          class="polzovatel-filter__statuses"
          :model-value="filters.statuses"
          :counts="counts"
          :total="total"
          @update:model-value="izmenitStatusi"
      />

      <q-btn
          v-else
          class="polzovatel-filter__filters-btn"
          dense
          no-caps
          outline
          color="primary"
          icon="tune"
          :label="$t('account.spisok.filter.filters_button')"
      >
        <q-badge v-if="filters.statuses.length > 0" color="primary" floating>
          {{ filters.statuses.length }}
        </q-badge>

        <q-menu anchor="bottom left" self="top left">
          <div class="polzovatel-filter__menu">
            <PolzovatelFilterStatus
                :model-value="filters.statuses"
                :counts="counts"
                :total="total"
                @update:model-value="izmenitStatusi"
            />
          </div>
        </q-menu>
      </q-btn>

      <PolzovatelFilterChips
          v-if="chips.length > 0"
          :chips="chips"
          @remove="emit('removeChip', $event)"
          @clear="emit('clearFilters')"
      />

      <span class="polzovatel-filter__spacer" />

      <span class="polzovatel-filter__count text-tabular">{{ accountsCount }}</span>

      <span v-if="truncatedLimit !== null" class="polzovatel-filter__truncated">
        {{ $t('account.spisok.filter.truncated', {limit: truncatedLimit}) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.polzovatel-filter {
  /* Единая высота всех контролов строки: поля и кнопки. */
  --polzovatel-control-height: 40px;

  display: flex;
  flex-direction: column;
  gap: var(--app-space-2);
  min-width: 0;
}

/* Строка 1: без переносов; на узких экранах уходит в горизонтальный скролл. */
.polzovatel-filter__row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: var(--app-space-2);
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.polzovatel-filter__row::-webkit-scrollbar,
.polzovatel-filter__bottom::-webkit-scrollbar {
  display: none;
}

.polzovatel-filter__search {
  flex: 1 1 220px;
  min-width: 160px;
}

.polzovatel-filter__select {
  flex: 0 0 160px;
  width: 160px;
  min-width: 150px;
}

/* Поля фильтра: заметная граница в покое, темнее на hover, primary на фокусе. */
.polzovatel-filter__search :deep(.q-field__control),
.polzovatel-filter__select :deep(.q-field__control) {
  height: var(--polzovatel-control-height);
  min-height: var(--polzovatel-control-height);
  padding: 0 var(--app-space-3);
  border: 1px solid var(--app-border);
  border-radius: 0;
  background: var(--app-surface-muted);
  transition:
      background-color var(--app-duration-fast) var(--app-easing),
      border-color var(--app-duration-fast) var(--app-easing);
}

.polzovatel-filter__search :deep(.q-field__control:hover),
.polzovatel-filter__select :deep(.q-field__control:hover) {
  border-color: var(--app-text-disabled);
}

.polzovatel-filter__search :deep(.q-field--focused .q-field__control),
.polzovatel-filter__select :deep(.q-field--focused .q-field__control) {
  border-color: var(--app-focus-ring);
  background: var(--app-surface);
}

.polzovatel-filter__search :deep(.q-field__native),
.polzovatel-filter__select :deep(.q-field__native) {
  min-height: 30px;
  color: var(--app-text);
}

/* Выбранное значение роли не прилипает к левой границе поля. */
.polzovatel-filter__select :deep(.q-field__native) {
  padding-left: var(--app-space-1);
}

.polzovatel-filter__search :deep(.q-field__prepend),
.polzovatel-filter__select :deep(.q-field__append) {
  padding: 0;
  color: var(--app-text-secondary);
}

.polzovatel-filter__sort {
  flex: 0 0 auto;
}

/* Primary-кнопка строки: та же высота, что у полей, и воздух вокруг подписи. */
.polzovatel-filter .polzovatel-filter__add {
  height: var(--polzovatel-control-height);
  padding-inline: var(--app-space-4);
}

.polzovatel-filter .polzovatel-filter__add :deep(.q-btn__content) {
  gap: var(--app-space-1);
}

.polzovatel-filter__sort-list {
  min-width: 220px;
}

.polzovatel-filter__sort-check {
  min-width: 32px;
  padding-right: 0;
}

.polzovatel-filter__sort-item--active {
  color: var(--app-primary);
  background: var(--app-surface-muted);
}

.polzovatel-filter__spacer {
  flex: 1 1 0;
  min-width: var(--app-space-2);
}

.polzovatel-filter__updated {
  color: var(--app-text-secondary);
  font-size: var(--app-font-size-caption);
  white-space: nowrap;
}

/* Строка 2: статусы + чипы + счётчик. */
.polzovatel-filter__bottom {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: var(--app-space-2);
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.polzovatel-filter__statuses {
  flex: 0 0 auto;
}

.polzovatel-filter__filters-btn {
  flex: 0 0 auto;
}

.polzovatel-filter__menu {
  padding: var(--app-space-2);
  max-width: 320px;
}

.polzovatel-filter__count,
.polzovatel-filter__truncated {
  color: var(--app-text-secondary);
  font-size: var(--app-font-size-caption);
  white-space: nowrap;
}

@media (max-width: 1023.98px) {
  .polzovatel-filter__bottom {
    flex-wrap: wrap;
    overflow-x: visible;
  }
}
</style>

<!-- Меню селекта рендерится в портале, поэтому scoped-стили до него не достают. -->
<style>
.polzovatel-filter__role-menu .q-item {
  padding-right: var(--app-space-4);
  padding-left: var(--app-space-4);
}

.polzovatel-filter__role-menu .q-item__section--main {
  min-width: 0;
}
</style>
