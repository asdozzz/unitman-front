<script setup lang="ts">
import {computed} from "vue";
import {useRouter} from "vue-router";
import {useI18n} from "vue-i18n";
import type {Unit} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import {convertDateTime} from "@/utils/dates";

const props = defineProps<{
  unit: Unit;
  error: boolean;
}>();

const router = useRouter();
const {t} = useI18n();

/** Блок показывается только при наличии проблемы — здоровая карточка остаётся чистой. */
const pokazat = computed<boolean>(() => {
  return props.error || props.unit.containerStateMismatch === true;
});

const expected = computed<string>(() => props.unit.containerStateMismatchExpected ?? "unknown");
const actual = computed<string>(() => props.unit.containerStateMismatchActual ?? "unknown");

const expectedLabel = computed<string>(() => t(`unit.spisok_unitov.card.container_state.states.${expected.value}`));
const actualLabel = computed<string>(() => t(`unit.spisok_unitov.card.container_state.states.${actual.value}`));

const mismatchDetectedAt = computed<string>(() => convertDateTime(props.unit.containerStateMismatchDetectedAt));

/** Время последнего обновления юнита — уточняет, когда случилась ошибка. */
const errorUpdatedAt = computed<string>(() => {
  return props.unit.unixtimePoslednegoObnovleniyaUnita
      ? convertDateTime(props.unit.unixtimePoslednegoObnovleniyaUnita)
      : "";
});

function otkritZadachi() {
  router.push({name: "unit_jobs", params: {id: props.unit.id}});
}
</script>

<template>
  <div v-if="pokazat" class="unit-card-alert">
    <div v-if="error" class="unit-card-alert__item unit-card-alert__item--error" role="alert">
      <q-icon name="error_outline" size="18px" class="unit-card-alert__icon" />
      <div class="unit-card-alert__content">
        <div class="unit-card-alert__title">
          {{ $t('unit.spisok_unitov.card.messages.error_hint') }}
        </div>
        <div v-if="errorUpdatedAt" class="unit-card-alert__details">
          {{ $t('unit.spisok_unitov.card.header.updated_at') }} {{ errorUpdatedAt }}
        </div>
        <q-btn
            class="unit-card-alert__action"
            flat
            dense
            no-caps
            size="sm"
            icon="arrow_forward"
            :label="$t('unit.spisok_unitov.card.buttons.open_jobs')"
            @click="otkritZadachi"
        />
      </div>
    </div>

    <div
        v-if="unit.containerStateMismatch"
        class="unit-card-alert__item unit-card-alert__item--warning"
        role="alert"
    >
      <q-icon name="warning" size="18px" class="unit-card-alert__icon" />
      <div class="unit-card-alert__content">
        <div class="unit-card-alert__title">
          {{ $t('unit.spisok_unitov.card.container_state.title') }}
        </div>
        <div class="unit-card-alert__details">
          {{ $t('unit.spisok_unitov.card.container_state.message', {expected: expectedLabel, actual: actualLabel}) }}
        </div>
        <div v-if="mismatchDetectedAt" class="unit-card-alert__details">
          {{ $t('unit.spisok_unitov.card.container_state.detected_at') }}: {{ mismatchDetectedAt }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.unit-card-alert {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-2);
}

/* Alert-стрип: 1px бордер + 8–10% фон, без тени — как в спеке. */
.unit-card-alert__item {
  display: flex;
  align-items: flex-start;
  gap: var(--app-space-2);
  padding: var(--app-space-2) var(--app-space-3);
  border: 1px solid transparent;
  border-radius: var(--app-radius-md);
}

.unit-card-alert__item--error {
  border-color: color-mix(in srgb, var(--app-negative) 45%, transparent);
  background: color-mix(in srgb, var(--app-negative) 9%, transparent);
  color: var(--app-negative);
}

.unit-card-alert__item--warning {
  border-color: color-mix(in srgb, var(--app-warning) 45%, transparent);
  background: color-mix(in srgb, var(--app-warning) 10%, transparent);
  color: var(--app-warning);
}

.unit-card-alert__icon {
  flex: 0 0 auto;
  margin-top: 1px;
}

.unit-card-alert__content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.unit-card-alert__title {
  font-size: 13px;
  font-weight: 600;
  line-height: var(--app-line-height-tight);
}

.unit-card-alert__details {
  color: var(--app-text-secondary);
  font-size: var(--app-font-size-caption);
}

/* Действие внутри alert-а не окрашивается в цвет варианта ошибки. */
.unit-card-alert__action {
  align-self: flex-start;
  margin-top: var(--app-space-1);
  padding: 0;
  color: var(--app-primary);
  font-size: var(--app-font-size-caption);
}
</style>
