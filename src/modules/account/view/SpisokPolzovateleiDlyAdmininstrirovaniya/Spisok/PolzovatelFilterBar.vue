<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { GhButton, GhInput, GhSelect } from "@/components/ui";
import type {
  PolzovatelFilterChip,
  PolzovatelFilterKey,
  PolzovatelFiltri,
  PolzovatelFilterStatus as PolzovatelFilterStatusTip,
  PolzovatelSort,
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/model/PolzovatelFiltri";
import { convertDate } from "@/utils/dates";
import PolzovatelFilterStatus from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/Spisok/PolzovatelFilterStatus.vue";
import PolzovatelFilterChips from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/Spisok/PolzovatelFilterChips.vue";

const props = defineProps<{
  filters: PolzovatelFiltri;
  roles: { value: string; label: string }[];
  counts: Record<PolzovatelFilterStatusTip, number>;
  total: number;
  loading: boolean;
  lastUpdatedAt: number | null;
  /** Чипы активных фильтров — рендерятся после статусов. */
  chips: PolzovatelFilterChip[];
  /** Лимит обрезанного списка; null — список не обрезан. */
  truncatedLimit: number | null;
}>();

const emit = defineEmits<{
  change: [payload: { filters: PolzovatelFiltri; immediate: boolean }];
  submit: [];
  create: [];
  removeChip: [chip: { key: PolzovatelFilterKey; value?: string }];
  clearFilters: [];
}>();

const { t, locale } = useI18n();

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
  return { ...props.filters, ...patch };
}

/** Текстовый поиск: страница сама решает, когда применить debounce. */
function izmenitPoisk(znachenie: string | number | null): void {
  const tekst = znachenie === null || znachenie === undefined ? "" : String(znachenie);
  poisk.value = tekst;

  emit("change", {
    filters: skopirovatFiltri({ search: tekst.trim() === "" ? null : tekst }),
    immediate: false,
  });
}

function izmenitRol(znachenie: string | number | null): void {
  const role = znachenie === null ? null : String(znachenie);

  emit("change", { filters: skopirovatFiltri({ role }), immediate: true });
}

function izmenitSort(znachenie: string | number | null): void {
  if (znachenie === null) {
    return;
  }

  const sort = String(znachenie) as PolzovatelSort;

  emit("change", { filters: skopirovatFiltri({ sort }), immediate: true });
}

function izmenitStatusi(statuses: PolzovatelFilterStatusTip[]): void {
  emit("change", { filters: skopirovatFiltri({ statuses }), immediate: true });
}

const SORTIROVKI: PolzovatelSort[] = ["email_asc", "nickname_asc"];

const sortOptions = computed<Array<{ value: PolzovatelSort; label: string }>>(() => {
  return SORTIROVKI.map((sort: PolzovatelSort) => ({
    value: sort,
    label: t("account.spisok.filter.sort." + sort),
  }));
});

const roleOptions = computed<Array<{ value: string | null; label: string }>>(() => {
  return [
    { value: null, label: t("account.spisok.filter.all_roles") },
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

  return t(`account.spisok.filter.accounts_count.${forma}`, { count: props.total });
});
</script>

<template>
  <div
    class="polzovatel-filter primer"
    role="toolbar"
    :aria-label="t('account.spisok.filter.filters_button')"
  >
    <div class="polzovatel-filter__row">
      <GhInput
        class="polzovatel-filter__search"
        size="sm"
        icon="search"
        clearable
        :model-value="poisk"
        :placeholder="t('account.spisok.filter.query')"
        :aria-label="t('account.spisok.filter.query')"
        @update:model-value="izmenitPoisk"
      />

      <span class="polzovatel-filter__select">
        <GhSelect
          size="sm"
          :model-value="filters.role"
          :options="roleOptions"
          :aria-label="t('account.spisok.filter.chip.role')"
          @update:model-value="izmenitRol"
        />
      </span>

      <span class="polzovatel-filter__sort">
        <GhSelect
          size="sm"
          :model-value="filters.sort"
          :options="sortOptions"
          :aria-label="t('account.spisok.filter.sort.label')"
          @update:model-value="izmenitSort"
        />
      </span>

      <span class="polzovatel-filter__spacer" />

      <GhButton
        variant="default"
        size="sm"
        icon="sync"
        :loading="loading"
        :aria-label="t('account.spisok.filter.refresh')"
        @click="emit('submit')"
      >
        <q-tooltip>{{ t("account.spisok.filter.refresh") }}</q-tooltip>
      </GhButton>

      <span v-if="lastUpdatedAt !== null" class="polzovatel-filter__updated">
        {{ t("account.spisok.filter.updated_at", { time: convertDate(lastUpdatedAt) }) }}
      </span>

      <GhButton
        variant="primary"
        size="sm"
        icon="plus"
        :label="t('account.spisok.buttons.add')"
        @click="emit('create')"
      />
    </div>

    <div class="polzovatel-filter__bottom">
      <PolzovatelFilterStatus
        :model-value="filters.statuses"
        :counts="counts"
        :total="total"
        @update:model-value="izmenitStatusi"
      />

      <PolzovatelFilterChips
        v-if="chips.length > 0"
        :chips="chips"
        @remove="emit('removeChip', $event)"
        @clear="emit('clearFilters')"
      />

      <span class="polzovatel-filter__spacer" />

      <span class="polzovatel-filter__count">{{ accountsCount }}</span>

      <span v-if="truncatedLimit !== null" class="polzovatel-filter__truncated">
        {{ t("account.spisok.filter.truncated", { limit: truncatedLimit }) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.polzovatel-filter {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.polzovatel-filter__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.polzovatel-filter__search {
  flex: 1 1 220px;
  min-width: 160px;
}

/* Селекты сортировки и фильтра — по содержимому в рамках 160–240px. */
.polzovatel-filter__select,
.polzovatel-filter__sort {
  display: flex;
  flex: 0 1 auto;
  min-width: 160px;
  max-width: 240px;
}

/* Текст и стрелка внутри селектов — без лишнего зазора (F3). */
.polzovatel-filter__select :deep(.q-field__native),
.polzovatel-filter__sort :deep(.q-field__native) {
  display: flex;
  align-items: center;
}

.polzovatel-filter__select :deep(.q-field__append),
.polzovatel-filter__sort :deep(.q-field__append) {
  height: auto;
  padding: 0 8px;
}

.polzovatel-filter__spacer {
  flex: 1 1 0;
  min-width: 8px;
}

.polzovatel-filter__updated,
.polzovatel-filter__count,
.polzovatel-filter__truncated {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  white-space: nowrap;
}

.polzovatel-filter__bottom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
</style>
