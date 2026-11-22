<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { GhButton, GhIcon, GhLabel } from "@/components/ui";
import type {
  PolzovatelFilterChip,
  PolzovatelFilterKey,
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/model/PolzovatelFiltri";

/**
 * Презентационный фрагмент: чипы встраиваются в строку фильтров
 * PolzovatelFilterBar.
 */
defineProps<{
  chips: PolzovatelFilterChip[];
}>();

const emit = defineEmits<{
  remove: [chip: { key: PolzovatelFilterKey; value?: string }];
  clear: [];
}>();

const { t } = useI18n();

/** Ключ фильтра совпадает с суффиксом перевода `filter.chip.*`. */
const KLYUCHI_PEREVODA: Record<PolzovatelFilterKey, string> = {
  search: "search",
  statuses: "statuses",
  role: "role",
};

/** Подпись чипа: готовый label, иначе перевод по ключу плюс значение. */
function podpisChipa(chip: PolzovatelFilterChip): string {
  if (chip.label) {
    return chip.label;
  }

  const bazovaya = t("account.spisok.filter.chip." + KLYUCHI_PEREVODA[chip.key]);

  if (chip.key === "statuses" && chip.value) {
    return `${bazovaya}: ${t("account.spisok.card.status." + chip.value)}`;
  }

  if (chip.value) {
    return `${bazovaya}: ${chip.value}`;
  }

  return bazovaya;
}

/** Стабильный ключ для v-for: один фильтр может дать несколько чипов. */
function klyuchChipa(chip: PolzovatelFilterChip): string {
  return `${chip.key}:${chip.value ?? ""}`;
}
</script>

<template>
  <template v-if="chips.length > 0">
    <span
      v-for="chip in chips"
      :key="klyuchChipa(chip)"
      class="filter-chip primer"
    >
      <GhLabel variant="neutral" :label="podpisChipa(chip)" />

      <button
        type="button"
        class="filter-chip__remove"
        :aria-label="t('account.spisok.filter.remove_chip')"
        @click="emit('remove', { key: chip.key, value: chip.value })"
      >
        <GhIcon name="x" :size="12" />
      </button>
    </span>

    <GhButton
      variant="invisible"
      size="sm"
      :label="t('account.spisok.filter.reset_all')"
      @click="emit('clear')"
    />
  </template>
</template>

<style scoped>
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
  padding: 2px;
  border: none;
  border-radius: var(--borderRadius-small);
  background: transparent;
  color: var(--fgColor-muted);
  cursor: pointer;
}

.filter-chip__remove:hover {
  color: var(--fgColor-default);
}

.filter-chip__remove:focus-visible {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: 2px;
}
</style>
