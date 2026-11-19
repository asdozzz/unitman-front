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

/** Цвет полосы повторяет пороги, привычные по системному мониторингу. */
function cvet(znachenie: number): string {
  if (znachenie >= 90) {
    return 'negative';
  }

  if (znachenie >= 70) {
    return 'warning';
  }

  return 'positive';
}
</script>

<template>
  <div v-if="stats" class="unit-stats">
    <div class="unit-stats__row">
      <span class="unit-stats__label">CPU</span>
      <q-linear-progress
          class="unit-stats__bar"
          :value="cpu / 100"
          :color="cvet(cpu)"
          track-color="grey-3"
          size="6px"
          rounded
          :aria-label="`CPU ${stats.cpuPercent}%`"
      />
      <span class="unit-stats__value text-mono">{{ stats.cpuPercent }}%</span>
    </div>

    <div class="unit-stats__row">
      <span class="unit-stats__label">MEM</span>
      <q-linear-progress
          class="unit-stats__bar"
          :value="pamat / 100"
          :color="cvet(pamat)"
          track-color="grey-3"
          size="6px"
          rounded
          :aria-label="`MEM ${stats.memoryUsage}`"
      />
      <span class="unit-stats__value text-mono" :title="stats.memoryUsage">{{ stats.memoryUsage }}</span>
    </div>
  </div>
</template>

<style scoped>
.unit-stats {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-1);
}

.unit-stats__row {
  display: grid;
  grid-template-columns: 40px minmax(60px, 1fr) auto;
  align-items: center;
  gap: var(--app-space-2);
  font-size: var(--app-font-size-caption);
}

.unit-stats__label {
  color: var(--app-text-secondary);
  font-weight: 600;
  letter-spacing: 0.04em;
}

.unit-stats__bar {
  min-width: 0;
}

.unit-stats__value {
  color: var(--app-text-secondary);
  white-space: nowrap;
}
</style>
