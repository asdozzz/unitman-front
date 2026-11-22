<script setup lang="ts">
import type { SvyazUnita } from "@/modules/unit/store/SpisokUnitov/model/Unit";
import { GhIcon } from "@/components/ui";

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
    <div class="unit-related__title">{{ $t("unit.spisok_unitov.card.fields.svyazi") }}</div>

    <div class="unit-related__chips">
      <button
        v-for="svyaz in svyazi"
        :key="svyaz.targetUnitId"
        type="button"
        class="unit-related__chip"
        :class="{ 'unit-related__chip--selected': isSelected(svyaz.targetUnitId) }"
        :aria-pressed="isSelected(svyaz.targetUnitId) ? 'true' : 'false'"
        @click="emit('toggle', svyaz.targetUnitId)"
      >
        <GhIcon name="link" :size="14" />
        <span>{{ labelFor(svyaz) }}</span>

        <q-tooltip>
          {{ $t("unit.spisok_unitov.card.tooltips.svyaz", { id: svyaz.targetUnitId }) }}
        </q-tooltip>
      </button>
    </div>
  </div>
</template>

<style scoped>
.unit-related {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.unit-related__title {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-semibold);
}

.unit-related__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.unit-related__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-full);
  background-color: var(--bgColor-default);
  color: var(--fgColor-muted);
  font-family: inherit;
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-medium);
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
}

.unit-related__chip:hover {
  background-color: var(--bgColor-neutral-muted);
  color: var(--fgColor-default);
}

.unit-related__chip:focus-visible {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: 2px;
}

.unit-related__chip--selected {
  border-color: var(--borderColor-accent-muted);
  background-color: var(--bgColor-accent-muted);
  color: var(--fgColor-accent);
}
</style>
