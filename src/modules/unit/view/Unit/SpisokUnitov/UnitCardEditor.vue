<script setup lang="ts">
import {useI18n} from "vue-i18n";
import type {Unit} from "@/modules/unit/store/SpisokUnitov/model/Unit";

defineProps<{
  item: Unit;
}>();

const {t} = useI18n();
</script>

<template>
  <q-btn
      v-if="item.redaktorLink"
      type="a"
      :href="item.redaktorLink"
      target="_blank"
      rel="noopener noreferrer"
      icon="code"
      flat
      round
      size="sm"
      color="primary"
      :aria-label="t('unit.spisok_unitov.card.buttons.open_editor')"
  >
    <q-tooltip>{{ t('unit.spisok_unitov.card.hints.editor_readonly') }}</q-tooltip>
  </q-btn>
</template>
