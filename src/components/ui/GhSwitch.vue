<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    label?: string;
    description?: string;
    disabled?: boolean;
    ariaLabel?: string;
  }>(),
  {
    label: "",
    description: "",
    disabled: false,
    ariaLabel: "",
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
}>();

function obnovitZnachenie(value: boolean): void {
  emit("update:modelValue", value);
}
</script>

<template>
  <label
    class="gh-switch primer"
    :class="{
      'gh-switch--disabled': props.disabled,
      'gh-switch--with-description': !!description,
    }"
  >
    <q-toggle
      class="gh-switch__toggle"
      role="switch"
      :aria-checked="modelValue"
      :model-value="modelValue"
      :disable="disabled"
      :aria-label="ariaLabel || label || undefined"
      dense
      @update:model-value="obnovitZnachenie"
    />

    <span v-if="label || description" class="gh-switch__text">
      <span v-if="label" class="gh-switch__label">{{ label }}</span>
      <span v-if="description" class="gh-switch__description">
        {{ description }}
      </span>
    </span>
  </label>
</template>

<style scoped>
.gh-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
  cursor: pointer;
}

/* Двухстрочный текст (label + description) выравниваем по верху тумблера. */
.gh-switch--with-description {
  align-items: flex-start;
}

.gh-switch--disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.gh-switch__toggle {
  flex-shrink: 0;
  margin: 0;
  padding: 0;
}

.gh-switch__toggle :deep(.q-toggle__inner) {
  width: 32px;
  height: 16px;
  min-width: 32px;
  padding: 0;
  color: var(--bgColor-neutral-muted);
}

.gh-switch__toggle :deep(.q-toggle__track) {
  width: 32px;
  height: 16px;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-full);
  background-color: var(--bgColor-neutral-muted);
  opacity: 1;
}

/* Бегунок ровно по размеру дорожки — координаты задаём явно. */
.gh-switch__toggle :deep(.q-toggle__thumb) {
  top: 0;
  left: 0;
  width: 16px;
  height: 16px;
  margin: 0;
}

/* Кружок 12×12 центрируем внутри бегунка: inset компенсирует сдвиг 2px. */
.gh-switch__toggle :deep(.q-toggle__thumb::after) {
  inset: 2px;
  width: 12px;
  height: 12px;
  background-color: var(--bgColor-default);
  box-shadow: var(--shadow-thumb);
}

/*
 * Сдвиг во включённом состоянии: 32px дорожка − 16px бегунок = 16px.
 * Явно перекрываем дефолтный translateX Quasar (он рассчитан на 56px).
 */
.gh-switch__toggle :deep(.q-toggle__inner--truthy .q-toggle__thumb) {
  left: 0;
  transform: translateX(16px);
}

.gh-switch__toggle :deep(.q-toggle__inner--truthy) {
  color: var(--bgColor-success-emphasis);
}

.gh-switch__toggle :deep(.q-toggle__inner--truthy .q-toggle__track) {
  border-color: var(--bgColor-success-emphasis);
  background-color: var(--bgColor-success-emphasis);
}

.gh-switch__toggle :deep(.q-toggle__inner--truthy .q-toggle__thumb::after) {
  background-color: var(--fgColor-onEmphasis);
}

.gh-switch__toggle:focus-visible {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: 2px;
  border-radius: var(--borderRadius-full);
}

.gh-switch__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Многострочный текст выравниваем по верху тумблера с тем же зазором. */
.gh-switch--with-description .gh-switch__text {
  padding-top: 1px;
}

.gh-switch__label {
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-tight);
}

.gh-switch__description {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-normal);
}
</style>
