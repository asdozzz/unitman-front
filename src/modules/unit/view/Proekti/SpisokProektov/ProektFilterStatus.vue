<script setup lang="ts">
import type {ProektFilterStatus} from "@/modules/unit/store/SpisokProektov/model/ProektFiltri";

/** Описание одного состояния: цветная точка задаётся модификатором `status-chip--<status>`. */
type OpisanieStatusa = {
  status: ProektFilterStatus;
  /** Суффикс i18n-ключа `card.status.*`. */
  labelKey: string;
};

/**
 * Порядок чипов заморожен контрактом: от активных процессов к ошибкам.
 */
const STATUSI: OpisanieStatusa[] = [
  {status: "BUILD_PENDING", labelKey: "build_pending"},
  {status: "BUILD_SUCCESS", labelKey: "build_success"},
  {status: "NEW", labelKey: "new"},
  {status: "BUILD_ERROR", labelKey: "build_error"},
  {status: "REMOVE_PENDING", labelKey: "remove_pending"},
  {status: "REMOVE_ERROR", labelKey: "remove_error"},
];

const props = defineProps<{
  modelValue: ProektFilterStatus[];
  counts: Record<ProektFilterStatus, number>;
  total: number;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: ProektFilterStatus[]];
}>();

/** Клик по «Все» сбрасывает выбор состояний. */
function vybratVse() {
  emit("update:modelValue", []);
}

/** Мультивыбор: состояние добавляется или убирается без потери остальных. */
function pereklyuchit(status: ProektFilterStatus) {
  const vibrali = new Set<ProektFilterStatus>(props.modelValue);

  if (vibrali.has(status)) {
    vibrali.delete(status);
  } else {
    vibrali.add(status);
  }

  emit("update:modelValue", Array.from(vibrali));
}

/** Счётчик может прийти неполным — отсутствующее значение показывает 0. */
function schetchik(status: ProektFilterStatus): number {
  return props.counts[status] ?? 0;
}

/** CSS-модификатор состояния в нижнем регистре. */
function modifikator(status: ProektFilterStatus): string {
  return status.toLowerCase();
}
</script>

<template>
  <div class="status-filter" role="group" :aria-label="$t('unit.spisok_proektov.filter.status_label')">
    <button
        type="button"
        class="status-chip status-chip--all"
        :class="{'status-chip--active': modelValue.length === 0}"
        :aria-pressed="modelValue.length === 0 ? 'true' : 'false'"
        @click="vybratVse"
    >
      <span class="status-chip__label">{{ $t('unit.spisok_proektov.filter.status_all') }}</span>
      <span class="status-chip__count text-tabular">{{ total }}</span>
    </button>

    <button
        v-for="item in STATUSI"
        :key="item.status"
        type="button"
        class="status-chip"
        :class="[`status-chip--${modifikator(item.status)}`, {'status-chip--active': modelValue.includes(item.status)}]"
        :aria-pressed="modelValue.includes(item.status) ? 'true' : 'false'"
        @click="pereklyuchit(item.status)"
    >
      <span class="status-chip__dot" aria-hidden="true" />
      <span class="status-chip__label">{{ $t('unit.spisok_proektov.card.status.' + item.labelKey) }}</span>
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

/* Цветные точки состояний; счётчик остаётся muted. */
.status-chip--build_pending .status-chip__dot,
.status-chip--remove_pending .status-chip__dot {
  background: var(--app-primary);
}

.status-chip--build_success .status-chip__dot {
  background: var(--app-positive);
}

.status-chip--new .status-chip__dot {
  background: var(--app-text-secondary);
}

.status-chip--build_error .status-chip__dot,
.status-chip--remove_error .status-chip__dot {
  background: var(--app-negative);
}

/* Активный чип: цветная точка + цветной текст + тонкий бордер. */
.status-chip--all.status-chip--active,
.status-chip--build_pending.status-chip--active,
.status-chip--remove_pending.status-chip--active {
  border-color: color-mix(in srgb, var(--app-primary) 45%, transparent);
  color: var(--app-primary);
}

.status-chip--build_success.status-chip--active {
  border-color: color-mix(in srgb, var(--app-positive) 45%, transparent);
  color: var(--app-positive);
}

.status-chip--new.status-chip--active {
  border-color: var(--app-border);
  background: var(--app-surface-muted);
  color: var(--app-text-secondary);
}

.status-chip--build_error.status-chip--active,
.status-chip--remove_error.status-chip--active {
  border-color: color-mix(in srgb, var(--app-negative) 45%, transparent);
  color: var(--app-negative);
}
</style>
