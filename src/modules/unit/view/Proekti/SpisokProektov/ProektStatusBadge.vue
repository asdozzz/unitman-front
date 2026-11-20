<script setup lang="ts">
import {computed} from "vue";
import type {ProektUiState} from "@/modules/unit/utils/proektStatus";

const props = withDefaults(defineProps<{
  state: ProektUiState;
  compact?: boolean;
}>(), {
  compact: false,
});

/** Иконка дублирует текст, чтобы состояние читалось и без цвета. */
const ikonka = computed<string>(() => {
  switch (props.state.status) {
    case "success":
      return "check_circle";
    case "new":
      return "fiber_new";
    case "error":
      return "error";
    case "busy":
    default:
      return "sync";
  }
});
</script>

<template>
  <span
      class="proekt-status"
      :class="[`proekt-status--${state.status}`, {'proekt-status--compact': compact}]"
      role="status"
  >
    <q-spinner v-if="state.status === 'busy'" size="14px" />
    <q-icon v-else :name="ikonka" size="16px" />

    <span class="proekt-status__label">{{ $t(state.labelKey) }}</span>
  </span>
</template>

<style scoped>
.proekt-status {
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

.proekt-status__label {
  letter-spacing: 0.02em;
}

.proekt-status--busy {
  color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 12%, transparent);
}

.proekt-status--success {
  color: var(--app-positive);
  background: color-mix(in srgb, var(--app-positive) 12%, transparent);
}

.proekt-status--new {
  color: var(--app-text-secondary);
  background: var(--app-surface-muted);
}

.proekt-status--error {
  color: var(--app-negative);
  background: color-mix(in srgb, var(--app-negative) 12%, transparent);
}

/* В компактной строке фон не нужен: состояние читается по иконке и тексту. */
.proekt-status--compact {
  min-height: 20px;
  padding: 0;
  background: transparent;
}
</style>
