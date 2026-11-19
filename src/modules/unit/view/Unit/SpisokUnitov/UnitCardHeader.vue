<script setup lang="ts">
import type {Unit} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import {convertDate, convertDateTime} from "@/utils/dates";

defineProps<{
  item: Unit;
}>();
</script>

<template>
  <div class="unit-card__identity">
    <h3 class="unit-card__name" :title="item.name">{{ item.name }}</h3>

    <div class="unit-card__meta">
      <q-icon name="folder" size="14px" />
      <span class="unit-card__meta-text" :title="item.projectName">{{ item.projectName }}</span>

      <span class="unit-card__separator">·</span>

      <q-icon name="account_tree" size="14px" />
      <span class="unit-card__meta-text unit-card__branch" :title="item.branch">{{ item.branch }}</span>
    </div>

    <div class="unit-card__updated text-caption-muted">
      {{ $t('unit.spisok_unitov.card.header.updated_at') }}
      <span :title="convertDateTime(item.unixtimePoslednegoObnovleniyaUnita)">
        {{ convertDate(item.unixtimePoslednegoObnovleniyaUnita) }}
      </span>
      <span class="unit-card__separator">·</span>
      {{ $t('unit.spisok_unitov.card.header.by') }} {{ item.authorName }}
    </div>
  </div>
</template>

<style scoped>
.unit-card__identity {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-1);
  min-width: 0;
}

.unit-card__name {
  margin: 0;
  color: var(--app-text);
  font-size: var(--app-font-size-title);
  font-weight: 600;
  line-height: var(--app-line-height-tight);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unit-card__meta {
  display: flex;
  align-items: center;
  gap: var(--app-space-1);
  min-width: 0;
  color: var(--app-text-secondary);
  font-size: var(--app-font-size-body);
  line-height: var(--app-line-height-tight);
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
