<script setup lang="ts">
import {computed} from "vue";
import {GhLabel} from "@/components/ui";
import type {GhLabelVariant, OcticonName} from "@/components/ui";
import type {ProektUiState} from "@/modules/unit/utils/proektStatus";

const props = withDefaults(defineProps<{
  state: ProektUiState;
  compact?: boolean;
}>(), {
  compact: false,
});

/** Вариант и иконка по P5: цвет дублируется формой иконки. */
const variant = computed<GhLabelVariant>(() => {
  switch (props.state.status) {
    case "error":
      return "danger";
    case "busy":
      return "accent";
    case "new":
    default:
      return "neutral";
  }
});

const ikonka = computed<OcticonName>(() => {
  switch (props.state.status) {
    case "new":
      return "circle";
    case "error":
      return "x-circle";
    case "busy":
    default:
      return "sync";
  }
});
</script>

<template>
  <span class="proekt-status" :class="{'proekt-status--compact': compact}" role="status">
    <GhLabel :variant="variant" :icon="ikonka" :label="$t(state.labelKey)" />
  </span>
</template>

<style scoped>
.proekt-status {
  display: inline-flex;
  align-items: center;
}

.proekt-status--compact {
  transform: scale(0.95);
  transform-origin: left center;
}
</style>
