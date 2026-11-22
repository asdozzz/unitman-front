<script setup lang="ts">
import { computed } from "vue";
import type { GhLabelVariant, OcticonName } from "@/components/ui";
import { GhLabel } from "@/components/ui";
import type { UnitUiState } from "@/modules/unit/utils/unitStatus";

const props = withDefaults(
  defineProps<{
    state: UnitUiState;
    compact?: boolean;
    /**
     * Скрыть тип активной задачи («Сборка», «Запуск») в подписи бейджа.
     *
     * В узкой шапке карточки деталь отнимает место у названия юнита, а
     * tooltip бейджа всё равно показывает её. На широкой плашке деталь
     * остаётся видимой.
     */
    hideDetail?: boolean;
  }>(),
  {
    compact: false,
    hideDetail: false,
  },
);

type VidStatusa = {
  variant: GhLabelVariant;
  icon: OcticonName;
};

/**
 * Статус → вариант GhLabel и Octicon по таблице P5. Иконка дублирует текст,
 * чтобы состояние читалось и без цвета.
 */
const vidStatusa = computed<VidStatusa>(() => {
  switch (props.state.status) {
    case "running":
      return { variant: "success", icon: "play" };
    case "prepared":
      return { variant: "neutral", icon: "check" };
    case "stopped":
      return { variant: "neutral", icon: "pause" };
    case "error":
    case "broken":
      return { variant: "danger", icon: "x-circle" };
    case "busy":
    default:
      return { variant: "accent", icon: "sync" };
  }
});
</script>

<template>
  <span class="unit-status" role="status">
    <GhLabel
      :variant="vidStatusa.variant"
      :icon="vidStatusa.icon"
      :class="{ 'unit-status--compact': compact }"
    >
      <span class="unit-status__label">{{ $t(state.labelKey) }}</span>

      <span
        v-if="state.busyText && !compact && !hideDetail"
        class="unit-status__detail"
      >
        {{ $t("unit.tipi_zadach." + state.busyText) }}
      </span>
    </GhLabel>

    <q-tooltip v-if="state.prozesAktiven">
      <div v-if="state.busyText">{{ $t("unit.tipi_zadach." + state.busyText) }}</div>
      <div v-if="state.progress">
        {{
          $t("unit.spisok_unitov.card.status.process_progress", {
            done: state.progress.zaversheno,
            total: state.progress.vsego,
          })
        }}
      </div>
    </q-tooltip>
  </span>
</template>

<style scoped>
.unit-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.unit-status__label {
  letter-spacing: 0.02em;
}

.unit-status__detail {
  font-weight: var(--fontWeight-normal);
  opacity: 0.85;
}

/* В компактной строке точка и текст уже несут цвет — плашку убираем. */
.unit-status--compact.gh-label {
  height: auto;
  padding: 0;
  border-color: transparent;
  background-color: transparent;
}
</style>
