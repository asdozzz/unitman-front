<script setup lang="ts">
import { computed } from "vue";
import { GhLabel } from "@/components/ui";
import type { GhLabelVariant, OcticonName } from "@/components/ui";
import type { StatusWorkspace } from "@/modules/opencode/model/Workspace";

/**
 * Бейдж статуса жизненного цикла workspace.
 *
 * Единственный цветовой индикатор состояния в карточке: ошибка, выполнение и
 * архив различаются вариантом GhLabel и иконкой. `role="status"` сохраняет
 * озвучивание смены состояния скринридером.
 */
const props = defineProps<{ status: StatusWorkspace }>();

const variant = computed<GhLabelVariant>(() => {
    switch (props.status) {
        case "RUNNING":
            return "success";
        case "CREATING":
        case "STARTING":
        case "ARCHIVING":
        case "DELETING":
            return "accent";
        case "ERROR":
            return "danger";
        default:
            return "neutral";
    }
});

const ikonka = computed<OcticonName>(() => {
    switch (props.status) {
        case "RUNNING":
            return "play";
        case "CREATING":
        case "STARTING":
        case "ARCHIVING":
        case "DELETING":
            return "sync";
        case "ERROR":
            return "x-circle";
        default:
            return "archive";
    }
});
</script>

<template>
  <GhLabel
      :variant="variant"
      :icon="ikonka"
      role="status"
      class="workspace-status-badge"
  >
    {{ $t(`opencode.workspace.status.${status}`) }}
  </GhLabel>
</template>
