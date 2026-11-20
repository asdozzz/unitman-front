<script setup lang="ts">
import type {Proekt} from "@/modules/unit/store/SpisokProektov/model/Proekt";
import type {ProektUiState} from "@/modules/unit/utils/proektStatus";
import ProektStatusBadge from "@/modules/unit/view/Proekti/SpisokProektov/ProektStatusBadge.vue";

defineProps<{
  item: Proekt;
  state: ProektUiState;
}>();
</script>

<template>
  <!-- Шапка карточки: имя и единственный бейдж состояния на одной строке.
       Кебаб рендерит ProektCard.vue через слот actions, чтобы у карточки
       оставалось ровно одно меню. -->
  <div class="proekt-card__head">
    <div class="proekt-card__head-main">
      <h3 class="proekt-card__name" :title="item.name">{{ item.name }}</h3>
      <ProektStatusBadge :state="state" />
    </div>

    <div class="proekt-card__head-actions">
      <slot name="actions" />
    </div>
  </div>

  <div class="proekt-card__meta">
    <span class="proekt-card__meta-item">
      <q-icon name="code" size="14px" />
      <span class="proekt-card__meta-text proekt-card__code" :title="item.code">{{ item.code }}</span>
    </span>

    <span class="proekt-card__separator">·</span>

    <span class="proekt-card__meta-item">
      <q-icon name="account_tree" size="14px" />
      <span class="proekt-card__meta-text proekt-card__branch" :title="item.mainBranch">{{ item.mainBranch }}</span>
    </span>

    <template v-if="item.proxyHost">
      <span class="proekt-card__separator">·</span>

      <span class="proekt-card__meta-item">
        <q-icon name="public" size="14px" />
        <span class="proekt-card__meta-text" :title="item.proxyHost">{{ item.proxyHost }}</span>
      </span>
    </template>
  </div>
</template>

<style scoped>
/* Шапка — тулбар-полоса карточки в цвет шапки сайта (bg-primary). */
.proekt-card__head {
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
.proekt-card__head :deep(.q-btn) {
  color: var(--app-primary-contrast);
}

/* Бейдж состояния на синем фоне: белая плашка, цвет состояния остаётся
   в иконке и тексте — контраст не страдает. */
.proekt-card__head :deep(.proekt-status) {
  background: var(--app-primary-contrast);
}

.proekt-card__head-main {
  display: flex;
  align-items: center;
  gap: var(--app-space-2);
  flex: 1 1 auto;
  min-width: 0;
}

.proekt-card__name {
  margin: 0;
  color: var(--app-primary-contrast);
  font-size: var(--app-font-size-subtitle);
  font-weight: 600;
  line-height: var(--app-line-height-tight);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proekt-card__head-actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

/* Мета-строка живёт под тулбаром и получает собственные отступы карточки. */
.proekt-card__meta {
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

.proekt-card__meta-item {
  display: inline-flex;
  align-items: center;
  gap: var(--app-space-1);
  min-width: 0;
}

.proekt-card__meta-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proekt-card__code,
.proekt-card__branch {
  font-family: var(--app-font-family-mono);
  font-size: 0.9em;
}

.proekt-card__separator {
  opacity: 0.6;
}
</style>
