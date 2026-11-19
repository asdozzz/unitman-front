<script setup lang="ts">
import {computed} from "vue";
import {useI18n} from "vue-i18n";
import type {Unit} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import {convertDateTime} from "@/utils/dates";

const props = defineProps<{
  unit: Unit;
}>();

const {t} = useI18n();

const expected = computed<string>(() => props.unit.containerStateMismatchExpected ?? "unknown");
const actual = computed<string>(() => props.unit.containerStateMismatchActual ?? "unknown");

const expectedLabel = computed<string>(() => t(`unit.spisok_unitov.card.container_state.states.${expected.value}`));
const actualLabel = computed<string>(() => t(`unit.spisok_unitov.card.container_state.states.${actual.value}`));
const detectedAt = computed<string>(() => convertDateTime(props.unit.containerStateMismatchDetectedAt));
</script>

<template>
  <div v-if="unit.containerStateMismatch" class="unit-container-state" role="alert">
    <q-icon name="warning" size="18px" class="unit-container-state__icon" />
    <div class="unit-container-state__content">
      <div class="unit-container-state__title">
        {{ $t('unit.spisok_unitov.card.container_state.title') }}
      </div>
      <div class="unit-container-state__message">
        {{ $t('unit.spisok_unitov.card.container_state.message', {expected: expectedLabel, actual: actualLabel}) }}
      </div>
      <div v-if="detectedAt" class="unit-container-state__time">
        {{ $t('unit.spisok_unitov.card.container_state.detected_at') }}: {{ detectedAt }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.unit-container-state {
  display: flex;
  align-items: flex-start;
  gap: var(--app-space-2);
  padding: var(--app-space-2) var(--app-space-3);
  border: 1px solid color-mix(in srgb, var(--app-warning) 45%, transparent);
  border-radius: var(--app-radius-lg);
  background: color-mix(in srgb, var(--app-warning) 10%, transparent);
  color: var(--app-warning);
}

.unit-container-state__icon {
  flex: 0 0 auto;
  margin-top: 1px;
}

.unit-container-state__content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.unit-container-state__title {
  font-weight: 600;
}

.unit-container-state__message,
.unit-container-state__time {
  color: var(--app-text-secondary);
  font-size: var(--app-font-size-caption);
}
</style>
