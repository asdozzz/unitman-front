<script setup lang="ts">
import GhButton from "./GhButton.vue";
import GhIcon from "./GhIcon.vue";

withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
    /** CSS-ширина карточки; на узких экранах ограничивается 100%. */
    width?: string;
    persistent?: boolean;
    closeLabel?: string;
  }>(),
  {
    title: "",
    width: "480px",
    persistent: false,
    closeLabel: "Закрыть",
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
}>();

function zakrit(): void {
  emit("update:modelValue", false);
}
</script>

<template>
  <q-dialog
    :model-value="modelValue"
    :persistent="persistent"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <q-card
      flat
      bordered
      class="gh-dialog__card primer"
      :style="{ width }"
    >
      <header class="gh-dialog__header">
        <h2 class="gh-dialog__title">
          <slot name="title">{{ title }}</slot>
        </h2>

        <GhButton
          variant="invisible"
          size="sm"
          :aria-label="closeLabel"
          @click="zakrit"
        >
          <GhIcon name="x" />
        </GhButton>
      </header>

      <div class="gh-dialog__body">
        <slot />
      </div>

      <footer v-if="$slots.footer" class="gh-dialog__footer">
        <slot name="footer" />
      </footer>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.gh-dialog__card {
  max-width: 100%;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-large);
  background-color: var(--bgColor-default);
  box-shadow: var(--shadow-floating-small);
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.gh-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 8px 8px 16px;
  border-bottom: 1px solid var(--borderColor-default);
}

.gh-dialog__title {
  margin: 0;
  font-size: var(--fontSize-title);
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
}

.gh-dialog__body {
  padding: 16px;
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-normal);
}

.gh-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--borderColor-default);
}
</style>
