<script setup lang="ts">
import type {Unit} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import type {UnitUiState} from "@/modules/unit/utils/unitStatus";
import {convertDate, convertDateTime} from "@/utils/dates";
import UnitStatusBadge from "@/modules/unit/view/Unit/SpisokUnitov/UnitStatusBadge.vue";

defineProps<{
  item: Unit;
  state: UnitUiState;
}>();
</script>

<template>
  <!-- Шапка карточки: имя и единственный бейдж статуса на одной строке.
       Кебаб рендерит UnitCard.vue через слот actions, чтобы у карточки
       оставалось ровно одно меню. -->
  <div class="unit-card__head">
    <div class="unit-card__head-main">
      <h3 class="unit-card__name" :title="item.name">{{ item.name }}</h3>
      <!-- «Ошибка» в тулбаре не дублируется: её показывает alert-стрип карточки. -->
      <UnitStatusBadge v-if="state.status !== 'error'" :state="state" />
    </div>

    <div class="unit-card__head-actions">
      <slot name="actions" />
    </div>
  </div>

  <div class="unit-card__meta">
    <span class="unit-card__meta-item">
      <q-icon name="folder" size="14px" />
      <span class="unit-card__meta-text" :title="item.projectName">{{ item.projectName }}</span>
    </span>

    <span class="unit-card__separator">·</span>

    <span class="unit-card__meta-item">
      <q-icon name="account_tree" size="14px" />
      <span class="unit-card__meta-text unit-card__branch" :title="item.branch">{{ item.branch }}</span>
    </span>

    <span class="unit-card__separator">·</span>

    <span class="unit-card__meta-item unit-card__updated">
      {{ $t('unit.spisok_unitov.card.header.updated_at') }}
      <span :title="convertDateTime(item.unixtimePoslednegoObnovleniyaUnita)">
        {{ convertDate(item.unixtimePoslednegoObnovleniyaUnita) }}
      </span>
      <span class="unit-card__separator">·</span>
      {{ $t('unit.spisok_unitov.card.header.by') }} {{ item.authorName }}
    </span>
  </div>
</template>

<style scoped>
/* Шапка — тулбар-полоса карточки в цвет шапки сайта (bg-primary):
   синий фон, белый текст, граница снизу отделяет её от содержимого. */
.unit-card__head {
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
.unit-card__head :deep(.q-btn) {
  color: var(--app-primary-contrast);
}

/* Бейдж статуса на синем фоне: белая плашка, цвет статуса остаётся
   в иконке и тексте — контраст не страдает. */
.unit-card__head :deep(.unit-status) {
  background: var(--app-primary-contrast);
}

.unit-card__head-main {
  display: flex;
  align-items: center;
  gap: var(--app-space-2);
  flex: 1 1 auto;
  min-width: 0;
}

.unit-card__name {
  margin: 0;
  color: var(--app-primary-contrast);
  font-size: var(--app-font-size-subtitle);
  font-weight: 600;
  line-height: var(--app-line-height-tight);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unit-card__head-actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

/* Мета-строка живёт под тулбаром и получает собственные отступы карточки. */
.unit-card__meta {
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

.unit-card__meta-item {
  display: inline-flex;
  align-items: center;
  gap: var(--app-space-1);
  min-width: 0;
}

.unit-card__meta-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unit-card__branch {
  font-family: var(--app-font-family-mono);
  font-size: 0.9em;
}

.unit-card__separator {
  opacity: 0.6;
}

.unit-card__updated {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
