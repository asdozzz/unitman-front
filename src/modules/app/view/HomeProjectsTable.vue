<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { Schema } from "@/api/types";
import {
  GhActionMenu,
  GhBox,
  GhButton,
  GhCounter,
  GhEmptyState,
  GhIcon,
  GhInput,
  GhSkeleton,
  GhTable,
} from "@/components/ui";
import type { GhActionMenuItem, GhTableColumn } from "@/components/ui";

/** Строка статистики проекта из сгенерированной схемы. */
type ProjectStatistics = Schema<"ProjectStatistics">;

type SortColumn = "project" | "total" | "active" | "deleted" | "activity";

type SortDirection = "asc" | "desc";

type Kolonka = {
  id: SortColumn;
  labelKey: string;
  align: "left" | "right";
};

const props = withDefaults(
  defineProps<{
    /** Уже отфильтрованные и отсортированные строки. */
    rows: ProjectStatistics[];
    /** Всего проектов без учёта фильтра. */
    totalCount: number;
    /** Текст клиентского фильтра по названию. */
    filter: string;
    /** Показывать скелетоны вместо строк (первичная загрузка). */
    loading?: boolean;
    /** Доступны ли административные действия. */
    isAdmin?: boolean;
    sortColumn: SortColumn;
    sortDirection: SortDirection;
    /** Готовое время последнего обновления; пустая строка — не показывать. */
    updatedAtText?: string;
  }>(),
  {
    loading: false,
    isAdmin: false,
    updatedAtText: "",
  },
);

const emit = defineEmits<{
  (e: "update:filter", value: string): void;
  (e: "sort", column: SortColumn): void;
  (e: "open-units", row: ProjectStatistics): void;
  (e: "open-project", row: ProjectStatistics): void;
  (e: "create-project"): void;
  (e: "go-to-units"): void;
}>();

const { t } = useI18n();

/** Идентификатор поля фильтра: на него ссылается скрытый label. */
const IDENTIFIKATOR_FILTRA = "home-projects-filter";

const KOLONKI: Kolonka[] = [
  { id: "project", labelKey: "dashboard.projects.columns.project", align: "left" },
  { id: "total", labelKey: "dashboard.projects.columns.total", align: "right" },
  { id: "active", labelKey: "dashboard.projects.columns.active", align: "right" },
  { id: "deleted", labelKey: "dashboard.projects.columns.deleted", align: "right" },
  { id: "activity", labelKey: "dashboard.projects.columns.activity", align: "right" },
];

/**
 * Колонки для GhTable. При кастомных слотах `#head`/`#body` используется
 * только для типизации и семантики; разметку задаёт вызывающая сторона.
 */
const kolonkiTablitsi = computed<GhTableColumn<ProjectStatistics>[]>(() =>
  KOLONKI.map((kolonka: Kolonka) => ({
    name: kolonka.id,
    label: t(kolonka.labelKey),
    align: kolonka.align,
  })),
);

/** Заголовок фильтра виден только при первичной загрузке или наличии проектов. */
const pokazatFiltr = (): boolean => props.loading || props.totalCount > 0;

/** Показывать ли строку «Обновлено …». */
const pokazatPodval = (): boolean =>
  !props.loading && props.updatedAtText !== "";

function izmenitFiltr(znachenie: string | number | null): void {
  emit("update:filter", znachenie === null ? "" : String(znachenie));
}

function pereklyuchitSortirovku(column: SortColumn): void {
  emit("sort", column);
}

function ariaSort(column: SortColumn): "ascending" | "descending" | "none" {
  if (props.sortColumn !== column) {
    return "none";
  }

  return props.sortDirection === "asc" ? "ascending" : "descending";
}

function podskazkaSortirovki(column: SortColumn): string {
  const nazvanie = t(`dashboard.projects.columns.${column}`);
  const napravlenie = t(
    props.sortColumn === column && props.sortDirection === "asc"
      ? "dashboard.projects.sort_desc"
      : "dashboard.projects.sort_asc",
  );

  return `${t("dashboard.projects.sort_by", { column: nazvanie })} — ${napravlenie}`;
}

function protsentAktivnosti(row: ProjectStatistics): number {
  if (row.total <= 0) {
    return 0;
  }

  return Math.round((row.active / row.total) * 100);
}

function punktyMenu(): GhActionMenuItem[] {
  const punkty: GhActionMenuItem[] = [
    {
      id: "units",
      label: t("dashboard.projects.open_units"),
      icon: "rocket",
    },
  ];

  if (props.isAdmin) {
    punkty.push({
      id: "project",
      label: t("dashboard.projects.open_project"),
      icon: "gear",
    });
  }

  return punkty;
}

function vybratDeistvie(row: ProjectStatistics, item: GhActionMenuItem): void {
  if (item.id === "units") {
    emit("open-units", row);
    return;
  }

  if (item.id === "project") {
    emit("open-project", row);
  }
}

function otkrytYuniti(row: ProjectStatistics): void {
  emit("open-units", row);
}
</script>

<template>
  <GhBox padding="none">
    <template #header>
      <div class="home-projects__header">
        <div class="home-projects__title">
          <span>{{ t("dashboard.projects.title") }}</span>
          <GhCounter :value="totalCount" />
        </div>

        <div v-if="pokazatFiltr()" class="home-projects__filter">
          <label :for="IDENTIFIKATOR_FILTRA" class="gh-visually-hidden">
            {{ t("dashboard.projects.filter_aria") }}
          </label>
          <GhInput
            :id="IDENTIFIKATOR_FILTRA"
            size="sm"
            icon="search"
            clearable
            :disabled="loading"
            :model-value="filter"
            :placeholder="t('dashboard.projects.filter_placeholder')"
            @update:model-value="izmenitFiltr"
          />
        </div>
      </div>
    </template>

    <div v-if="loading" class="home-projects__skeleton" aria-busy="true">
      <div class="home-projects__skeleton-inner">
        <div
          v-for="n in 5"
          :key="`skeleton-row-${n}`"
          class="home-projects__skeleton-row"
        >
          <GhSkeleton variant="text" width="70%" height="12" />
          <GhSkeleton variant="text" width="24px" height="12" />
          <GhSkeleton variant="text" width="24px" height="12" />
          <GhSkeleton variant="text" width="24px" height="12" />
          <GhSkeleton variant="text" width="60px" height="8" />
          <GhSkeleton variant="circle" width="16px" height="16px" />
        </div>
      </div>
    </div>

    <GhEmptyState
      v-else-if="totalCount === 0"
      icon="project"
      :title="t('dashboard.projects.empty')"
      :description="t('dashboard.projects.empty_description')"
    >
      <template #actions>
        <GhButton
          v-if="isAdmin"
          variant="primary"
          icon="plus"
          :label="t('dashboard.projects.create_project')"
          @click="emit('create-project')"
        />
        <GhButton
          variant="default"
          icon="rocket"
          :label="t('dashboard.projects.go_to_units')"
          @click="emit('go-to-units')"
        />
      </template>
    </GhEmptyState>

    <GhEmptyState
      v-else-if="rows.length === 0"
      icon="search"
      :title="t('dashboard.projects.empty')"
    />

    <GhTable
      v-else
      class="home-projects__table"
      borderless
      :rows="rows"
      :columns="kolonkiTablitsi"
      row-key="projectId"
    >
      <template #head>
        <tr>
          <th
            v-for="kolonka in KOLONKI"
            :key="kolonka.id"
            :class="[
              `home-projects__th home-projects__th--${kolonka.align}`,
            ]"
            :aria-sort="ariaSort(kolonka.id)"
            scope="col"
          >
            <button
              type="button"
              class="home-projects__sort"
              :title="podskazkaSortirovki(kolonka.id)"
              :aria-label="podskazkaSortirovki(kolonka.id)"
              @click="pereklyuchitSortirovku(kolonka.id)"
            >
              <span>{{ t(kolonka.labelKey) }}</span>
              <GhIcon
                v-if="sortColumn === kolonka.id"
                :name="sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'"
                :size="12"
              />
            </button>
          </th>
          <th class="home-projects__th home-projects__th--actions" scope="col">
            <span class="gh-visually-hidden">
              {{ t("dashboard.projects.columns.actions") }}
            </span>
          </th>
        </tr>
      </template>

      <template #body>
        <tr
          v-for="row in rows"
          :key="row.projectId"
          class="home-projects__row"
          tabindex="0"
          :aria-label="t('dashboard.projects.row_aria', { project: row.projectName })"
          @click="otkrytYuniti(row)"
          @keydown.enter.prevent="otkrytYuniti(row)"
          @keydown.space.prevent="otkrytYuniti(row)"
        >
          <td class="home-projects__td">
            <span class="home-projects__name">
              <GhIcon name="repo" :size="16" class="home-projects__name-icon" />
              <span class="home-projects__name-text" :title="row.projectName">
                {{ row.projectName }}
              </span>
            </span>
          </td>

          <td class="home-projects__td home-projects__td--num">
            <span class="gh-mono">{{ row.total }}</span>
          </td>

          <td class="home-projects__td home-projects__td--num">
            <span class="gh-mono">{{ row.active }}</span>
          </td>

          <td class="home-projects__td home-projects__td--num">
            <span class="gh-mono">{{ row.deleted }}</span>
          </td>

          <td class="home-projects__td home-projects__td--activity">
            <span class="home-projects__progress">
              <span class="home-projects__bar">
                <span
                  class="home-projects__bar-fill"
                  role="progressbar"
                  :aria-valuenow="protsentAktivnosti(row)"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  :aria-valuetext="`${protsentAktivnosti(row)}%`"
                  :aria-label="t('dashboard.projects.columns.activity')"
                  :style="{ width: `${protsentAktivnosti(row)}%` }"
                />
              </span>
              <span class="home-projects__percent gh-mono">
                {{ protsentAktivnosti(row) }}%
              </span>
            </span>
          </td>

          <td
            class="home-projects__td home-projects__td--actions"
            @click.stop
            @keydown.stop
          >
            <GhActionMenu
              :items="punktyMenu()"
              :aria-label="t('dashboard.projects.actions_aria', { project: row.projectName })"
              @select="vybratDeistvie(row, $event)"
            />
          </td>
        </tr>
      </template>
    </GhTable>

    <template v-if="pokazatPodval()" #footer>
      <span class="home-projects__updated">
        {{ t("dashboard.projects.updated_at", { time: updatedAtText }) }}
      </span>
    </template>
  </GhBox>
</template>

<style scoped>
.home-projects__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: var(--control-height-sm);
}

.home-projects__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: var(--fontWeight-semibold);
}

.home-projects__filter {
  width: 240px;
  max-width: 100%;
  margin-left: auto;
}

/* Таблица внутри GhBox: минимальная ширина даёт горизонтальный скролл
   на мобильных, не выходя за пределы карточки. */
.home-projects__table :deep(.gh-table__native) {
  min-width: 640px;
}

.home-projects__th {
  padding: 8px 12px;
  border-bottom: 1px solid var(--borderColor-default);
  background-color: var(--bgColor-muted);
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
  text-align: left;
  white-space: nowrap;
}

.home-projects__th--right {
  text-align: right;
}

.home-projects__th--actions {
  width: 48px;
}

.home-projects__sort {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.home-projects__th--right .home-projects__sort {
  flex-direction: row-reverse;
}

.home-projects__sort:hover {
  color: var(--fgColor-default);
}

.home-projects__sort:focus-visible {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: 2px;
  border-radius: var(--borderRadius-small);
}

.home-projects__row {
  cursor: pointer;
  transition: background-color 80ms ease-out;
}

.home-projects__row:hover {
  background-color: var(--bgColor-neutral-muted);
}

.home-projects__row:focus-visible {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: -2px;
}

.home-projects__td {
  height: 38px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--borderColor-muted);
  vertical-align: middle;
}

.home-projects__row:last-child .home-projects__td {
  border-bottom: none;
}

.home-projects__td--num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.home-projects__td--actions {
  width: 48px;
  text-align: right;
}

.home-projects__name {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: min(320px, 40vw);
}

.home-projects__name-icon {
  color: var(--fgColor-muted);
}

.home-projects__name-text {
  overflow: hidden;
  font-weight: var(--fontWeight-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-projects__progress {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.home-projects__bar {
  display: inline-flex;
  width: 60px;
  height: 6px;
  overflow: hidden;
  border-radius: var(--borderRadius-full);
  background-color: var(--bgColor-neutral-muted);
}

.home-projects__bar-fill {
  height: 100%;
  border-radius: inherit;
  background-color: var(--bgColor-success-emphasis);
}

.home-projects__percent {
  min-width: 34px;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  text-align: right;
}

.home-projects__updated {
  color: var(--fgColor-muted);
  font-family: var(--fontStack-system);
  font-size: var(--fontSize-caption);
}

.home-projects__skeleton {
  width: 100%;
  overflow-x: auto;
}

.home-projects__skeleton-inner {
  min-width: 640px;
}

.home-projects__skeleton-row {
  display: grid;
  grid-template-columns:
    minmax(120px, 2fr) 72px 72px 72px 120px 48px;
  align-items: center;
  gap: 12px;
  height: 38px;
  padding: 0 12px;
  border-bottom: 1px solid var(--borderColor-muted);
}

.home-projects__skeleton-row:last-child {
  border-bottom: none;
}

.home-projects__skeleton-row :last-child {
  justify-self: end;
}

@media (max-width: 600px) {
  .home-projects__filter {
    width: 100%;
    margin-left: 0;
  }

  .home-projects__name {
    max-width: 180px;
  }
}
</style>
