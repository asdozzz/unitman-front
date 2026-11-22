<script setup lang="ts">
import { computed } from "vue";
import GhIcon from "./GhIcon.vue";
import type { GhControlSize, OcticonName } from "./types";

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null;
    label?: string;
    placeholder?: string;
    type?:
      | "text"
      | "password"
      | "email"
      | "search"
      | "number"
      | "url"
      | "tel"
      | "textarea";
    icon?: OcticonName;
    error?: boolean;
    errorMessage?: string;
    size?: GhControlSize;
    disabled?: boolean;
    readonly?: boolean;
    clearable?: boolean;
    autocomplete?: string;
    /** id нативного input для связи с label в GhFormField. */
    id?: string;
    ariaDescribedby?: string;
    ariaInvalid?: boolean;
    /** Показывать textarea, растягивая его по содержимому. */
    autogrow?: boolean;
    /** Начальное число строк textarea. */
    rows?: number;
    /** Максимальная длина нативного input/textarea. */
    maxlength?: number;
  }>(),
  {
    modelValue: "",
    label: "",
    placeholder: "",
    type: "text",
    icon: undefined,
    error: false,
    errorMessage: "",
    size: "md",
    disabled: false,
    readonly: false,
    clearable: false,
    autocomplete: "off",
    id: undefined,
    ariaDescribedby: undefined,
    ariaInvalid: false,
    autogrow: false,
    rows: 3,
    maxlength: undefined,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string | number | null): void;
}>();

const estTextarea = computed<boolean>(() => props.type === "textarea");

function obnovitZnachenie(value: string | number | null): void {
  emit("update:modelValue", value);
}
</script>

<template>
  <div
    class="gh-input primer"
    :class="[
      `gh-input--${size}`,
      {
        'gh-input--error': props.error,
        'gh-input--textarea': estTextarea,
        'gh-input--with-append': !!$slots.append,
      },
    ]"
  >
    <span v-if="label" class="gh-input__label">{{ label }}</span>

    <q-input
      class="gh-input__field"
      :class="{ 'gh-input__field--textarea': estTextarea }"
      :model-value="modelValue"
      :placeholder="placeholder"
      :type="type"
      :error="error"
      :disable="disabled"
      :readonly="readonly"
      :clearable="clearable"
      :autocomplete="autocomplete"
      :id="id"
      :aria-label="label || undefined"
      :aria-describedby="ariaDescribedby"
      :aria-invalid="ariaInvalid || error ? true : undefined"
      :autogrow="estTextarea ? autogrow : undefined"
      :rows="estTextarea ? rows : undefined"
      :maxlength="maxlength"
      hide-bottom-space
      outlined
      dense
      @update:model-value="obnovitZnachenie"
    >
      <template v-if="icon" #prepend>
        <GhIcon :name="icon" class="gh-input__icon" />
      </template>

      <template v-if="$slots.append" #append>
        <span class="gh-input__append">
          <slot name="append" />
        </span>
      </template>
    </q-input>

    <p v-if="errorMessage" class="gh-input__error">
      <GhIcon name="alert" :size="12" class="gh-input__error-icon" />
      <span>{{ errorMessage }}</span>
    </p>
  </div>
</template>

<style scoped>
.gh-input {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.gh-input__label {
  color: var(--fgColor-default);
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
}

.gh-input__field :deep(.q-field__control) {
  height: var(--control-height-md);
  min-height: var(--control-height-md);
  padding: 0;
  border-radius: var(--borderRadius-medium);
  background-color: var(--bgColor-default);
}

.gh-input__field :deep(.q-field__control::before) {
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-medium);
}

.gh-input__field :deep(.q-field__control::after) {
  border-radius: var(--borderRadius-medium);
}

.gh-input__field :deep(.q-field__control-container) {
  padding: 0 12px;
}

.gh-input__field :deep(.q-field__native) {
  padding: 0;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
  font-size: var(--fontSize-body);
}

.gh-input__field :deep(.q-field__native::placeholder) {
  color: var(--fgColor-muted);
  opacity: 1;
}

.gh-input__field :deep(.q-field__append),
.gh-input__field :deep(.q-field__prepend) {
  height: auto;
  padding: 0 8px;
  color: var(--fgColor-muted);
}

.gh-input__field :deep(.q-field__append) {
  align-items: center;
  padding-right: 4px;
}

.gh-input__append {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--fgColor-muted);
}

.gh-input__field :deep(.q-field__control:hover::before) {
  border-color: var(--fgColor-muted);
}

.gh-input__field.q-field--focused :deep(.q-field__control) {
  box-shadow: 0 0 0 2px var(--focus-ring-color);
}

.gh-input__field.q-field--focused :deep(.q-field__control::before) {
  border-color: var(--focus-outlineColor);
}

.gh-input__field.q-field--error :deep(.q-field__control) {
  box-shadow: 0 0 0 2px var(--focus-ring-danger);
}

.gh-input__field.q-field--error :deep(.q-field__control::before) {
  border-color: var(--fgColor-danger);
}

.gh-input__field.q-field--disabled :deep(.q-field__control) {
  background-color: var(--bgColor-muted);
  opacity: 1;
}

/* Ошибка рендерится своим элементом — q-field__bottom скрыт hide-bottom-space. */
.gh-input__error {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  color: var(--fgColor-danger);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-normal);
}

.gh-input__error-icon {
  flex-shrink: 0;
  color: var(--fgColor-danger);
}

/* Размеры контрола. */
.gh-input--sm .gh-input__field :deep(.q-field__control) {
  height: var(--control-height-sm);
  min-height: var(--control-height-sm);
}

.gh-input--lg .gh-input__field :deep(.q-field__control) {
  height: var(--control-height-lg);
  min-height: var(--control-height-lg);
}

/* Textarea: высота авто, минимальная — 64px, та же рамка/радиус/фокус-ринг. */
.gh-input__field.gh-input__field--textarea :deep(.q-field__control) {
  height: auto;
  min-height: 64px;
  align-items: flex-start;
  padding: 6px 0;
}

.gh-input__field.gh-input__field--textarea :deep(.q-field__control-container) {
  padding: 0 12px;
}

.gh-input__field.gh-input__field--textarea :deep(.q-field__native) {
  min-height: 52px;
  padding: 0;
  line-height: var(--lineHeight-normal);
  resize: vertical;
}
</style>
