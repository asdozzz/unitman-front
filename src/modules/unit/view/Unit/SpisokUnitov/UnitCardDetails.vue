<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { copyToClipboard } from "quasar";
import type { Unit } from "@/modules/unit/store/SpisokUnitov/model/Unit";
import { GhButton, type OcticonName } from "@/components/ui";

const props = defineProps<{
  item: Unit;
}>();

// Локальный фидбек копирования: иконка на время меняется на галочку.
const skopirovan = ref(false);
let tajmer: ReturnType<typeof setTimeout> | null = null;

const ikonkaKopirovaniya = computed<OcticonName>(() =>
  skopirovan.value ? "check" : "copy",
);

/** Копирует идентификатор: он нужен для фильтра и обращений в поддержку. */
async function skopirovatId() {
  await copyToClipboard(props.item.id);

  skopirovan.value = true;

  if (tajmer !== null) {
    clearTimeout(tajmer);
  }

  tajmer = setTimeout(() => {
    skopirovan.value = false;
    tajmer = null;
  }, 1200);
}

onBeforeUnmount(() => {
  if (tajmer !== null) {
    clearTimeout(tajmer);
    tajmer = null;
  }
});
</script>

<template>
  <q-expansion-item
    class="unit-details"
    :label="$t('unit.spisok_unitov.card.buttons.details')"
    dense
    expand-separator
  >
    <q-card flat>
      <q-card-section class="q-py-sm">
        <div class="unit-details__row">
          <span class="unit-details__label">{{ $t("unit.spisok_unitov.card.fields.id") }}</span>
          <span class="gh-mono unit-details__id">{{ item.id }}</span>
          <GhButton
            variant="invisible"
            size="sm"
            :icon="ikonkaKopirovaniya"
            :aria-label="
              skopirovan
                ? $t('unit.spisok_unitov.card.messages.id_copied')
                : $t('unit.spisok_unitov.card.buttons.copy_id')
            "
            @click="skopirovatId"
          >
            <q-tooltip>
              {{
                skopirovan
                  ? $t("unit.spisok_unitov.card.messages.id_copied")
                  : $t("unit.spisok_unitov.card.buttons.copy_id")
              }}
            </q-tooltip>
          </GhButton>
        </div>

        <q-separator spaced />

        <div class="unit-details__section-title">
          {{ $t("unit.spisok_unitov.card.fields.variables") }}
        </div>

        <div v-if="item.peremenie.length === 0" class="unit-details__muted">
          {{ $t("unit.spisok_unitov.card.messages.no_variables") }}
        </div>

        <div
          v-for="peremenaya in item.peremenie"
          :key="peremenaya.id"
          class="unit-details__variable"
        >
          <span class="gh-mono">{{ peremenaya.id }}</span>
          <span class="unit-details__equals">=</span>
          <span class="gh-mono unit-details__value">{{ peremenaya.value }}</span>
        </div>
      </q-card-section>
    </q-card>
  </q-expansion-item>
</template>

<style scoped>
.unit-details__row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.unit-details__label {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.unit-details__section-title {
  margin-bottom: 4px;
  color: var(--fgColor-default);
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-semibold);
}

.unit-details__muted {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
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
  gap: 4px;
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-normal);
  word-break: break-all;
}

.unit-details__equals {
  color: var(--fgColor-muted);
}

.unit-details__value {
  color: var(--fgColor-muted);
}
</style>
