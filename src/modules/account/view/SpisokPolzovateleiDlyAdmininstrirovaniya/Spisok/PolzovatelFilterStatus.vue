<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { GhLabel } from "@/components/ui";
import type { GhLabelVariant, OcticonName } from "@/components/ui";
import type { PolzovatelFilterStatus } from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/model/PolzovatelFiltri";

/** Описание одного статуса: порядок чипов фиксирован. */
type OpisanieStatusa = {
  status: PolzovatelFilterStatus;
  icon: OcticonName;
};

const { t } = useI18n();

const STATUSI: OpisanieStatusa[] = [
  { status: "active", icon: "check-circle" },
  { status: "blocked", icon: "x-circle" },
];

const props = defineProps<{
  modelValue: PolzovatelFilterStatus[];
  counts: Record<PolzovatelFilterStatus, number>;
  total: number;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: PolzovatelFilterStatus[]];
}>();

/** Клик по «Все» сбрасывает выбор статусов. */
function vybratVse(): void {
  emit("update:modelValue", []);
}

/** Мультивыбор: статус добавляется или убирается без потери остальных. */
function pereklyuchit(status: PolzovatelFilterStatus): void {
  const vibrali = new Set<PolzovatelFilterStatus>(props.modelValue);

  if (vibrali.has(status)) {
    vibrali.delete(status);
  } else {
    vibrali.add(status);
  }

  emit("update:modelValue", Array.from(vibrali));
}

/** Вариант бейджа: невыбранный статус нейтрален, выбранный окрашен. */
function variant(status: PolzovatelFilterStatus, aktiven: boolean): GhLabelVariant {
  if (!aktiven) {
    return "neutral";
  }

  return status === "active" ? "success" : "danger";
}

/** Счётчик может прийти неполным — отсутствующее значение показывает 0. */
function schetchik(status: PolzovatelFilterStatus): number {
  return props.counts[status] ?? 0;
}
</script>

<template>
  <div
    class="status-filter primer"
    role="group"
    :aria-label="t('account.spisok.filter.status_label')"
  >
    <button
      type="button"
      class="status-filter__chip"
      :aria-pressed="modelValue.length === 0 ? 'true' : 'false'"
      @click="vybratVse"
    >
      <GhLabel
        :variant="modelValue.length === 0 ? 'accent' : 'neutral'"
        :label="t('account.spisok.filter.status_all')"
      />
      <span class="status-filter__count">{{ total }}</span>
    </button>

    <button
      v-for="item in STATUSI"
      :key="item.status"
      type="button"
      class="status-filter__chip"
      :aria-pressed="modelValue.includes(item.status) ? 'true' : 'false'"
      @click="pereklyuchit(item.status)"
    >
      <GhLabel
        :variant="variant(item.status, modelValue.includes(item.status))"
        :icon="item.icon"
        :label="t('account.spisok.card.status.' + item.status)"
      />
      <span class="status-filter__count">{{ schetchik(item.status) }}</span>
    </button>
  </div>
</template>

<style scoped>
.status-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.status-filter__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  border-radius: var(--borderRadius-full);
  background: transparent;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
  cursor: pointer;
}

.status-filter__chip:focus-visible {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: 2px;
}

.status-filter__count {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  font-variant-numeric: tabular-nums;
}
</style>
