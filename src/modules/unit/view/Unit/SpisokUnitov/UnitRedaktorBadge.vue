<script setup lang="ts">
import { computed } from "vue";
import type { GhLabelVariant, OcticonName } from "@/components/ui";
import { GhLabel } from "@/components/ui";

const props = defineProps<{
  mode: "view" | "edit" | "locked" | null;
  prichinaZapreta: string | null;
}>();

type VidRezhima = {
  variant: GhLabelVariant;
  icon: OcticonName;
};

/** Режим редактора → вариант GhLabel и Octicon: иконка дублирует текст. */
const vidRezhima = computed<VidRezhima>(() => {
  switch (props.mode) {
    case "edit":
      return { variant: "success", icon: "pencil" };
    case "view":
      return { variant: "neutral", icon: "eye" };
    case "locked":
      return { variant: "danger", icon: "lock" };
    default:
      return { variant: "neutral", icon: "pencil" };
  }
});

/** Ключ перевода подписи режима. */
const klyuchPodpisi = computed<string | null>(() => {
  return props.mode ? `unit.redaktor.badge.${props.mode}` : null;
});

/** Причина запрета приходит с бэкенда; неизвестную показываем как есть. */
const klyuchPrichini = computed<string | null>(() => {
  if (!props.prichinaZapreta) {
    return null;
  }

  return `unit.redaktor.prichina.${props.prichinaZapreta}`;
});
</script>

<template>
  <span v-if="mode" class="unit-redaktor">
    <GhLabel :variant="vidRezhima.variant" :icon="vidRezhima.icon">
      {{ $t(klyuchPodpisi as string) }}
    </GhLabel>

    <q-tooltip v-if="klyuchPrichini">
      {{ $t(klyuchPrichini) }}
    </q-tooltip>
  </span>
</template>

<style scoped>
.unit-redaktor {
  display: inline-flex;
  align-items: center;
}
</style>
