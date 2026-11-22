<script setup lang="ts">
import type { GhCheckboxProps } from "./types";

const props = withDefaults(defineProps<GhCheckboxProps>(), {
  modelValue: false,
  label: "",
  description: "",
  disabled: false,
  indeterminate: false,
  ariaLabel: "",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
}>();

function obnovitZnachenie(value: boolean | null): void {
  emit("update:modelValue", value === true);
}
</script>

<template>
  <label
    class="gh-checkbox primer"
    :class="{ 'gh-checkbox--disabled': props.disabled }"
  >
    <q-checkbox
      class="gh-checkbox__box"
      :model-value="indeterminate ? null : modelValue"
      :disable="disabled"
      :aria-label="ariaLabel || label || undefined"
      dense
      @update:model-value="obnovitZnachenie"
    />

    <span v-if="label || description" class="gh-checkbox__text">
      <span v-if="label" class="gh-checkbox__label">{{ label }}</span>
      <span v-if="description" class="gh-checkbox__description">
        {{ description }}
      </span>
    </span>
  </label>
</template>

<style scoped>
.gh-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
  cursor: pointer;
}

.gh-checkbox--disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.gh-checkbox__box {
  flex-shrink: 0;
  padding: 0;
}

/* Бокс 16×16 с радиусом small и рамкой Primer. */
.gh-checkbox__box :deep(.q-checkbox__inner) {
  width: 16px;
  min-width: 16px;
  height: 16px;
  font-size: 16px;
  color: var(--borderColor-default);
}

.gh-checkbox__box :deep(.q-checkbox__bg) {
  top: 0;
  left: 0;
  width: 16px;
  height: 16px;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-small);
  background-color: var(--bgColor-default);
}

/* Отмеченное и промежуточное состояние: акцентный фон и белая галочка. */
.gh-checkbox__box :deep(.q-checkbox__inner--truthy),
.gh-checkbox__box :deep(.q-checkbox__inner--indet) {
  color: var(--fgColor-accent);
}

.gh-checkbox__box :deep(.q-checkbox__inner--truthy .q-checkbox__bg),
.gh-checkbox__box :deep(.q-checkbox__inner--indet .q-checkbox__bg) {
  border-color: var(--fgColor-accent);
  background-color: var(--fgColor-accent);
}

.gh-checkbox__box :deep(.q-checkbox__svg) {
  color: var(--fgColor-onEmphasis);
}

.gh-checkbox__box:focus-visible :deep(.q-checkbox__inner) {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: 2px;
  border-radius: var(--borderRadius-small);
}

.gh-checkbox__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.gh-checkbox__label {
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-tight);
}

.gh-checkbox__description {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-normal);
}
</style>
