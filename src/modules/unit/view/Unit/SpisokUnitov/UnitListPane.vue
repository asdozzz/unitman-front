<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import type { Unit } from "@/modules/unit/store/SpisokUnitov/model/Unit";
import { useSpisokUnitovStore } from "@/modules/unit/store/SpisokUnitovStore";
import { deriveUnitUiState, type UnitUiState } from "@/modules/unit/utils/unitStatus";
import { convertDate } from "@/utils/dates";
import { GhButton, GhIcon } from "@/components/ui";
import UnitStatusBadge from "@/modules/unit/view/Unit/SpisokUnitov/UnitStatusBadge.vue";

const props = withDefaults(
  defineProps<{
    items: Unit[];
    selectedId: string | null;
    emptyFiltered?: boolean;
  }>(),
  {
    emptyFiltered: false,
  },
);

const emit = defineEmits<{
  select: [unitId: string];
  reset: [];
}>();

const unitiStore = useSpisokUnitovStore();
const { esliZapushen, esliEstAktivniyProzes, nazvanieTekusheiZadachi, progressProzesaUnita } =
  storeToRefs(unitiStore);

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
      :class="{ 'unit-list__row--active': item.id === selectedId }"
      :aria-current="item.id === selectedId ? 'true' : undefined"
      @click="emit('select', item.id)"
      @keydown.down.prevent="peremestitFokus(index, 1)"
      @keydown.up.prevent="peremestitFokus(index, -1)"
      @keydown.home.prevent="fokusNaKray('nachalo')"
      @keydown.end.prevent="fokusNaKray('konec')"
    >
      <span class="unit-list__status">
        <UnitStatusBadge :state="sostoyaniya[item.id]" compact />
        <GhIcon
          v-if="item.containerStateMismatch"
          name="alert"
          :size="15"
          class="unit-list__warning"
        >
          <q-tooltip>
            {{
              $t("unit.spisok_unitov.card.container_state.message", {
                expected: $t(
                  `unit.spisok_unitov.card.container_state.states.${item.containerStateMismatchExpected ?? 'unknown'}`,
                ),
                actual: $t(
                  `unit.spisok_unitov.card.container_state.states.${item.containerStateMismatchActual ?? 'unknown'}`,
                ),
              })
            }}
          </q-tooltip>
        </GhIcon>
      </span>

      <span class="unit-list__main">
        <span class="unit-list__name" :title="item.name">{{ item.name }}</span>
        <span class="unit-list__meta" :title="`${item.projectName} · ${item.branch}`">
          {{ item.projectName }} · {{ item.branch }}
        </span>
      </span>

      <span class="unit-list__updated">
        {{ convertDate(item.unixtimePoslednegoObnovleniyaUnita) }}
      </span>
    </button>

    <div
      v-if="items.length === 0"
      class="unit-list__empty"
      role="status"
      aria-live="polite"
    >
      <span class="unit-list__empty-title">
        {{
          emptyFiltered
            ? $t("unit.spisok_unitov.list.empty_filtered")
            : $t("unit.spisok_unitov.list.empty_result")
        }}
      </span>

      <GhButton
        v-if="emptyFiltered"
        class="unit-list__empty-action"
        variant="default"
        size="sm"
        icon="filter"
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
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-large);
  background-color: var(--bgColor-default);
}

.unit-list__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 56px;
  padding: 8px 12px;
  border: 0;
  border-bottom: 1px solid var(--borderColor-default);
  border-left: 3px solid transparent;
  background: transparent;
  color: var(--fgColor-default);
  text-align: left;
  cursor: pointer;
  transition: background-color 80ms ease-out;
}

.unit-list__row:last-of-type {
  border-bottom: 0;
}

.unit-list__row:hover {
  background-color: var(--bgColor-muted);
}

.unit-list__row--active {
  border-left-color: var(--fgColor-accent);
  background-color: var(--bgColor-accent-muted);
}

.unit-list__row:focus-visible {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: -2px;
}

.unit-list__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.unit-list__name {
  overflow: hidden;
  font-weight: var(--fontWeight-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unit-list__meta {
  overflow: hidden;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unit-list__status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.unit-list__warning {
  color: var(--fgColor-attention);
}

.unit-list__updated {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  white-space: nowrap;
}

.unit-list__empty {
  padding: 16px;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-body);
  text-align: center;
}

.unit-list__empty-title {
  display: block;
}

.unit-list__empty-action {
  margin-top: 8px;
}
</style>
