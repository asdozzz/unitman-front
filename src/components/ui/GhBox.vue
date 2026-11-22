<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Внутренние отступы тела. */
    padding?: "none" | "sm" | "md";
  }>(),
  {
    padding: "md",
  },
);
</script>

<template>
  <q-card flat bordered class="gh-box primer">
    <header v-if="$slots.header" class="gh-box__header">
      <slot name="header" />
    </header>

    <div class="gh-box__body" :class="`gh-box__body--${padding}`">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="gh-box__footer">
      <slot name="footer" />
    </footer>
  </q-card>
</template>

<style scoped>
.gh-box {
  overflow: hidden;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-medium);
  background-color: var(--bgColor-default);
  box-shadow: none;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.gh-box__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--borderColor-default);
  background-color: var(--bgColor-muted);
  font-size: var(--fontSize-body);
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
}

.gh-box__body {
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-normal);
}

.gh-box__body--none {
  padding: 0;
}

.gh-box__body--sm {
  padding: 8px 12px;
}

.gh-box__body--md {
  padding: 16px;
}

.gh-box__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 16px;
  border-top: 1px solid var(--borderColor-default);
  background-color: var(--bgColor-muted);
}
</style>
