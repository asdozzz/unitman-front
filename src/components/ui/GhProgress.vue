<script setup lang="ts">
import { computed } from "vue";
import type { GhProgressLevel } from "./types";

const props = withDefaults(
  defineProps<{
    /** Заполнение в процентах (0–100). */
    value: number;
    /** Уровень угрозы: задаёт цвет полосы. */
    level?: GhProgressLevel;
    /** Подпись слева над полосой. */
    label?: string;
    /** Показывать числовое значение справа над полосой. */
    showValue?: boolean;
    size?: "sm" | "md";
  }>(),
  {
    level: "ok",
    label: "",
    showValue: true,
    size: "md",
  },
);

const procent = computed<number>(() => {
  if (!Number.isFinite(props.value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(props.value * 100) / 100));
});

const podpis = computed<string>(() => `${procent.value.toFixed(1)}%`);
</script>

<template>
  <div
    class="gh-progress primer"
    :class="[`gh-progress--${level}`, `gh-progress--${size}`]"
  >
    <div v-if="label || showValue" class="gh-progress__header">
      <span v-if="label" class="gh-progress__label">{{ label }}</span>
      <span v-if="showValue" class="gh-progress__value">{{ podpis }}</span>
    </div>
    <div
      class="gh-progress__track"
      role="progressbar"
      :aria-valuenow="procent"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="label || undefined"
    >
      <div class="gh-progress__bar" :style="{ width: `${procent}%` }" />
    </div>
  </div>
</template>

<style scoped>
.gh-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: var(--fontStack-system);
  color: var(--fgColor-default);
}

.gh-progress__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  font-size: var(--fontSize-caption);
}

.gh-progress__label {
  color: var(--fgColor-muted);
}

.gh-progress__value {
  font-variant-numeric: tabular-nums;
  font-weight: var(--fontWeight-semibold);
}

.gh-progress__track {
  overflow: hidden;
  height: 8px;
  background-color: var(--bgColor-neutral-muted);
  border-radius: 999px;
}

.gh-progress--sm .gh-progress__track {
  height: 6px;
}

.gh-progress__bar {
  height: 100%;
  border-radius: 999px;
  transition: width 0.2s ease;
}

.gh-progress--ok .gh-progress__bar {
  background-color: var(--bgColor-success-emphasis);
}

/* Справочные показатели (CPU): не окрашиваются по уровням угрозы. */
.gh-progress--neutral .gh-progress__bar {
  background-color: var(--bgColor-accent-emphasis);
}

.gh-progress--warning .gh-progress__bar {
  background-color: var(--fgColor-attention);
}

.gh-progress--critical .gh-progress__bar {
  background-color: var(--bgColor-danger-emphasis);
}

/* «Чёрный» уровень: полоса контрастна относительно обычного текста темы. */
.gh-progress--blocker .gh-progress__bar {
  background-color: var(--fgColor-default);
}
</style>
