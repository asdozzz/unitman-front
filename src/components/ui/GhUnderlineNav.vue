<script setup lang="ts">
import GhCounter from "./GhCounter.vue";
import GhIcon from "./GhIcon.vue";
import type { GhNavItem } from "./types";

withDefaults(
  defineProps<{
    modelValue: string;
    items: GhNavItem[];
    ariaLabel?: string;
  }>(),
  {
    ariaLabel: "Разделы",
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

function vybrat(value: string | number | null): void {
  emit("update:modelValue", String(value ?? ""));
}
</script>

<template>
  <q-tabs
    class="gh-nav primer"
    :model-value="modelValue"
    :aria-label="ariaLabel"
    no-caps
    align="left"
    indicator-color="transparent"
    outside-arrows
    mobile-arrows
    @update:model-value="vybrat"
  >
    <q-tab
      v-for="item in items"
      :key="item.name"
      class="gh-nav__tab"
      :name="item.name"
      :disable="item.disabled"
      :ripple="false"
    >
      <span class="gh-nav__content">
        <GhIcon v-if="item.icon" :name="item.icon" />
        <span class="gh-nav__label">{{ item.label }}</span>
        <GhCounter v-if="item.count !== undefined" :value="item.count" />
      </span>
    </q-tab>
  </q-tabs>
</template>

<style scoped>
.gh-nav {
  min-height: 48px;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.gh-nav :deep(.q-tabs__content) {
  gap: 0;
}

.gh-nav__tab {
  min-height: 48px;
  padding: 0 12px;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  color: var(--fgColor-muted);
  font-family: var(--fontStack-system);
  font-size: var(--fontSize-body);
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
  transition:
    color 80ms ease-out,
    background-color 80ms ease-out,
    border-color 80ms ease-out;
}

.gh-nav__tab :deep(.q-tab__content) {
  min-width: 0;
  padding: 0;
}

.gh-nav__tab:hover {
  background-color: var(--bgColor-neutral-muted);
  color: var(--fgColor-default);
}

.gh-nav__tab.q-tab--active {
  border-bottom-color: var(--gh-accent-coral);
  color: var(--fgColor-default);
  font-weight: var(--fontWeight-semibold);
}

.gh-nav__tab.q-tab--disabled {
  opacity: 0.5;
}

.gh-nav__content {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  line-height: 1;
}

.gh-nav__label {
  white-space: nowrap;
}
</style>
