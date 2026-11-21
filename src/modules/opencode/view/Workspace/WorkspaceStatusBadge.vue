<script setup lang="ts">
import { computed } from "vue";
import {
    cvetStatusaWorkspace,
    type StatusWorkspace,
} from "@/modules/opencode/model/Workspace";

/**
 * Бейдж статуса жизненного цикла workspace.
 *
 * Единственный цветовой индикатор состояния в карточке: ошибка, выполнение и
 * архив различаются цветом и подписью, без дублирующих рамок и текстов.
 */
const props = defineProps<{ status: StatusWorkspace }>();

const cvet = computed(() => cvetStatusaWorkspace(props.status));
</script>

<template>
  <q-badge :color="cvet" class="workspace-status-badge">
    {{ $t(`opencode.workspace.status.${status}`) }}
  </q-badge>
</template>
