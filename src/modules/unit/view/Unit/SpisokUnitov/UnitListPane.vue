<script setup lang="ts">
import {computed, ref} from "vue";
import {storeToRefs} from "pinia";
import type {Unit} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import {useSpisokUnitovStore} from "@/modules/unit/store/SpisokUnitovStore";
import {deriveUnitUiState, type UnitUiState} from "@/modules/unit/utils/unitStatus";
import {convertDate} from "@/utils/dates";
import UnitStatusBadge from "@/modules/unit/view/Unit/SpisokUnitov/UnitStatusBadge.vue";

const props = withDefaults(defineProps<{
  items: Unit[];
  selectedId: string | null;
  emptyFiltered?: boolean;
}>(), {
  emptyFiltered: false,
});

const emit = defineEmits<{
  select: [unitId: string];
  reset: [];
}>();

const unitiStore = useSpisokUnitovStore();
const {
  esliZapushen,
  esliEstAktivniyProzes,
  nazvanieTekusheiZadachi,
  progressProzesaUnita,
} = storeToRefs(unitiStore);

/**
 * Состояния считаются одним проходом по списку, чтобы строка не создавала
 * собственный набор реактивных зависимостей.
 */
const sostoyaniya = computed<Record<string, UnitUiState>>(() => {
  const result: Record<string, UnitUiState> = {};

  props.items.forEach((item: Unit) => {
    result[item.id] = deriveUnitUiState({
      zapushen: esliZapushen.value(item),
      error: item.error,
      zanyat: item.zanyat === true,
      prozesAktiven: esliEstAktivniyProzes.value(item),
      tekushayaZadacha: nazvanieTekusheiZadachi.value(item),
      progress: progressProzesaUnita.value(item),
      commands: item.commands,
    });
  });

  return result;
});

const ryady = ref<HTMLButtonElement[]>([]);

function zaregistrirovatRyad(el: unknown, index: number) {
  if (el instanceof HTMLButtonElement) {
    ryady.value[index] = el;
  }
}

/** Стрелки перемещают выбор и фокус, не уводя пользователя из списка. */
function peremestitFokus(index: number, shag: 1 | -1) {
  const sleduyushiyIndex = Math.min(props.items.length - 1, Math.max(0, index + shag));
  const unit = props.items[sleduyushiyIndex];

  if (!unit) {
    return;
  }

  ryady.value[sleduyushiyIndex]?.focus();
  emit("select", unit.id);
}

function fokusNaKray(kray: "nachalo" | "konec") {
  const index = kray === "nachalo" ? 0 : props.items.length - 1;
  const unit = props.items[index];

  if (!unit) {
    return;
  }

  ryady.value[index]?.focus();
  emit("select", unit.id);
}
</script>

<template>
  <div class="unit-list" role="group" :aria-label="$t('unit.spisok_unitov.view.workspace_list')">
    <button
        v-for="(item, index) in items"
        :key="item.id"
        :ref="(el) => zaregistrirovatRyad(el, index)"
        type="button"
        class="unit-list__row"
        :class="{'unit-list__row--active': item.id === selectedId}"
        :aria-current="item.id === selectedId ? 'true' : undefined"
        @click="emit('select', item.id)"
        @keydown.down.prevent="peremestitFokus(index, 1)"
        @keydown.up.prevent="peremestitFokus(index, -1)"
        @keydown.home.prevent="fokusNaKray('nachalo')"
        @keydown.end.prevent="fokusNaKray('konec')"
    >
      <span class="unit-list__status">
        <UnitStatusBadge :state="sostoyaniya[item.id]" compact />
        <q-icon
            v-if="item.containerStateMismatch"
            name="warning"
            size="15px"
            color="warning"
            class="unit-list__warning"
        >
          <q-tooltip>
            {{ $t('unit.spisok_unitov.card.container_state.message', {
              expected: $t(`unit.spisok_unitov.card.container_state.states.${item.containerStateMismatchExpected ?? 'unknown'}`),
              actual: $t(`unit.spisok_unitov.card.container_state.states.${item.containerStateMismatchActual ?? 'unknown'}`),
            }) }}
          </q-tooltip>
        </q-icon>
      </span>

      <span class="unit-list__main">
        <span class="unit-list__name" :title="item.name">{{ item.name }}</span>
        <span class="unit-list__meta" :title="`${item.projectName} · ${item.branch}`">
          {{ item.projectName }} · {{ item.branch }}
        </span>
      </span>

      <span class="unit-list__updated text-caption-muted">
        {{ convertDate(item.unixtimePoslednegoObnovleniyaUnita) }}
      </span>
    </button>

    <div
        v-if="items.length === 0"
        class="unit-list__empty text-caption-muted"
        role="status"
        aria-live="polite"
    >
      <span class="unit-list__empty-title">
        {{ emptyFiltered
          ? $t('unit.spisok_unitov.list.empty_filtered')
          : $t('unit.spisok_unitov.list.empty_result') }}
      </span>

      <q-btn
          v-if="emptyFiltered"
          class="unit-list__empty-action"
          flat
          dense
          no-caps
          color="primary"
          icon="filter_alt_off"
          :label="$t('unit.spisok_unitov.filter.reset')"
          @click="emit('reset')"
      />
    </div>
  </div>
</template>

<style scoped>
.unit-list {
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-height: 70vh;
  overflow-y: auto;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-lg);
  background: var(--app-surface);
}

.unit-list__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--app-space-2);
  width: 100%;
  min-height: 56px;
  padding: var(--app-space-2) var(--app-space-3);
  border: 0;
  border-bottom: 1px solid var(--app-border);
  border-left: 3px solid transparent;
  background: transparent;
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
  transition: background-color var(--app-duration-fast) var(--app-easing);
}

.unit-list__row:last-of-type {
  border-bottom: 0;
}

.unit-list__row:hover {
  background: var(--app-surface-muted);
}

.unit-list__row--active {
  border-left-color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 8%, transparent);
}

.unit-list__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.unit-list__name {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unit-list__meta {
  overflow: hidden;
  color: var(--app-text-secondary);
  font-size: var(--app-font-size-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unit-list__status {
  display: inline-flex;
  align-items: center;
  gap: var(--app-space-1);
}

.unit-list__updated {
  white-space: nowrap;
}

.unit-list__empty {
  padding: var(--app-space-4);
  text-align: center;
}

.unit-list__empty-title {
  display: block;
}

.unit-list__empty-action {
  margin-top: var(--app-space-2);
}
</style>
