<script setup lang="ts">
import { ref } from "vue";
import GhIcon from "./GhIcon.vue";
import type { GhSegmentedOption } from "./types";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    options: GhSegmentedOption[];
    size?: "sm" | "md";
    ariaLabel?: string;
  }>(),
  {
    size: "md",
    ariaLabel: "",
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const koren = ref<HTMLElement | null>(null);

function vybrat(value: string): void {
  emit("update:modelValue", value);
}

function peremestitFokus(index: number): void {
  const segments =
    koren.value?.querySelectorAll<HTMLButtonElement>('[role="radio"]');

  segments?.[index]?.focus();
}

function obrabotatKlavishu(event: KeyboardEvent, index: number): void {
  if (props.options.length === 0) {
    return;
  }

  let sleduyushchiyIndex = index;

  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    sleduyushchiyIndex = (index + 1) % props.options.length;
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    sleduyushchiyIndex =
      (index - 1 + props.options.length) % props.options.length;
  } else if (event.key === "Home") {
    sleduyushchiyIndex = 0;
  } else if (event.key === "End") {
    sleduyushchiyIndex = props.options.length - 1;
  } else {
    return;
  }

  event.preventDefault();

  const sleduyushchaya = props.options[sleduyushchiyIndex];
  if (!sleduyushchaya) {
    return;
  }

  vybrat(sleduyushchaya.value);
  peremestitFokus(sleduyushchiyIndex);
}
</script>

<template>
  <div
    ref="koren"
    class="gh-segmented primer"
    :class="`gh-segmented--${size}`"
    role="radiogroup"
    :aria-label="ariaLabel || undefined"
  >
    <button
      v-for="(option, index) in options"
      :key="option.value"
      type="button"
      role="radio"
      class="gh-segmented__segment"
      :class="{ 'gh-segmented__segment--active': option.value === modelValue }"
      :aria-checked="option.value === modelValue"
      :aria-label="option.label || option.value"
      :tabindex="option.value === modelValue ? 0 : -1"
      @click="vybrat(option.value)"
      @keydown="obrabotatKlavishu($event, index)"
    >
      <slot name="option" :option="option">
        <GhIcon v-if="option.icon" :name="option.icon" />
        <span v-if="option.label" class="gh-segmented__label">
          {{ option.label }}
        </span>
      </slot>
    </button>
  </div>
</template>

<style scoped>
.gh-segmented {
  display: inline-flex;
  align-items: stretch;
  gap: 0;
  padding: 2px;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-medium);
  background-color: var(--bgColor-muted);
  font-family: var(--fontStack-system);
}

.gh-segmented__segment {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  height: 24px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: var(--borderRadius-small);
  background-color: transparent;
  color: var(--fgColor-muted);
  font-family: inherit;
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-medium);
  line-height: 1;
  cursor: pointer;
}

.gh-segmented--md .gh-segmented__segment {
  height: 28px;
  padding: 0 12px;
  font-size: var(--fontSize-body);
}

.gh-segmented__segment:hover {
  color: var(--fgColor-default);
}

.gh-segmented__segment--active {
  border-color: var(--borderColor-default);
  background-color: var(--bgColor-default);
  box-shadow: var(--shadow-selected-control);
  color: var(--fgColor-default);
  font-weight: var(--fontWeight-semibold);
}

.gh-segmented__segment:focus-visible {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: 1px;
}

.gh-segmented__segment :deep(.gh-icon) {
  flex-shrink: 0;
}

.gh-segmented__segment :deep(.gh-segmented__label) {
  white-space: nowrap;
}
</style>
