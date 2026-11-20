<script setup lang="ts">
import {useI18n} from "vue-i18n";
import type {
  HranilishaFilterChip,
  HranilishaFilterKey,
} from "@/modules/unit/store/SpisokHranilish/model/HranilishaFiltri";

/**
 * Презентационный фрагмент: чипы встраиваются в строку 2 HranilishaFilterBar,
 * собственной строки-обёртки (padding/фон) у компонента нет.
 */
defineProps<{
  chips: HranilishaFilterChip[];
}>();

const emit = defineEmits<{
  remove: [chip: {key: HranilishaFilterKey; value?: string}];
  clear: [];
}>();

const {t} = useI18n();

/** Ключи фильтра не совпадают с суффиксами перевода один в один. */
const KLYUCHI_PEREVODA: Record<HranilishaFilterKey, string> = {
  search: "search",
  type: "type",
  statuses: "statuses",
};

/**
 * Ключи, у которых значение чипа показывается как есть (подстрока, тип).
 * Для `statuses` значение — статус и переводится отдельно.
 */
const KLUCHI_SO_ZNACHENIEM = new Set<HranilishaFilterKey>([
  "search",
  "type",
]);

/** Подпись чипа: готовый label, иначе перевод по ключу плюс значение. */
function podpisChipa(chip: HranilishaFilterChip): string {
  if (chip.label) {
    return chip.label;
  }

  const bazovaya = t("unit.spisok_rep.filter.chip." + KLYUCHI_PEREVODA[chip.key]);

  if (chip.key === "statuses" && chip.value) {
    return `${bazovaya}: ${t("unit.spisok_rep.card.status." + chip.value)}`;
  }

  if (chip.value && KLUCHI_SO_ZNACHENIEM.has(chip.key)) {
    return `${bazovaya}: ${chip.value}`;
  }

  return bazovaya;
}

/** Стабильный ключ для v-for: один фильтр может дать несколько чипов. */
function klyuchChipa(chip: HranilishaFilterChip): string {
  return `${chip.key}:${chip.value ?? ""}`;
}
</script>

<template>
  <template v-if="chips.length > 0">
    <q-chip
        v-for="chip in chips"
        :key="klyuchChipa(chip)"
        class="filter-chip"
        dense
        removable
        delete-icon="close"
        :aria-label="podpisChipa(chip)"
        @remove="emit('remove', {key: chip.key, value: chip.value})"
    >
      {{ podpisChipa(chip) }}
    </q-chip>

    <button
        type="button"
        class="filter-chips__reset"
        @click="emit('clear')"
    >
      {{ $t('unit.spisok_rep.filter.reset_all') }}
    </button>
  </template>
</template>

<style scoped>
/* Neutral-чипы: бордер + secondary-текст + крестик, без primary-заливки. */
.filter-chip {
  display: inline-flex;
  align-items: center;
  height: 32px;
  margin: 0;
  padding: 0 var(--app-space-2) 0 var(--app-space-3);
  border: 1px solid var(--app-border);
  border-radius: 0;
  background: var(--app-surface);
  color: var(--app-text-secondary);
  font-size: var(--app-font-size-caption);
  font-weight: 600;
  white-space: nowrap;
}

.filter-chip :deep(.q-chip__content) {
  padding: 0;
}

.filter-chip :deep(.q-chip__icon--remove) {
  width: 18px;
  height: 18px;
  margin: 0 0 0 var(--app-space-1);
  color: var(--app-text-secondary);
  font-size: 16px;
  opacity: 0.85;
}

.filter-chip :deep(.q-chip__icon--remove:hover) {
  color: var(--app-text);
  opacity: 1;
}

.filter-chips__reset {
  border: none;
  background: none;
  padding: 0 var(--app-space-1);
  color: var(--app-text-secondary);
  font-family: inherit;
  font-size: var(--app-font-size-caption);
  font-weight: 600;
  line-height: var(--app-line-height-tight);
  white-space: nowrap;
  cursor: pointer;
  transition: color var(--app-duration-fast) var(--app-easing);
}

.filter-chips__reset:hover {
  color: var(--app-primary);
  text-decoration: underline;
}

.filter-chips__reset:focus-visible {
  outline: 2px solid var(--app-focus-ring);
  outline-offset: 2px;
}
</style>
