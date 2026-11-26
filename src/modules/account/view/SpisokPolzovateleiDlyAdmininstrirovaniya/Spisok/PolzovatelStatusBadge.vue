<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { GhLabel } from "@/components/ui";
import type { GhLabelVariant, OcticonName } from "@/components/ui";
import type { PolzovatelFilterStatus } from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/model/PolzovatelFiltri";

const props = withDefaults(
  defineProps<{
    status: PolzovatelFilterStatus;
    compact?: boolean;
  }>(),
  {
    compact: false,
  },
);

const { t } = useI18n();

/** Вариант бейджа по статусу (P5). */
const variant = computed<GhLabelVariant>(() => {
  if (props.status === "blocked" || props.status === "unverified") {
    return "danger";
  }

  return props.status === "pending" ? "attention" : "success";
});

/** Иконка дублирует текст, чтобы статус читался и без цвета. */
const ikonka = computed<OcticonName>(() => {
  if (props.status === "blocked") {
    return "x-circle";
  }

  if (props.status === "unverified") {
    return "mail";
  }

  return props.status === "pending" ? "clock" : "check-circle";
});

const podpis = computed<string>(() => t("account.spisok.card.status." + props.status));
</script>

<template>
  <GhLabel
    class="polzovatel-status"
    :class="{ 'polzovatel-status--compact': compact }"
    :variant="variant"
    :icon="ikonka"
    :label="podpis"
    role="status"
  />
</template>

<style scoped>
.polzovatel-status {
  flex-shrink: 0;
}
</style>
