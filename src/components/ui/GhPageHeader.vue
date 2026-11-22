<script setup lang="ts">
import GhCounter from "./GhCounter.vue";

withDefaults(
  defineProps<{
    /** Заголовок страницы (рендерится как h1). */
    title: string;
    /** Короткое описание под заголовком. */
    description?: string;
    /** Число рядом с заголовком (счётчик сущностей на странице). */
    counter?: number | null;
  }>(),
  {
    description: "",
    counter: null,
  },
);
</script>

<template>
  <div class="gh-page-header primer">
    <header class="gh-page-header__header">
      <div class="gh-page-header__main">
        <div class="gh-page-header__title-row">
          <h1 class="gh-page-header__title">{{ title }}</h1>
          <GhCounter
            v-if="counter !== null && counter !== undefined"
            :value="counter"
          />
          <slot name="title-append" />
        </div>
        <p v-if="description" class="gh-page-header__description">
          {{ description }}
        </p>
      </div>

      <div v-if="$slots.actions" class="gh-page-header__actions">
        <slot name="actions" />
      </div>
    </header>

    <div v-if="$slots.default" class="gh-page-header__content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.gh-page-header {
  margin-bottom: 16px;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.gh-page-header__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.gh-page-header__main {
  min-width: 0;
}

.gh-page-header__title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.gh-page-header__title {
  margin: 0;
  color: var(--fgColor-default);
  font-size: 20px;
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
}

.gh-page-header__description {
  margin: 4px 0 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-normal);
}

.gh-page-header__actions {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.gh-page-header__content {
  margin-top: 16px;
}
</style>
