<script setup lang="ts">
import { computed, useId } from "vue";
import GhIcon from "./GhIcon.vue";

const props = withDefaults(
  defineProps<{
    label: string;
    caption?: string;
    error?: string;
    required?: boolean;
    controlId?: string;
  }>(),
  {
    caption: "",
    error: "",
    required: false,
    controlId: "",
  },
);

const internalId = useId();

const poleId = computed<string>(
  () => props.controlId || `gh-form-field-${internalId}`,
);
const captionId = computed<string>(() => `${poleId.value}-caption`);
const errorId = computed<string>(() => `${poleId.value}-error`);

const opisanie = computed<string | undefined>(() => {
  const ids = [
    props.caption ? captionId.value : "",
    props.error ? errorId.value : "",
  ].filter((id) => id !== "");

  return ids.length > 0 ? ids.join(" ") : undefined;
});

const estOshibka = computed<boolean>(() => props.error !== "");

const slotProps = computed(() => ({
  controlId: poleId.value,
  ariaDescribedby: opisanie.value,
  ariaInvalid: estOshibka.value,
}));
</script>

<template>
  <div class="gh-form-field primer">
    <label class="gh-form-field__label" :for="poleId">
      {{ label }}
      <span v-if="required" class="gh-form-field__required" aria-hidden="true">
        *
      </span>
    </label>

    <div class="gh-form-field__control">
      <slot v-bind="slotProps" />
    </div>

    <p v-if="caption" :id="captionId" class="gh-form-field__caption">
      {{ caption }}
    </p>

    <p v-if="error" :id="errorId" class="gh-form-field__error">
      <GhIcon name="alert" :size="12" class="gh-form-field__error-icon" />
      <span>{{ error }}</span>
    </p>
  </div>
</template>

<style scoped>
.gh-form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.gh-form-field__label {
  color: var(--fgColor-default);
  font-size: var(--fontSize-body);
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
}

.gh-form-field__required {
  color: var(--fgColor-danger);
}

.gh-form-field__control {
  min-width: 0;
}

.gh-form-field__caption {
  margin: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-normal);
}

.gh-form-field__error {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  color: var(--fgColor-danger);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-normal);
}

.gh-form-field__error-icon {
  flex-shrink: 0;
  color: var(--fgColor-danger);
}
</style>
