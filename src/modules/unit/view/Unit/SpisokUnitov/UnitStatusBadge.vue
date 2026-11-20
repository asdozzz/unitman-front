<script setup lang="ts">
import {computed} from "vue";
import type {UnitUiState} from "@/modules/unit/utils/unitStatus";

const props = withDefaults(defineProps<{
  state: UnitUiState;
  compact?: boolean;
}>(), {
  compact: false,
});

/** Иконка дублирует текст, чтобы состояние читалось и без цвета. */
const ikonka = computed<string>(() => {
  switch (props.state.status) {
    case "running":
      return "play_arrow";
    case "prepared":
      return "check_circle";
    case "stopped":
      return "pause";
    case "error":
    case "broken":
      return "error";
    case "busy":
    default:
      return "sync";
  }
});
</script>

<template>
  <span
      class="unit-status"
      :class="[`unit-status--${state.status}`, {'unit-status--compact': compact}]"
      role="status"
  >
    <q-spinner v-if="state.status === 'busy'" size="14px" />
    <q-icon v-else :name="ikonka" size="16px" />

    <span class="unit-status__label">{{ $t(state.labelKey) }}</span>

    <span v-if="state.busyText && !compact" class="unit-status__detail">
      {{ $t('unit.tipi_zadach.' + state.busyText) }}
    </span>

    <q-tooltip v-if="state.prozesAktiven">
      <div v-if="state.busyText">{{ $t('unit.tipi_zadach.' + state.busyText) }}</div>
      <div v-if="state.progress">
        {{ $t('unit.spisok_unitov.card.status.process_progress', {
          done: state.progress.zaversheno,
          total: state.progress.vsego,
        }) }}
      </div>
    </q-tooltip>
  </span>
</template>

<style scoped>
.unit-status {
  display: inline-flex;
  align-items: center;
  gap: var(--app-space-1);
  min-height: 28px;
  padding: var(--app-space-1) var(--app-space-2);
  border-radius: var(--app-radius-pill);
  font-size: var(--app-font-size-caption);
  font-weight: 600;
  line-height: var(--app-line-height-tight);
  white-space: nowrap;
}

.unit-status__label {
  letter-spacing: 0.02em;
}

.unit-status__detail {
  font-weight: 400;
  opacity: 0.85;
}

.unit-status--running {
  color: var(--app-positive);
  background: color-mix(in srgb, var(--app-positive) 12%, transparent);
}

/* «В работе» — единственный синий статус: активный процесс окрашивается брендом. */
.unit-status--busy {
  color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 12%, transparent);
}

/* «Готов» — нейтральное ожидание: цвет не конкурирует с «в работе». */
.unit-status--prepared {
  color: var(--app-text-secondary);
  background: var(--app-surface-muted);
}

.unit-status--stopped {
  color: var(--app-text-secondary);
  background: var(--app-surface-muted);
}

.unit-status--error,
.unit-status--broken {
  color: var(--app-negative);
  background: color-mix(in srgb, var(--app-negative) 12%, transparent);
}

/* В компактной строке фон не нужен: состояние читается по точке и тексту. */
.unit-status--compact {
  min-height: 20px;
  padding: 0;
  background: transparent;
}
</style>
