<script setup lang="ts">
import {useI18n} from "vue-i18n";
import {GhIcon} from "@/components/ui";
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
    <button
        v-for="chip in chips"
        :key="klyuchChipa(chip)"
        type="button"
        class="filter-chip"
        :aria-label="$t('unit.spisok_rep.filter.chip.remove', {label: podpisChipa(chip)})"
        @click="emit('remove', {key: chip.key, value: chip.value})"
    >
      <span class="filter-chip__label">{{ podpisChipa(chip) }}</span>
      <GhIcon name="x" :size="12" class="filter-chip__icon" />
    </button>

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
.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  margin: 0;
  padding: 0 8px 0 10px;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-full);
  background: var(--bgColor-default);
  color: var(--fgColor-muted);
  font-family: var(--fontStack-system);
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-medium);
  line-height: var(--lineHeight-tight);
  white-space: nowrap;
  cursor: pointer;
  transition:
      background-color 80ms ease-out,
      color 80ms ease-out;
}

.filter-chip:hover {
  background: var(--bgColor-neutral-muted);
  color: var(--fgColor-default);
}

.filter-chip:focus-visible {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: 2px;
}

.filter-chip__icon {
  color: var(--fgColor-muted);
}

.filter-chips__reset {
  border: none;
  background: none;
  padding: 0 4px;
  color: var(--fgColor-muted);
  font-family: var(--fontStack-system);
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
  white-space: nowrap;
  cursor: pointer;
  transition: color 80ms ease-out;
}

.filter-chips__reset:hover {
  color: var(--fgColor-accent);
  text-decoration: underline;
}

.filter-chips__reset:focus-visible {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: 2px;
}
</style>
