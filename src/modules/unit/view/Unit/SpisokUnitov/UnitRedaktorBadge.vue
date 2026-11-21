<script setup lang="ts">
import {computed} from "vue";

const props = defineProps<{
  mode: "view" | "edit" | "locked" | null;
  prichinaZapreta: string | null;
}>();

/** Иконка дублирует текст, чтобы режим читался и без цвета. */
const ikonka = computed<string>(() => {
  switch (props.mode) {
    case "edit":
      return "edit";
    case "view":
      return "visibility";
    case "locked":
      return "lock";
    default:
      return "edit";
  }
});

/** Ключ перевода подписи режима. */
const klyuchPodpisi = computed<string | null>(() => {
  return props.mode ? `unit.redaktor.badge.${props.mode}` : null;
});

/** Причина запрета приходит с бэкенда; неизвестную показываем как есть. */
const klyuchPrichini = computed<string | null>(() => {
  if (!props.prichinaZapreta) {
    return null;
  }

  const klyuch = `unit.redaktor.prichina.${props.prichinaZapreta}`;

  return klyuch;
});
</script>

<template>
  <span
      v-if="mode"
      class="unit-redaktor"
      :class="[`unit-redaktor--${mode}`]"
  >
    <q-icon :name="ikonka" size="14px" />
    <span class="unit-redaktor__label">{{ $t(klyuchPodpisi as string) }}</span>

    <q-tooltip v-if="klyuchPrichini">
      {{ $t(klyuchPrichini) }}
    </q-tooltip>
  </span>
</template>

<style scoped>
.unit-redaktor {
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

.unit-redaktor__label {
  letter-spacing: 0.02em;
}

.unit-redaktor--edit {
  color: var(--app-positive);
  background: color-mix(in srgb, var(--app-positive) 12%, transparent);
}

.unit-redaktor--view {
  color: var(--app-text-secondary);
  background: var(--app-surface-muted);
}

.unit-redaktor--locked {
  color: var(--app-negative);
  background: color-mix(in srgb, var(--app-negative) 12%, transparent);
}
</style>
