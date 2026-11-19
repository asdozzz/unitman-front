<script setup lang="ts">
import {Notify, copyToClipboard} from "quasar";
import {useI18n} from "vue-i18n";
import type {Unit} from "@/modules/unit/store/SpisokUnitov/model/Unit";

const props = defineProps<{
  item: Unit;
}>();

const {t} = useI18n();

/** Копирует идентификатор: он нужен для фильтра и обращений в поддержку. */
async function skopirovatId() {
  await copyToClipboard(props.item.id);

  Notify.create({
    message: t('unit.spisok_unitov.card.messages.id_copied'),
    color: 'positive',
    timeout: 1200,
  });
}
</script>

<template>
  <q-expansion-item
      class="unit-details"
      icon="tune"
      :label="$t('unit.spisok_unitov.card.buttons.details')"
      dense
      expand-separator
  >
    <q-card flat>
      <q-card-section class="q-py-sm">
        <div class="unit-details__row">
          <span class="unit-details__label">{{ $t('unit.spisok_unitov.card.fields.id') }}</span>
          <span class="text-mono unit-details__id">{{ item.id }}</span>
          <q-btn
              flat
              dense
              round
              size="sm"
              icon="content_copy"
              :aria-label="$t('unit.spisok_unitov.card.buttons.copy_id')"
              @click="skopirovatId"
          >
            <q-tooltip>{{ $t('unit.spisok_unitov.card.buttons.copy_id') }}</q-tooltip>
          </q-btn>
        </div>

        <q-separator spaced />

        <div class="unit-card__section-title q-mb-xs">
          {{ $t('unit.spisok_unitov.card.fields.variables') }}
        </div>

        <div v-if="item.peremenie.length === 0" class="text-caption-muted">
          {{ $t('unit.spisok_unitov.card.messages.no_variables') }}
        </div>

        <div
            v-for="peremenaya in item.peremenie"
            :key="peremenaya.id"
            class="unit-details__variable"
        >
          <span class="text-mono">{{ peremenaya.id }}</span>
          <span class="unit-details__equals">=</span>
          <span class="text-mono unit-details__value">{{ peremenaya.value }}</span>
        </div>
      </q-card-section>
    </q-card>
  </q-expansion-item>
</template>

<style scoped>
.unit-details__row {
  display: flex;
  align-items: center;
  gap: var(--app-space-1);
  min-width: 0;
}

.unit-details__label {
  color: var(--app-text-secondary);
  font-size: var(--app-font-size-caption);
}

.unit-details__id {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unit-details__variable {
  display: flex;
  align-items: baseline;
  gap: var(--app-space-1);
  font-size: var(--app-font-size-caption);
  line-height: var(--app-line-height-base);
  word-break: break-all;
}

.unit-details__equals {
  color: var(--app-text-disabled);
}

.unit-details__value {
  color: var(--app-text-secondary);
}
</style>
