<script setup lang="ts">
import { computed } from "vue";
import type { GhSkeletonAnimation, GhSkeletonVariant } from "./types";

const props = withDefaults(
  defineProps<{
    variant?: GhSkeletonVariant;
    width?: string | number;
    height?: string | number;
    animation?: GhSkeletonAnimation;
  }>(),
  {
    variant: "text",
    width: undefined,
    height: undefined,
    animation: "wave",
  },
);

function kCssRazmeru(value: string | number | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return typeof value === "number" ? `${value}px` : value;
}

const shirina = computed<string | undefined>(() => kCssRazmeru(props.width));
const vysota = computed<string | undefined>(() => kCssRazmeru(props.height));
</script>

<template>
  <q-skeleton
    class="gh-skeleton primer"
    :type="variant"
    :width="shirina"
    :height="vysota"
    :animation="animation"
    aria-hidden="true"
  />
</template>

<style scoped>
.gh-skeleton {
  background-color: var(--bgColor-neutral-muted);
  border-radius: var(--borderRadius-small);
}

.gh-skeleton.q-skeleton--circle {
  border-radius: var(--borderRadius-full);
}

.gh-skeleton.q-skeleton--rect {
  border-radius: var(--borderRadius-medium);
}

.gh-skeleton :deep(.q-skeleton__wave) {
  background-color: var(--bgColor-neutral-muted);
}
</style>
