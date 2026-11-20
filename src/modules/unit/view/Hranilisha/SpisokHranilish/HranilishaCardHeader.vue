<script setup lang="ts">
import {computed} from "vue";
import type {Hranilishe} from "@/modules/unit/store/SpisokHranilish/model/Hranilishe";
import HranilishaStatusBadge from "@/modules/unit/view/Hranilisha/SpisokHranilish/HranilishaStatusBadge.vue";

const props = defineProps<{
  item: Hranilishe;
}>();

/**
 * URL репозитория показываем только для GitLab: у остальных типов он
 * служебный и в карточке не нужен (совпадает с прежним поведением страницы).
 */
const pokazatUrl = computed<boolean>(() => {
  return props.item.type.toUpperCase() === "GITLAB" && props.item.repoUrl !== "";
});
</script>

<template>
  <!-- Шапка карточки: имя и единственный бейдж подтверждения на одной строке.
       Кебаб рендерит HranilishaCard.vue через слот actions, чтобы у карточки
       оставалось ровно одно меню. -->
  <div class="hranilisha-card__head">
    <div class="hranilisha-card__head-main">
      <h3 class="hranilisha-card__name" :title="item.name">{{ item.name }}</h3>
      <HranilishaStatusBadge :confirmed="item.confirmed" />
    </div>

    <div class="hranilisha-card__head-actions">
      <slot name="actions" />
    </div>
  </div>

  <div class="hranilisha-card__meta">
    <span class="hranilisha-card__meta-item">
      <q-icon name="category" size="14px" />
      <span class="hranilisha-card__meta-text" :title="item.type">{{ item.type }}</span>
    </span>

    <template v-if="pokazatUrl">
      <span class="hranilisha-card__separator">·</span>

      <span class="hranilisha-card__meta-item">
        <q-icon name="link" size="14px" />
        <a
            class="hranilisha-card__meta-text hranilisha-card__url"
            :href="item.repoUrl"
            target="_blank"
            rel="noopener noreferrer"
            :title="item.repoUrl"
        >{{ item.repoUrl }}</a>
      </span>
    </template>
  </div>
</template>

<style scoped>
/* Шапка — тулбар-полоса карточки в цвет шапки сайта (bg-primary). */
.hranilisha-card__head {
  display: flex;
  align-items: center;
  gap: var(--app-space-2);
  min-width: 0;
  padding: var(--app-space-2) var(--app-space-4);
  border-bottom: 1px solid var(--app-primary-hover);
  background: var(--app-primary);
  color: var(--app-primary-contrast);
}

/* Кебаб в тулбаре — белый, как элементы шапки сайта. */
.hranilisha-card__head :deep(.q-btn) {
  color: var(--app-primary-contrast);
}

/* Бейдж статуса на синем фоне: белая плашка, цвет статуса остаётся
   в иконке и тексте — контраст не страдает. */
.hranilisha-card__head :deep(.hranilisha-status) {
  background: var(--app-primary-contrast);
}

.hranilisha-card__head-main {
  display: flex;
  align-items: center;
  gap: var(--app-space-2);
  flex: 1 1 auto;
  min-width: 0;
}

.hranilisha-card__name {
  margin: 0;
  color: var(--app-primary-contrast);
  font-size: var(--app-font-size-subtitle);
  font-weight: 600;
  line-height: var(--app-line-height-tight);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hranilisha-card__head-actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

/* Мета-строка живёт под тулбаром и получает собственные отступы карточки. */
.hranilisha-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--app-space-1);
  row-gap: 2px;
  min-width: 0;
  padding: var(--app-space-2) var(--app-space-4) 0;
  color: var(--app-text-secondary);
  font-size: var(--app-font-size-caption);
  line-height: var(--app-line-height-tight);
}

.hranilisha-card__meta-item {
  display: inline-flex;
  align-items: center;
  gap: var(--app-space-1);
  min-width: 0;
}

.hranilisha-card__meta-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hranilisha-card__url {
  color: inherit;
  font-family: var(--app-font-family-mono);
  font-size: 0.9em;
  text-decoration: none;
}

.hranilisha-card__url:hover {
  text-decoration: underline;
}

.hranilisha-card__separator {
  opacity: 0.6;
}
</style>
