<script setup lang="ts">
import type { Unit } from "@/modules/unit/store/SpisokUnitov/model/Unit";
import { GhEmptyState } from "@/components/ui";
import UnitCard from "@/modules/unit/view/Unit/SpisokUnitov/UnitCard.vue";

defineProps<{
  item: Unit | null;
}>();
</script>

<template>
  <div class="unit-details-pane">
    <UnitCard v-if="item" :item="item" variant="detail" />

    <div v-else class="unit-details-pane__empty">
      <GhEmptyState
        icon="inbox"
        :title="$t('unit.spisok_unitov.view.empty_selection')"
      />
    </div>
  </div>
</template>

<style scoped>
.unit-details-pane {
  min-width: 0;
}

.unit-details-pane__empty {
  min-height: 240px;
  border: 1px dashed var(--borderColor-default);
  border-radius: var(--borderRadius-large);
}
</style>
