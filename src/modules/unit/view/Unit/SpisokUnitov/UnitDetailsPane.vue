<script setup lang="ts">
import type {Unit} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import UnitCard from "@/modules/unit/view/Unit/SpisokUnitov/UnitCard.vue";

defineProps<{
  item: Unit | null;
}>();
</script>

<template>
  <div class="unit-details-pane">
    <UnitCard v-if="item" :item="item" variant="detail" />

    <div v-else class="unit-details-pane__empty text-caption-muted">
      <q-icon name="touch_app" size="32px" />
      <span>{{ $t('unit.spisok_unitov.view.empty_selection') }}</span>
    </div>
  </div>
</template>

<style scoped>
.unit-details-pane {
  min-width: 0;
}

.unit-details-pane__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--app-space-2);
  min-height: 240px;
  padding: var(--app-space-5);
  border: 1px dashed var(--app-border);
  border-radius: var(--app-radius-lg);
  text-align: center;
}
</style>
