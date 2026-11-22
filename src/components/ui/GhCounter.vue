<script setup lang="ts">
import type { GhCounterVariant } from "./types";

withDefaults(
  defineProps<{
    value: number | string;
    variant?: GhCounterVariant;
    /** Подпись для скринридеров, если число само по себе неинформативно. */
    label?: string;
  }>(),
  {
    variant: "default",
    label: "",
  },
);
</script>

<template>
  <span
    class="gh-counter primer"
    :class="`gh-counter--${variant}`"
    :aria-label="label || undefined"
  >
    {{ value }}
  </span>
</template>

<style scoped>
.gh-counter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: var(--borderRadius-full);
  background-color: var(--bgColor-neutral-muted);
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-medium);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  white-space: nowrap;
}

.gh-counter--accent {
  background-color: var(--bgColor-accent-muted);
  color: var(--fgColor-accent);
}

.gh-counter--primary {
  background-color: var(--bgColor-success-emphasis);
  color: var(--fgColor-onEmphasis);
}
</style>
