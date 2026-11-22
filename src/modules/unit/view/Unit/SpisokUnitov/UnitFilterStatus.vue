<script setup lang="ts">
import type { UnitFilterStatus } from "@/modules/unit/store/SpisokUnitov/model/UnitFilters";
import type { OcticonName } from "@/components/ui";
import { GhIcon } from "@/components/ui";

/** Описание одного статуса: иконка дублирует цвет, чтобы состояние читалось без цвета. */
type OpisanieStatusa = {
  status: UnitFilterStatus;
  icon: OcticonName;
};

/**
 * Порядок чипов заморожен контрактом: сначала самые «живые» состояния.
 * Иконки совпадают с `UnitStatusBadge` (P5).
 */
const STATUSI: OpisanieStatusa[] = [
  { status: "running", icon: "play" },
  { status: "prepared", icon: "check" },
  { status: "busy", icon: "sync" },
  { status: "stopped", icon: "pause" },
  { status: "error", icon: "x-circle" },
];

const props = defineProps<{
  modelValue: UnitFilterStatus[];
  counts: Record<UnitFilterStatus, number>;
  total: number;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: UnitFilterStatus[]];
}>();

/** Клик по «Все» сбрасывает выбор статусов. */
function vybratVse() {
  emit("update:modelValue", []);
}

/** Мультивыбор: статус добавляется или убирается без потери остальных. */
function pereklyuchit(status: UnitFilterStatus) {
  const vibrali = new Set<UnitFilterStatus>(props.modelValue);

  if (vibrali.has(status)) {
    vibrali.delete(status);
  } else {
    vibrali.add(status);
  }

  emit("update:modelValue", Array.from(vibrali));
}

/** Счётчик может прийти неполным — отсутствующее значение показывает 0. */
function schetchik(status: UnitFilterStatus): number {
  return props.counts[status] ?? 0;
}
</script>

<template>
  <div
    class="status-filter"
    role="group"
    :aria-label="$t('unit.spisok_unitov.filter.status_label')"
  >
    <button
      type="button"
      class="status-chip status-chip--all"
      :class="{ 'status-chip--active': modelValue.length === 0 }"
      :aria-pressed="modelValue.length === 0 ? 'true' : 'false'"
      @click="vybratVse"
    >
      <span class="status-chip__label">{{ $t("unit.spisok_unitov.filter.status_all") }}</span>
      <span class="status-chip__count text-tabular">{{ total }}</span>
    </button>

    <button
      v-for="item in STATUSI"
      :key="item.status"
      type="button"
      class="status-chip"
      :class="[
        `status-chip--${item.status}`,
        { 'status-chip--active': modelValue.includes(item.status) },
      ]"
      :aria-pressed="modelValue.includes(item.status) ? 'true' : 'false'"
      @click="pereklyuchit(item.status)"
    >
      <GhIcon :name="item.icon" :size="14" class="status-chip__icon" />
      <span class="status-chip__label">{{
        $t("unit.spisok_unitov.card.status." + item.status)
      }}</span>
      <span class="status-chip__count text-tabular">{{ schetchik(item.status) }}</span>
    </button>
  </div>
</template>

<style scoped>
.status-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 32px;
  padding: 4px 12px;
  border: 1px solid transparent;
  border-radius: var(--borderRadius-full);
  background-color: transparent;
  color: var(--fgColor-muted);
  font-family: inherit;
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color 80ms ease-out,
    border-color 80ms ease-out,
    color 80ms ease-out;
}

.status-chip:hover {
  border-color: var(--borderColor-default);
  background-color: var(--bgColor-muted);
}

.status-chip:focus-visible {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: 2px;
}

.status-chip__icon {
  flex: 0 0 auto;
  color: var(--fgColor-muted);
}

.status-chip__count {
  color: inherit;
  font-weight: var(--fontWeight-normal);
}

.status-chip--running .status-chip__icon {
  color: var(--fgColor-success);
}

.status-chip--prepared .status-chip__icon {
  color: var(--fgColor-muted);
}

.status-chip--busy .status-chip__icon {
  color: var(--fgColor-accent);
}

.status-chip--stopped .status-chip__icon {
  color: var(--fgColor-muted);
}

.status-chip--error .status-chip__icon {
  color: var(--fgColor-danger);
}

/*
 * Активный чип: цветная иконка + цветной текст + тонкий бордер.
 * Заливки нет — меньше цвета, чётче скан.
 */
.status-chip--all.status-chip--active {
  border-color: var(--borderColor-accent-muted);
  background-color: var(--bgColor-accent-muted);
  color: var(--fgColor-accent);
}

.status-chip--running.status-chip--active {
  border-color: var(--borderColor-success-muted);
  background-color: var(--bgColor-success-muted);
  color: var(--fgColor-success);
}

.status-chip--busy.status-chip--active {
  border-color: var(--borderColor-accent-muted);
  background-color: var(--bgColor-accent-muted);
  color: var(--fgColor-accent);
}

.status-chip--prepared.status-chip--active {
  border-color: var(--borderColor-default);
  background-color: var(--bgColor-neutral-muted);
  color: var(--fgColor-default);
}

.status-chip--stopped.status-chip--active {
  border-color: var(--borderColor-default);
  background-color: var(--bgColor-neutral-muted);
  color: var(--fgColor-default);
}

.status-chip--error.status-chip--active {
  border-color: var(--borderColor-danger-muted);
  background-color: var(--bgColor-danger-muted);
  color: var(--fgColor-danger);
}
</style>
