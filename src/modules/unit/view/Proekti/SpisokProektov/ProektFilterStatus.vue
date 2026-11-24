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
  {status: "NEW", labelKey: "new"},
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
      <span class="status-chip__count">{{ total }}</span>
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
      <span class="status-chip__count">{{ schetchik(item.status) }}</span>
    </button>
  </div>
</template>

<style scoped>
.status-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 2px 10px;
  border: 1px solid transparent;
  border-radius: var(--borderRadius-full);
  background: transparent;
  color: var(--fgColor-muted);
  font-family: var(--fontStack-system);
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-medium);
  line-height: var(--lineHeight-tight);
  white-space: nowrap;
  cursor: pointer;
  transition:
      background-color 80ms ease-out,
      border-color 80ms ease-out,
      color 80ms ease-out;
}

.status-chip:hover {
  border-color: var(--borderColor-default);
  background: var(--bgColor-muted);
}

.status-chip:focus-visible {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: 2px;
}

.status-chip__dot {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border-radius: var(--borderRadius-full);
  background: var(--fgColor-muted);
}

.status-chip__count {
  color: var(--fgColor-muted);
  font-weight: var(--fontWeight-normal);
}

/* Цветные точки состояний; счётчик остаётся muted. */
.status-chip--remove_pending .status-chip__dot {
  background: var(--fgColor-accent);
}

.status-chip--new .status-chip__dot {
  background: var(--fgColor-muted);
}

.status-chip--remove_error .status-chip__dot {
  background: var(--fgColor-danger);
}

/* Активный чип: цветная точка + цветной текст + тонкий бордер. */
.status-chip--all.status-chip--active,
.status-chip--remove_pending.status-chip--active {
  border-color: var(--borderColor-accent-muted);
  background: var(--bgColor-accent-muted);
  color: var(--fgColor-accent);
}

.status-chip--new.status-chip--active {
  border-color: var(--borderColor-default);
  background: var(--bgColor-neutral-muted);
  color: var(--fgColor-default);
}

.status-chip--remove_error.status-chip--active {
  border-color: var(--borderColor-danger-muted);
  background: var(--bgColor-danger-muted);
  color: var(--fgColor-danger);
}
</style>
