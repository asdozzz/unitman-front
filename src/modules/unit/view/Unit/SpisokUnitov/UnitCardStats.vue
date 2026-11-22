<script setup lang="ts">
import { computed } from "vue";
import type { Statistika } from "@/modules/unit/store/SpisokUnitov/model/Unit";

const props = defineProps<{
  stats: Statistika | null;
}>();

/** Приводит процент из строки API к числу в диапазоне 0–100. */
function procent(znachenie: string | undefined): number {
  if (!znachenie) {
    return 0;
  }

  const chislo = Number.parseFloat(znachenie.replace(",", "."));

  if (!Number.isFinite(chislo)) {
    return 0;
  }

  return Math.min(100, Math.max(0, chislo));
}

const cpu = computed<number>(() => procent(props.stats?.cpuPercent));
const pamat = computed<number>(() => procent(props.stats?.memoryPercent));

/** Класс значения: цветом горит только цифра при 70/90%, бар всегда нейтрален. */
function klassZnacheniya(znachenie: number): string {
  if (znachenie >= 90) {
    return "unit-stats__value--negative";
  }

  if (znachenie >= 70) {
    return "unit-stats__value--warning";
  }

  return "unit-stats__value--muted";
}

/** Текст значения MEM: процент (если есть) и абсолют из API. */
const tekstPamyati = computed<string>(() => {
  if (!props.stats) {
    return "";
  }

  if (props.stats.memoryPercent) {
    return `${props.stats.memoryPercent}% · ${props.stats.memoryUsage}`;
  }

  return props.stats.memoryUsage;
});
</script>

<template>
  <div v-if="stats" class="unit-stats">
    <div class="unit-stats__row">
      <span class="unit-stats__label">CPU</span>
      <span
        class="unit-stats__bar"
        role="progressbar"
        :aria-valuenow="cpu"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`CPU ${stats.cpuPercent}%`"
      >
        <span class="unit-stats__bar-fill" :style="{ width: `${cpu}%` }" />
      </span>
      <span
        class="unit-stats__value gh-mono text-tabular"
        :class="klassZnacheniya(cpu)"
        :title="`${stats.cpuPercent}%`"
      >
        {{ stats.cpuPercent }}%
      </span>
    </div>

    <div class="unit-stats__row">
      <span class="unit-stats__label">MEM</span>
      <span
        class="unit-stats__bar"
        role="progressbar"
        :aria-valuenow="pamat"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`MEM ${tekstPamyati}`"
      >
        <span class="unit-stats__bar-fill" :style="{ width: `${pamat}%` }" />
      </span>
      <span
        class="unit-stats__value gh-mono text-tabular"
        :class="klassZnacheniya(pamat)"
        :title="tekstPamyati"
      >
        {{ tekstPamyati }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.unit-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.unit-stats__row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  font-size: var(--fontSize-caption);
}

.unit-stats__label {
  color: var(--fgColor-muted);
  font-size: 11px;
  font-weight: var(--fontWeight-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.unit-stats__bar {
  display: inline-flex;
  min-width: 0;
  height: 4px;
  overflow: hidden;
  border-radius: var(--borderRadius-full);
  background-color: var(--bgColor-neutral-muted);
}

.unit-stats__bar-fill {
  height: 100%;
  border-radius: inherit;
  background-color: var(--bgColor-success-emphasis);
}

.unit-stats__value {
  min-width: 64px;
  text-align: right;
  white-space: nowrap;
}

.unit-stats__value--muted {
  color: var(--fgColor-muted);
}

.unit-stats__value--warning {
  color: var(--fgColor-attention);
  font-weight: var(--fontWeight-semibold);
}

.unit-stats__value--negative {
  color: var(--fgColor-danger);
  font-weight: var(--fontWeight-semibold);
}
</style>
