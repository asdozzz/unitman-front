<script setup lang="ts">
import type {PolzovatelFilterStatus} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/model/PolzovatelFiltri";

/** Описание одного статуса: цветная точка задаётся модификатором `status-chip--<status>`. */
type OpisanieStatusa = {
  status: PolzovatelFilterStatus;
};

/** Порядок чипов фиксирован: сначала активные, затем заблокированные. */
const STATUSI: OpisanieStatusa[] = [
  {status: "active"},
  {status: "blocked"},
];

const props = defineProps<{
  modelValue: PolzovatelFilterStatus[];
  counts: Record<PolzovatelFilterStatus, number>;
  total: number;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: PolzovatelFilterStatus[]];
}>();

/** Клик по «Все» сбрасывает выбор статусов. */
function vybratVse() {
  emit("update:modelValue", []);
}

/** Мультивыбор: статус добавляется или убирается без потери остальных. */
function pereklyuchit(status: PolzovatelFilterStatus) {
  const vibrali = new Set<PolzovatelFilterStatus>(props.modelValue);

  if (vibrali.has(status)) {
    vibrali.delete(status);
  } else {
    vibrali.add(status);
  }

  emit("update:modelValue", Array.from(vibrali));
}

/** Счётчик может прийти неполным — отсутствующее значение показывает 0. */
function schetchik(status: PolzovatelFilterStatus): number {
  return props.counts[status] ?? 0;
}
</script>

<template>
  <div class="status-filter" role="group" :aria-label="$t('account.spisok.filter.status_label')">
    <button
        type="button"
        class="status-chip status-chip--all"
        :class="{'status-chip--active': modelValue.length === 0}"
        :aria-pressed="modelValue.length === 0 ? 'true' : 'false'"
        @click="vybratVse"
    >
      <span class="status-chip__label">{{ $t('account.spisok.filter.status_all') }}</span>
      <span class="status-chip__count text-tabular">{{ total }}</span>
    </button>

    <button
        v-for="item in STATUSI"
        :key="item.status"
        type="button"
        class="status-chip"
        :class="[`status-chip--status-${item.status}`, {'status-chip--active': modelValue.includes(item.status)}]"
        :aria-pressed="modelValue.includes(item.status) ? 'true' : 'false'"
        @click="pereklyuchit(item.status)"
    >
      <span class="status-chip__dot" aria-hidden="true" />
      <span class="status-chip__label">{{ $t('account.spisok.card.status.' + item.status) }}</span>
      <span class="status-chip__count text-tabular">{{ schetchik(item.status) }}</span>
    </button>
  </div>
</template>

<style scoped>
.status-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--app-space-1);
  min-width: 0;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--app-space-1);
  min-height: 32px;
  padding: var(--app-space-1) var(--app-space-3);
  border: 1px solid transparent;
  border-radius: var(--app-radius-pill);
  background: transparent;
  color: var(--app-text-secondary);
  font-family: inherit;
  font-size: var(--app-font-size-caption);
  font-weight: 600;
  line-height: var(--app-line-height-tight);
  white-space: nowrap;
  cursor: pointer;
  transition:
      background-color var(--app-duration-fast) var(--app-easing),
      border-color var(--app-duration-fast) var(--app-easing),
      color var(--app-duration-fast) var(--app-easing);
}

.status-chip:hover {
  border-color: var(--app-border);
  background: var(--app-surface-muted);
}

.status-chip:focus-visible {
  outline: 2px solid var(--app-focus-ring);
  outline-offset: 2px;
}

.status-chip__dot {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--app-text-disabled);
}

.status-chip__count {
  color: var(--app-text-secondary);
  font-weight: 400;
}

/* Цветные точки статусов; счётчик остаётся muted.
   Модификатор статуса отделён от модификатора выбора (`--active`). */
.status-chip--status-active .status-chip__dot {
  background: var(--app-positive);
}

.status-chip--status-blocked .status-chip__dot {
  background: var(--app-negative);
}

/*
 * Активный чип: цветная точка + цветной текст + тонкий бордер.
 * Заливки 12% нет — меньше цвета, чётче скан.
 */
.status-chip--all.status-chip--active {
  border-color: color-mix(in srgb, var(--app-primary) 45%, transparent);
  color: var(--app-primary);
}

.status-chip--status-active.status-chip--active {
  border-color: color-mix(in srgb, var(--app-positive) 45%, transparent);
  color: var(--app-positive);
}

.status-chip--status-blocked.status-chip--active {
  border-color: color-mix(in srgb, var(--app-negative) 45%, transparent);
  color: var(--app-negative);
}
</style>
