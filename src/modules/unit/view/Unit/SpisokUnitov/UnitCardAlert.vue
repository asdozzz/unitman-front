<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type { Unit } from "@/modules/unit/store/SpisokUnitov/model/Unit";
import { convertDateTime } from "@/utils/dates";
import { GhBanner, GhButton } from "@/components/ui";

const props = defineProps<{
  unit: Unit;
  error: boolean;
}>();

const router = useRouter();
const { t } = useI18n();

/** Блок показывается только при наличии проблемы — здоровая карточка остаётся чистой. */
const pokazat = computed<boolean>(() => {
  return props.error || props.unit.containerStateMismatch === true;
});

const expected = computed<string>(() => props.unit.containerStateMismatchExpected ?? "unknown");
const actual = computed<string>(() => props.unit.containerStateMismatchActual ?? "unknown");

const expectedLabel = computed<string>(() =>
  t(`unit.spisok_unitov.card.container_state.states.${expected.value}`),
);
const actualLabel = computed<string>(() =>
  t(`unit.spisok_unitov.card.container_state.states.${actual.value}`),
);

const mismatchDetectedAt = computed<string>(() =>
  convertDateTime(props.unit.containerStateMismatchDetectedAt),
);

/** Время последнего обновления юнита — уточняет, когда случилась ошибка. */
const errorUpdatedAt = computed<string>(() => {
  return props.unit.unixtimePoslednegoObnovleniyaUnita
    ? convertDateTime(props.unit.unixtimePoslednegoObnovleniyaUnita)
    : "";
});

function otkritZadachi() {
  router.push({ name: "unit_jobs", params: { id: props.unit.id } });
}
</script>

<template>
  <div v-if="pokazat" class="unit-card-alert">
    <GhBanner
      v-if="error"
      variant="danger"
      :title="$t('unit.spisok_unitov.card.messages.error_hint')"
    >
      <p v-if="errorUpdatedAt" class="unit-card-alert__details">
        {{ $t("unit.spisok_unitov.card.header.updated_at") }} {{ errorUpdatedAt }}
      </p>

      <template #actions>
        <GhButton
          size="sm"
          icon="arrow-right"
          :label="$t('unit.spisok_unitov.card.buttons.open_jobs')"
          @click="otkritZadachi"
        />
      </template>
    </GhBanner>

    <GhBanner
      v-if="unit.containerStateMismatch"
      variant="attention"
      :title="$t('unit.spisok_unitov.card.container_state.title')"
    >
      <p class="unit-card-alert__details">
        {{
          $t("unit.spisok_unitov.card.container_state.message", {
            expected: expectedLabel,
            actual: actualLabel,
          })
        }}
      </p>
      <p v-if="mismatchDetectedAt" class="unit-card-alert__details">
        {{ $t("unit.spisok_unitov.card.container_state.detected_at") }}: {{ mismatchDetectedAt }}
      </p>
    </GhBanner>
  </div>
</template>

<style scoped>
.unit-card-alert {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.unit-card-alert__details {
  margin: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}
</style>
