<script setup lang="ts">
import GhIcon from "./GhIcon.vue";
import type { GhLabelVariant, OcticonName } from "./types";

withDefaults(
  defineProps<{
    variant?: GhLabelVariant;
    icon?: OcticonName;
    label?: string;
  }>(),
  {
    variant: "neutral",
    icon: undefined,
    label: "",
  },
);
</script>

<template>
  <q-badge
    class="gh-label primer"
    :class="`gh-label--${variant}`"
    :color="undefined"
    :text-color="undefined"
  >
    <GhIcon v-if="icon" :name="icon" />
    <span v-if="label || $slots.default" class="gh-label__text">
      <slot>{{ label }}</slot>
    </span>
  </q-badge>
</template>

<style scoped>
.gh-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 20px;
  padding: 0 7px;
  border: 1px solid transparent;
  border-radius: var(--borderRadius-full);
  font-family: var(--fontStack-system);
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-medium);
  line-height: 1;
  white-space: nowrap;
}

.gh-label__text {
  display: inline-block;
  line-height: 1;
}

.gh-label--accent {
  background-color: var(--bgColor-accent-muted);
  border-color: var(--borderColor-accent-muted);
  color: var(--fgColor-accent);
}

.gh-label--success {
  background-color: var(--bgColor-success-muted);
  border-color: var(--borderColor-success-muted);
  color: var(--fgColor-success);
}

.gh-label--danger {
  background-color: var(--bgColor-danger-muted);
  border-color: var(--borderColor-danger-muted);
  color: var(--fgColor-danger);
}

.gh-label--attention {
  background-color: var(--bgColor-attention-muted);
  border-color: var(--borderColor-attention-muted);
  color: var(--fgColor-attention);
}

.gh-label--neutral {
  background-color: var(--bgColor-neutral-muted);
  border-color: var(--borderColor-default);
  color: var(--fgColor-muted);
}
</style>
