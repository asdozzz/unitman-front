<script setup lang="ts">
import {computed} from "vue";
import type {Statistika} from "@/modules/unit/store/SpisokUnitov/model/Unit";

const props = defineProps<{
  stats: Statistika | null;
}>();

/** Приводит процент из строки API к числу в диапазоне 0–100. */
function procent(znachenie: string | undefined): number {
  if (!znachenie) {
    return 0;
  }

  const chislo = Number.parseFloat(znachenie.replace(',', '.'));

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
    return 'unit-stats__value--negative';
  }

  if (znachenie >= 70) {
    return 'unit-stats__value--warning';
  }

  return 'unit-stats__value--muted';
}

/** Текст значения MEM: процент (если есть) и абсолют из API. */
const tekstPamyati = computed<string>(() => {
  if (!props.stats) {
    return '';
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
      <q-linear-progress
          class="unit-stats__bar"
          :value="cpu / 100"
          color="primary"
          size="4px"
          :aria-label="`CPU ${stats.cpuPercent}%`"
      />
      <span
          class="unit-stats__value text-mono text-tabular"
          :class="klassZnacheniya(cpu)"
          :title="`${stats.cpuPercent}%`"
      >
        {{ stats.cpuPercent }}%
      </span>
    </div>

    <div class="unit-stats__row">
      <span class="unit-stats__label">MEM</span>
      <q-linear-progress
          class="unit-stats__bar"
          :value="pamat / 100"
          color="primary"
          size="4px"
          :aria-label="`MEM ${tekstPamyati}`"
      />
      <span
          class="unit-stats__value text-mono text-tabular"
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
  font-size: var(--app-font-size-caption);
}

.unit-stats__label {
  color: var(--app-text-secondary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.unit-stats__bar {
  min-width: 0;
}

/* Трек из токена темы вместо Quasar-палитры (grey-3 ломал тёмную тему). */
.unit-stats__bar :deep(.q-linear-progress__track) {
  background: var(--app-surface-muted);
}

.unit-stats__value {
  min-width: 64px;
  text-align: right;
  white-space: nowrap;
}

.unit-stats__value--muted {
  color: var(--app-text-secondary);
}

.unit-stats__value--warning {
  color: var(--app-warning);
  font-weight: 600;
}

.unit-stats__value--negative {
  color: var(--app-negative);
  font-weight: 600;
}
</style>
