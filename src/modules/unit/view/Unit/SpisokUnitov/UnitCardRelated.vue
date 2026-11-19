<script setup lang="ts">
import type {SvyazUnita} from "@/modules/unit/store/SpisokUnitov/model/Unit";

defineProps<{
  svyazi: SvyazUnita[];
  labelFor: (svyaz: SvyazUnita) => string;
  isSelected: (unitId: string) => boolean;
}>();

const emit = defineEmits<{
  toggle: [targetUnitId: string];
}>();
</script>

<template>
  <div v-if="svyazi.length > 0" class="unit-related">
    <div class="unit-card__section-title">{{ $t('unit.spisok_unitov.card.fields.svyazi') }}</div>

    <div class="unit-related__chips">
      <q-chip
          v-for="svyaz in svyazi"
          :key="svyaz.targetUnitId"
          dense
          square
          clickable
          icon="link"
          :color="isSelected(svyaz.targetUnitId) ? 'primary' : 'grey-4'"
          :text-color="isSelected(svyaz.targetUnitId) ? 'white' : 'dark'"
          :label="labelFor(svyaz)"
          :aria-pressed="isSelected(svyaz.targetUnitId)"
          @click="emit('toggle', svyaz.targetUnitId)"
      >
        <q-tooltip>{{ $t('unit.spisok_unitov.card.tooltips.svyaz', {id: svyaz.targetUnitId}) }}</q-tooltip>
      </q-chip>
    </div>
  </div>
</template>

<style scoped>
.unit-related {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-1);
  min-width: 0;
}

.unit-related__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--app-space-1);
}
</style>
