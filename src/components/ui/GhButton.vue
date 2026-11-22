<script setup lang="ts">
import GhCounter from "./GhCounter.vue";
import GhIcon from "./GhIcon.vue";
import type {
  GhButtonVariant,
  GhControlSize,
  OcticonName,
} from "./types";

const props = withDefaults(
  defineProps<{
    variant?: GhButtonVariant;
    size?: GhControlSize;
    type?: "button" | "submit" | "reset";
    icon?: OcticonName;
    iconRight?: OcticonName;
    label?: string;
    /** Число справа от подписи (например, количество issue). */
    count?: number | null;
    loading?: boolean;
    disabled?: boolean;
    /** Растянуть кнопку на всю ширину контейнера. */
    block?: boolean;
    ariaLabel?: string;
  }>(),
  {
    variant: "default",
    size: "md",
    type: "button",
    icon: undefined,
    iconRight: undefined,
    label: "",
    count: null,
    loading: false,
    disabled: false,
    block: false,
    ariaLabel: "",
  },
);

const emit = defineEmits<{
  (e: "click", event: Event): void;
}>();

function obrabotatKlik(event: Event): void {
  if (props.loading || props.disabled) {
    return;
  }

  emit("click", event);
}
</script>

<template>
  <q-btn
    class="gh-button primer"
    :class="[
      `gh-button--${variant}`,
      `gh-button--${size}`,
      { 'gh-button--block': block },
    ]"
    :type="type"
    :loading="loading"
    :disable="disabled"
    :aria-label="ariaLabel || undefined"
    unelevated
    no-caps
    :ripple="false"
    @click="obrabotatKlik"
  >
    <template #default>
      <GhIcon v-if="icon" :name="icon" />
      <span v-if="label || $slots.default" class="gh-button__label">
        <slot>{{ label }}</slot>
      </span>
      <GhCounter v-if="count !== null && count !== undefined" :value="count" />
      <GhIcon v-if="iconRight" :name="iconRight" />
    </template>
  </q-btn>
</template>

<style scoped>
.gh-button {
  min-height: var(--control-height-md);
  height: var(--control-height-md);
  padding: 0 var(--control-padding-inline);
  border: 1px solid transparent;
  border-radius: var(--borderRadius-medium);
  box-shadow: none;
  font-family: var(--fontStack-system);
  font-size: var(--fontSize-body);
  font-weight: var(--fontWeight-medium);
  letter-spacing: 0;
  text-transform: none;
  transition:
    background-color 80ms ease-out,
    border-color 80ms ease-out,
    color 80ms ease-out;
}

.gh-button :deep(.q-btn__content) {
  gap: 6px;
  align-items: center;
  flex-wrap: nowrap;
  font-size: inherit;
  font-weight: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
}

.gh-button__label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  line-height: 1;
  white-space: nowrap;
}

/* --- Варианты --------------------------------------------------------- */
.gh-button--default {
  background-color: var(--bgColor-muted);
  border-color: var(--borderColor-default);
  color: var(--fgColor-default);
}

.gh-button--default:hover {
  background-color: var(--bgColor-neutral-muted);
}

.gh-button--default:active {
  background-color: var(--bgColor-inset);
}

.gh-button--primary {
  background-color: var(--bgColor-success-emphasis);
  border-color: var(--bgColor-success-emphasis);
  color: var(--fgColor-onEmphasis);
}

.gh-button--primary:hover {
  background-color: var(--bgColor-success-emphasis-hover);
  border-color: var(--bgColor-success-emphasis-hover);
}

.gh-button--primary:active {
  background-color: var(--bgColor-success-emphasis-active);
  border-color: var(--bgColor-success-emphasis-active);
}

.gh-button--danger {
  background-color: var(--bgColor-danger-emphasis);
  border-color: var(--bgColor-danger-emphasis);
  color: var(--fgColor-onEmphasis);
}

.gh-button--danger:hover {
  background-color: var(--bgColor-danger-emphasis-hover);
  border-color: var(--bgColor-danger-emphasis-hover);
}

.gh-button--danger:active {
  background-color: var(--bgColor-danger-emphasis-active);
  border-color: var(--bgColor-danger-emphasis-active);
}

.gh-button--invisible {
  background-color: transparent;
  border-color: transparent;
  color: var(--fgColor-default);
}

.gh-button--invisible:hover {
  background-color: var(--bgColor-neutral-muted);
}

.gh-button--invisible:active {
  background-color: var(--bgColor-inset);
}

/* Счётчик на сплошных кнопках: полупрозрачный белый, как в GitHub. */
.gh-button--primary :deep(.gh-counter),
.gh-button--danger :deep(.gh-counter) {
  background-color: var(--bgColor-onEmphasis-muted);
  color: var(--fgColor-onEmphasis);
}

/* --- Размеры ---------------------------------------------------------- */
.gh-button--sm {
  height: var(--control-height-sm);
  min-height: var(--control-height-sm);
  padding: 0 10px;
  font-size: var(--fontSize-caption);
}

.gh-button--md {
  height: var(--control-height-md);
  min-height: var(--control-height-md);
}

.gh-button--lg {
  height: var(--control-height-lg);
  min-height: var(--control-height-lg);
  padding: 0 16px;
}

.gh-button--block {
  width: 100%;
}

/* --- Состояния -------------------------------------------------------- */
.gh-button.q-btn--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.gh-button:focus-visible {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: 2px;
}
</style>
