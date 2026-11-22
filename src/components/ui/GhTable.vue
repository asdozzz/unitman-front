<script setup lang="ts" generic="T extends Record<string, unknown>">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { QTableProps } from "quasar";
import type { GhTableColumn } from "./types";

const props = withDefaults(
  defineProps<{
    rows: T[];
    columns: GhTableColumn<T>[];
    rowKey?: string;
    loading?: boolean;
    hidePagination?: boolean;
    /** Текст пустого состояния; по умолчанию локализованный `common.table.no_data`. */
    emptyText?: string;
    /**
     * Убирает внешнюю рамку и радиус. Нужно, когда таблица вкладывается в
     * контейнер с собственным бордером (например, `GhBox` с `padding="none"`).
     * Применяется только к рендеру через слоты `#head`/`#body`.
     */
    borderless?: boolean;
  }>(),
  {
    rowKey: "id",
    loading: false,
    hidePagination: true,
    emptyText: "",
    borderless: false,
  },
);

const { t } = useI18n();

const tekstPustogoSostoyaniya = computed<string>(
  () => props.emptyText || t("common.table.no_data"),
);

// QTable ожидает собственные типы колонок/строк. Приводим их явно внутри
// компонента, чтобы публичный API оставался строго типизированным и без `any`.
const tablichnieKolonki = computed<QTableProps["columns"]>(
  () => props.columns as unknown as QTableProps["columns"],
);

const tablichnieStroki = computed<QTableProps["rows"]>(
  () => props.rows as unknown as QTableProps["rows"],
);

const strokiNaStranice: QTableProps["pagination"] = { rowsPerPage: 0 };
</script>

<template>
  <!--
    Кастомный рендер: используется, когда вызывающей стороне нужны
    собственные строки/ячейки (например, сортируемая шапка, progress-bar,
    GhActionMenu). Без слотов разметка и API остаются прежними (q-table).
  -->
  <div
    v-if="$slots.head || $slots.body"
    class="gh-table gh-table--custom primer"
    :class="{ 'gh-table--borderless': borderless }"
  >
    <div class="gh-table__scroll">
      <table class="gh-table__native">
        <thead v-if="$slots.head">
          <slot name="head" />
        </thead>

        <tbody>
          <slot name="body" />
        </tbody>
      </table>
    </div>
  </div>

  <q-table
    v-else
    class="gh-table primer"
    flat
    bordered
    dense
    :rows="tablichnieStroki"
    :columns="tablichnieKolonki"
    :row-key="rowKey"
    :loading="loading"
    :pagination="strokiNaStranice"
    :rows-per-page-options="[0]"
    :hide-pagination="hidePagination"
  >
    <template #no-data>
      <slot name="no-data">{{ tekstPustogoSostoyaniya }}</slot>
    </template>
  </q-table>
</template>

<style scoped>
.gh-table {
  overflow: hidden;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-medium);
  background-color: var(--bgColor-default);
  box-shadow: none;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.gh-table :deep(.q-table__card) {
  background-color: transparent;
  box-shadow: none;
  color: inherit;
}

.gh-table :deep(thead tr) {
  background-color: var(--bgColor-muted);
}

.gh-table :deep(thead th) {
  padding: 8px 12px;
  border-bottom: 1px solid var(--borderColor-default);
  color: var(--fgColor-muted);
  font-family: var(--fontStack-system);
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-semibold);
  letter-spacing: 0;
  text-transform: none;
}

.gh-table :deep(tbody td) {
  padding: 8px 12px;
  border-bottom: 1px solid var(--borderColor-muted);
  color: var(--fgColor-default);
  font-size: var(--fontSize-body);
}

.gh-table :deep(tbody tr:last-child td) {
  border-bottom: none;
}

.gh-table :deep(tbody tr) {
  transition: background-color 80ms ease-out;
}

.gh-table :deep(tbody tr:hover) {
  background-color: var(--bgColor-neutral-muted);
}

.gh-table :deep(tbody tr.q-table__row--selected) {
  background-color: var(--bgColor-accent-muted);
}

.gh-table :deep(.q-table__bottom) {
  border-top: 1px solid var(--borderColor-default);
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

/* --- Кастомный рендер через слоты #head / #body ------------------------ */

.gh-table--borderless {
  border: none;
  border-radius: 0;
  background-color: transparent;
}

.gh-table__scroll {
  width: 100%;
  overflow-x: auto;
}

.gh-table__native {
  width: 100%;
  border-collapse: collapse;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-normal);
}

.gh-table--custom :deep(thead tr) {
  background-color: var(--bgColor-muted);
}

.gh-table--custom :deep(thead th) {
  padding: 8px 12px;
  border-bottom: 1px solid var(--borderColor-default);
  color: var(--fgColor-muted);
  font-family: var(--fontStack-system);
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-semibold);
  letter-spacing: 0;
  text-align: left;
  text-transform: none;
  white-space: nowrap;
}

.gh-table--custom :deep(tbody td) {
  padding: 8px 12px;
  border-bottom: 1px solid var(--borderColor-muted);
  color: var(--fgColor-default);
  font-size: var(--fontSize-body);
}

.gh-table--custom :deep(tbody tr:last-child td) {
  border-bottom: none;
}

.gh-table--custom :deep(tbody tr) {
  transition: background-color 80ms ease-out;
}

.gh-table--custom :deep(tbody tr:hover) {
  background-color: var(--bgColor-neutral-muted);
}
</style>
