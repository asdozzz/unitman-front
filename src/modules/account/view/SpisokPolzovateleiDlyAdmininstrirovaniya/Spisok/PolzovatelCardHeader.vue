<script setup lang="ts">
import {computed} from "vue";
import type PolzovatelDlyAdmininstrirovaniya from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/model/PolzovatelDlyAdmininstrirovaniya";
import type {PolzovatelFilterStatus} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/model/PolzovatelFiltri";
import PolzovatelStatusBadge from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/Spisok/PolzovatelStatusBadge.vue";

const props = defineProps<{
  item: PolzovatelDlyAdmininstrirovaniya;
}>();

/** Статус блокировки для бейджа шапки. */
const status = computed<PolzovatelFilterStatus>(() => {
  return props.item.isBlocked ? "blocked" : "active";
});

/** Роли для мета-строки: строка `ROLE_USER,ROLE_ADMIN` → `ROLE_USER, ROLE_ADMIN`. */
const roli = computed<string>(() => {
  return props.item.roles
      .split(',')
      .map((role: string) => role.trim())
      .filter((role: string) => role !== '')
      .join(', ');
});
</script>

<template>
  <!-- Шапка карточки: email и единственный бейдж статуса на одной строке.
       Кебаб рендерит PolzovatelCard.vue через слот actions, чтобы у карточки
       оставалось ровно одно меню. -->
  <div class="polzovatel-card__head">
    <div class="polzovatel-card__head-main">
      <h3 class="polzovatel-card__name" :title="item.email">{{ item.email }}</h3>
      <PolzovatelStatusBadge :status="status" />
    </div>

    <div class="polzovatel-card__head-actions">
      <slot name="actions" />
    </div>
  </div>

  <div class="polzovatel-card__meta">
    <span class="polzovatel-card__meta-item">
      <q-icon name="badge" size="14px" />
      <span class="polzovatel-card__meta-text" :title="item.nickname ?? ''">
        {{ item.nickname ?? '—' }}
      </span>
    </span>

    <span class="polzovatel-card__separator">·</span>

    <span class="polzovatel-card__meta-item">
      <q-icon name="verified_user" size="14px" />
      <span class="polzovatel-card__meta-text" :title="roli">{{ roli }}</span>
    </span>
  </div>
</template>

<style scoped>
/* Шапка — тулбар-полоса карточки в цвет шапки сайта (bg-primary):
   синий фон, белый текст, граница снизу отделяет её от содержимого. */
.polzovatel-card__head {
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
.polzovatel-card__head :deep(.q-btn) {
  color: var(--app-primary-contrast);
}

/* Бейдж статуса на синем фоне: белая плашка, цвет статуса остаётся
   в иконке и тексте — контраст не страдает. */
.polzovatel-card__head :deep(.polzovatel-status) {
  background: var(--app-primary-contrast);
}

.polzovatel-card__head-main {
  display: flex;
  align-items: center;
  gap: var(--app-space-2);
  flex: 1 1 auto;
  min-width: 0;
}

.polzovatel-card__name {
  margin: 0;
  color: var(--app-primary-contrast);
  font-size: var(--app-font-size-subtitle);
  font-weight: 600;
  line-height: var(--app-line-height-tight);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.polzovatel-card__head-actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

/* Мета-строка живёт под тулбаром и получает собственные отступы карточки. */
.polzovatel-card__meta {
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

.polzovatel-card__meta-item {
  display: inline-flex;
  align-items: center;
  gap: var(--app-space-1);
  min-width: 0;
}

.polzovatel-card__meta-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.polzovatel-card__separator {
  opacity: 0.6;
}
</style>
