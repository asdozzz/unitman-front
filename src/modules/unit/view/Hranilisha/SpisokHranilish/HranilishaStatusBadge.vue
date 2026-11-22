<script setup lang="ts">
import {computed} from "vue";
import {GhLabel} from "@/components/ui";
import type {GhLabelVariant, OcticonName} from "@/components/ui";

const props = withDefaults(defineProps<{
  /** Подтверждён ли доступ к репозиторию. */
  confirmed: boolean;
  compact?: boolean;
}>(), {
  compact: false,
});

/** Подтверждение — зелёная галочка, ожидание — нейтральный статус. */
const ikonka = computed<OcticonName>(() => {
  return props.confirmed ? "check-circle" : "circle";
});

const variant = computed<GhLabelVariant>(() => {
  return props.confirmed ? "success" : "neutral";
});

const labelKey = computed<string>(() => {
  return props.confirmed
      ? "unit.spisok_rep.card.status.confirmed"
      : "unit.spisok_rep.card.status.unconfirmed";
});
</script>

<template>
  <span class="hranilisha-status" :class="{'hranilisha-status--compact': compact}" role="status">
    <GhLabel :variant="variant" :icon="ikonka" :label="$t(labelKey)" />
  </span>
</template>

<style scoped>
.hranilisha-status {
  display: inline-flex;
  align-items: center;
}

.hranilisha-status--compact {
  transform: scale(0.95);
  transform-origin: left center;
}
</style>
