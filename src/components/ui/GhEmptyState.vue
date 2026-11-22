<script setup lang="ts">
import GhIcon from "./GhIcon.vue";
import type { OcticonName } from "./types";

withDefaults(
  defineProps<{
    icon?: OcticonName;
    title: string;
    description?: string;
  }>(),
  {
    icon: "inbox",
    description: "",
  },
);
</script>

<template>
  <div class="gh-empty-state primer">
    <GhIcon :name="icon" :size="40" class="gh-empty-state__icon" />

    <p class="gh-empty-state__title">{{ title }}</p>

    <p v-if="description" class="gh-empty-state__description">
      {{ description }}
    </p>

    <div v-if="$slots.actions" class="gh-empty-state__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.gh-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
  text-align: center;
}

.gh-empty-state__icon {
  margin-bottom: 12px;
  color: var(--fgColor-muted);
}

.gh-empty-state__title {
  margin: 0;
  color: var(--fgColor-default);
  font-size: var(--fontSize-title);
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
}

.gh-empty-state__description {
  max-width: 420px;
  margin: 4px 0 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-normal);
}

.gh-empty-state__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
}
</style>
