<script setup lang="ts">
import type { Unit } from "@/modules/unit/store/SpisokUnitov/model/Unit";
import type { UnitUiState } from "@/modules/unit/utils/unitStatus";
import { convertDate, convertDateTime } from "@/utils/dates";
import { GhIcon } from "@/components/ui";
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
      <GhIcon name="repo" :size="14" />
      <span class="unit-card__meta-text" :title="item.projectName">{{ item.projectName }}</span>
    </span>

    <span class="unit-card__separator">·</span>

    <span class="unit-card__meta-item">
      <GhIcon name="git-branch" :size="14" />
      <span class="unit-card__meta-text unit-card__branch gh-mono" :title="item.branch">{{ item.branch }}</span>
    </span>

    <span class="unit-card__separator">·</span>

    <span class="unit-card__meta-item unit-card__updated">
      {{ $t("unit.spisok_unitov.card.header.updated_at") }}
      <span :title="convertDateTime(item.unixtimePoslednegoObnovleniyaUnita)">
        {{ convertDate(item.unixtimePoslednegoObnovleniyaUnita) }}
      </span>
      <span class="unit-card__separator">·</span>
      {{ $t("unit.spisok_unitov.card.header.by") }} {{ item.authorName }}
    </span>
  </div>
</template>

<style scoped>
.unit-card__head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 8px 16px;
  border-bottom: 1px solid var(--borderColor-default);
  background-color: var(--bgColor-muted);
  color: var(--fgColor-default);
}

.unit-card__head-top {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.unit-card__head-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.unit-card__head-actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

.unit-card__name {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  color: var(--fgColor-default);
  font-size: var(--fontSize-title);
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unit-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  row-gap: 2px;
  min-width: 0;
  padding: 8px 16px 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-tight);
}

.unit-card__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.unit-card__meta-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unit-card__branch {
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
