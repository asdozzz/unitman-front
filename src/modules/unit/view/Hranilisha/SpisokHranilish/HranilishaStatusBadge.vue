<script setup lang="ts">
import {computed} from "vue";

const props = withDefaults(defineProps<{
  /** Подтверждён ли доступ к репозиторию. */
  confirmed: boolean;
  compact?: boolean;
}>(), {
  compact: false,
});

/** Подтверждение — зелёная галочка, ожидание — нейтральные песочные часы. */
const ikonka = computed<string>(() => {
  return props.confirmed ? "check_circle" : "hourglass_empty";
});

const modifikator = computed<string>(() => {
  return props.confirmed ? "confirmed" : "unconfirmed";
});

const labelKey = computed<string>(() => {
  return props.confirmed
      ? "unit.spisok_rep.card.status.confirmed"
      : "unit.spisok_rep.card.status.unconfirmed";
});
</script>

<template>
  <span
      class="hranilisha-status"
      :class="[`hranilisha-status--${modifikator}`, {'hranilisha-status--compact': compact}]"
      role="status"
  >
    <q-icon :name="ikonka" size="16px" />

    <span class="hranilisha-status__label">{{ $t(labelKey) }}</span>
  </span>
</template>

<style scoped>
.hranilisha-status {
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

.hranilisha-status__label {
  letter-spacing: 0.02em;
}

.hranilisha-status--confirmed {
  color: var(--app-positive);
  background: color-mix(in srgb, var(--app-positive) 12%, transparent);
}

.hranilisha-status--unconfirmed {
  color: var(--app-text-secondary);
  background: var(--app-surface-muted);
}

/* В компактной строке фон не нужен: состояние читается по иконке и тексту. */
.hranilisha-status--compact {
  min-height: 20px;
  padding: 0;
  background: transparent;
}
</style>
