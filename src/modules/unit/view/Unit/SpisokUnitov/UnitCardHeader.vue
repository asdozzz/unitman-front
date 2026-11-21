<script setup lang="ts">
import type {Unit} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import type {UnitUiState} from "@/modules/unit/utils/unitStatus";
import {convertDate, convertDateTime} from "@/utils/dates";
import UnitStatusBadge from "@/modules/unit/view/Unit/SpisokUnitov/UnitStatusBadge.vue";
import UnitRedaktorBadge from "@/modules/unit/view/Unit/SpisokUnitov/UnitRedaktorBadge.vue";

defineProps<{
  item: Unit;
  state: UnitUiState;
}>();
</script>

<template>
  <!-- Шапка карточки — две строки: название с кебабом, затем бейджи.
       Кебаб рендерит UnitCard.vue через слот actions, чтобы у карточки
       оставалось ровно одно меню.
       Название вынесено в отдельную строку: при активном процессе и режиме
       «Редактирование» бейджи занимают почти всю ширину, и в одну строку
       имя юнита обрезалось до нечитаемого состояния. -->
  <div class="unit-card__head">
    <div class="unit-card__head-top">
      <h3 class="unit-card__name" :title="item.name">{{ item.name }}</h3>

      <div class="unit-card__head-actions">
        <slot name="actions" />
      </div>
    </div>

    <!-- «Ошибка» в тулбаре не дублируется: её показывает alert-стрип карточки.
         Ряд бейджей не рендерим, если показывать нечего (ошибка без редактора). -->
    <div
        v-if="state.status !== 'error' || item.redaktorMode"
        class="unit-card__head-badges"
    >
      <UnitStatusBadge v-if="state.status !== 'error'" :state="state" hide-detail />
      <UnitRedaktorBadge
          :mode="item.redaktorMode ?? null"
          :prichina-zapreta="item.prichinaZapreta ?? null"
      />
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
   синий фон, белый текст, граница снизу отделяет её от содержимого.
   Две строки: название сверху, бейджи снизу. */
.unit-card__head {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-1);
  min-width: 0;
  padding: var(--app-space-2) var(--app-space-4);
  border-bottom: 1px solid var(--app-primary-hover);
  background: var(--app-primary);
  color: var(--app-primary-contrast);
}

/* Верхняя строка: название получает всю ширину карточки, кроме кебаба. */
.unit-card__head-top {
  display: flex;
  align-items: center;
  gap: var(--app-space-2);
  min-width: 0;
}

/* Нижняя строка: бейджи статуса и режима редактора. flex-wrap — страховка
   для самых узких карточек, чтобы бейджи не вылезали за границы. */
.unit-card__head-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--app-space-2);
  min-width: 0;
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

/* Бейдж режима редактора — на такой же белой плашке, что и статус. */
.unit-card__head :deep(.unit-redaktor) {
  background: var(--app-primary-contrast);
}

.unit-card__name {
  flex: 1 1 auto;
  min-width: 0;
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
