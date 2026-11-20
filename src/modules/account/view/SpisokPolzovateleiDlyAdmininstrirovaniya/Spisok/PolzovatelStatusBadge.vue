<script setup lang="ts">
import {computed} from "vue";
import type {PolzovatelFilterStatus} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/model/PolzovatelFiltri";

const props = withDefaults(defineProps<{
  status: PolzovatelFilterStatus;
  compact?: boolean;
}>(), {
  compact: false,
});

/** Иконка дублирует текст, чтобы статус читался и без цвета. */
const ikonka = computed<string>(() => {
  return props.status === "blocked" ? "block" : "check_circle";
});
</script>

<template>
  <span
      class="polzovatel-status"
      :class="[`polzovatel-status--${status}`, {'polzovatel-status--compact': compact}]"
      role="status"
  >
    <q-icon :name="ikonka" size="16px" />

    <span class="polzovatel-status__label">
      {{ $t('account.spisok.card.status.' + status) }}
    </span>
  </span>
</template>

<style scoped>
.polzovatel-status {
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

.polzovatel-status__label {
  letter-spacing: 0.02em;
}

.polzovatel-status--active {
  color: var(--app-positive);
  background: color-mix(in srgb, var(--app-positive) 12%, transparent);
}

.polzovatel-status--blocked {
  color: var(--app-negative);
  background: color-mix(in srgb, var(--app-negative) 12%, transparent);
}

/* В компактной строке фон не нужен: состояние читается по иконке и тексту. */
.polzovatel-status--compact {
  min-height: 20px;
  padding: 0;
  background: transparent;
}
</style>
