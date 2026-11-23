<script setup lang="ts">
import { computed } from "vue";
import type { UnitIntention } from "@/modules/unit/store/SpisokUnitov/model/Unit";
import type { GhLabelVariant, OcticonName } from "@/components/ui";
import { GhLabel } from "@/components/ui";
import { convertDateTime } from "@/utils/dates";

const props = defineProps<{
  namereniya: UnitIntention[];
}>();

type VidNamereniya = {
  variant: GhLabelVariant;
  icon: OcticonName;
  labelKey: string;
};

/**
 * Приоритет ровно один: удаление/слияние важнее удержанного обновления,
 * удержанное — важнее обычного. Сами намерения схлопываются на бэкенде,
 * но защищаемся и здесь, если пришли исторические строки.
 */
const vid = computed<VidNamereniya | null>(() => {
  if (props.namereniya.length === 0) {
    return null;
  }

  if (props.namereniya.some((item) => item.tipSobitiya === "VETKA_UDALENA")) {
    return {
      variant: "danger",
      icon: "trash",
      labelKey: "unit.spisok_unitov.card.intentions.delete",
    };
  }

  if (props.namereniya.some((item) => item.tipSobitiya === "VETKA_SMERZHENA")) {
    return {
      variant: "danger",
      icon: "git-merge",
      labelKey: "unit.spisok_unitov.card.intentions.merge",
    };
  }

  if (props.namereniya.some((item) => item.status === "held_autoobnovlenie")) {
    return {
      variant: "attention",
      icon: "clock",
      labelKey: "unit.spisok_unitov.card.intentions.update_held",
    };
  }

  return {
    variant: "accent",
    icon: "sync",
    labelKey: "unit.spisok_unitov.card.intentions.update",
  };
});

/** Подпись типа намерения для tooltip. */
function podpisTipa(item: UnitIntention): string {
  switch (item.tipSobitiya) {
    case "VETKA_UDALENA":
      return "unit.spisok_unitov.card.intentions.type_delete";
    case "VETKA_SMERZHENA":
      return "unit.spisok_unitov.card.intentions.type_merge";
    default:
      return "unit.spisok_unitov.card.intentions.type_update";
  }
}
</script>

<template>
  <span v-if="vid" class="unit-intentions">
    <GhLabel :variant="vid.variant" :icon="vid.icon">
      {{ $t(vid.labelKey) }}
    </GhLabel>

    <q-tooltip>
      <div class="unit-intentions__title">
        {{ $t("unit.spisok_unitov.card.intentions.tooltip") }}
      </div>
      <div
        v-for="item in namereniya"
        :key="`${item.tipSobitiya}-${item.vetka}`"
        class="unit-intentions__row"
      >
        {{ $t(podpisTipa(item)) }} · <span class="gh-mono">{{ item.vetka }}</span>
        · {{ convertDateTime(item.unixtime) }}
      </div>
    </q-tooltip>
  </span>
</template>

<style scoped>
.unit-intentions {
  display: inline-flex;
  align-items: center;
}

.unit-intentions__title {
  margin-bottom: 4px;
  font-weight: var(--fontWeight-semibold);
}

.unit-intentions__row {
  white-space: nowrap;
}
</style>
