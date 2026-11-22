<script setup lang="ts">
import { computed } from "vue";
import octicons from "@primer/octicons";
import type { OcticonName } from "./types";

const props = withDefaults(
  defineProps<{
    /** Имя иконки из @primer/octicons. */
    name: OcticonName;
    /** Размер стороны SVG в пикселях. */
    size?: number;
    /**
     * Текстовая метка для информативных иконок. Если не задана, иконка
     * считается декоративной и скрывается от скринридеров.
     */
    label?: string;
  }>(),
  {
    size: 16,
    label: "",
  },
);

const markup = computed<string>(() => {
  const icon = octicons[props.name];

  return icon.toSVG({ width: props.size, height: props.size });
});
</script>

<template>
  <span
    class="gh-icon"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
    v-html="markup"
  />
</template>

<style scoped>
.gh-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  vertical-align: text-bottom;
  color: inherit;
  line-height: 1;
}

.gh-icon :deep(svg) {
  display: block;
  fill: currentColor;
}
</style>
