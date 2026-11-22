<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type {
  UnitFilterChip,
  UnitFilterKey,
} from "@/modules/unit/store/SpisokUnitov/model/UnitFilters";
import { GhIcon, GhLabel } from "@/components/ui";

/**
 * Презентационный фрагмент: чипсы встраиваются в строку 2 UnitFilterBar,
 * собственной строки-обёртки (padding/фон) у компонента нет.
 */
defineProps<{
  chips: UnitFilterChip[];
}>();

const emit = defineEmits<{
  remove: [chip: { key: UnitFilterKey; value?: string }];
  clear: [];
}>();

const { t } = useI18n();

/**
 * Ключ фильтра не всегда совпадает с суффиксом перевода:
 * `unitId` → `chip.unit_id`, `unitIds` → `chip.svyazi`.
 */
const KLYUCHI_PEREVODA: Record<UnitFilterKey, string> = {
  search: "search",
  name: "name",
  branch: "branch",
  projectId: "project",
  onlyMine: "only_mine",
  statuses: "statuses",
  unitId: "unit_id",
  unitIds: "svyazi",
};

/**
 * Ключи, у которых значение чипа показывается как есть (подстрока, id, ветка).
 * Для `statuses` значение — статус и переводится отдельно.
 */
const KLUCHI_SO_ZNACHENIEM = new Set<UnitFilterKey>([
  "search",
  "name",
  "branch",
  "unitId",
  "unitIds",
]);

/** Подпись чипа: готовый label, иначе перевод по ключу плюс значение. */
function podpisChipa(chip: UnitFilterChip): string {
  if (chip.label) {
    return chip.label;
  }

  const bazovaya = t("unit.spisok_unitov.filter.chip." + KLYUCHI_PEREVODA[chip.key]);

  if (chip.key === "statuses" && chip.value) {
    return `${bazovaya}: ${t("unit.spisok_unitov.card.status." + chip.value)}`;
  }

  if (chip.value && KLUCHI_SO_ZNACHENIEM.has(chip.key)) {
    return `${bazovaya}: ${chip.value}`;
  }

  return bazovaya;
}

/** Стабильный ключ для v-for: один фильтр может дать несколько чипов. */
function klyuchChipa(chip: UnitFilterChip): string {
  return `${chip.key}:${chip.value ?? ""}`;
}
</script>

<template>
  <template v-if="chips.length > 0">
    <span
      v-for="chip in chips"
      :key="klyuchChipa(chip)"
      class="filter-chip"
    >
      <GhLabel variant="neutral">{{ podpisChipa(chip) }}</GhLabel>

      <button
        type="button"
        class="filter-chip__remove"
        :aria-label="podpisChipa(chip)"
        @click="emit('remove', { key: chip.key, value: chip.value })"
      >
        <GhIcon name="x" :size="12" />
      </button>
    </span>

    <button
      type="button"
      class="filter-chips__reset"
      @click="emit('clear')"
    >
      {{ $t("unit.spisok_unitov.filter.reset_all") }}
    </button>
  </template>
</template>

<style scoped>
/* Neutral-чипсы: GhLabel + отдельная кнопка снятия, без primary-заливки. */
.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
}

.filter-chip__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: var(--borderRadius-full);
  background: transparent;
  color: var(--fgColor-muted);
  cursor: pointer;
}

.filter-chip__remove:hover {
  background-color: var(--bgColor-neutral-muted);
  color: var(--fgColor-default);
}

.filter-chip__remove:focus-visible {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: 1px;
}

.filter-chips__reset {
  border: none;
  background: none;
  padding: 0 4px;
  color: var(--fgColor-muted);
  font-family: inherit;
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
