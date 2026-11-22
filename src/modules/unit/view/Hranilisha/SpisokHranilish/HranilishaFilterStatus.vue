<script setup lang="ts">
import type {HranilishaFilterStatus} from "@/modules/unit/store/SpisokHranilish/model/HranilishaFiltri";

/** Описание одного статуса: цветная точка задаётся модификатором `status-chip--<status>`. */
type OpisanieStatusa = {
  status: HranilishaFilterStatus;
};

/**
 * Порядок чипов заморожен: сначала подтверждённые, затем ожидающие проверки.
 */
const STATUSI: OpisanieStatusa[] = [
  {status: "confirmed"},
  {status: "unconfirmed"},
];

const props = defineProps<{
  modelValue: HranilishaFilterStatus[];
  counts: Record<HranilishaFilterStatus, number>;
  total: number;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: HranilishaFilterStatus[]];
}>();

/** Клик по «Все» сбрасывает выбор статусов. */
function vybratVse() {
  emit("update:modelValue", []);
}

/** Мультивыбор: статус добавляется или убирается без потери остальных. */
function pereklyuchit(status: HranilishaFilterStatus) {
  const vibrali = new Set<HranilishaFilterStatus>(props.modelValue);

  if (vibrali.has(status)) {
    vibrali.delete(status);
  } else {
    vibrali.add(status);
  }

  emit("update:modelValue", Array.from(vibrali));
}

/** Счётчик может прийти неполным — отсутствующее значение показывает 0. */
function schetchik(status: HranilishaFilterStatus): number {
  return props.counts[status] ?? 0;
}
</script>

<template>
  <div class="status-filter" role="group" :aria-label="$t('unit.spisok_rep.filter.status_label')">
    <button
        type="button"
        class="status-chip status-chip--all"
        :class="{'status-chip--active': modelValue.length === 0}"
        :aria-pressed="modelValue.length === 0 ? 'true' : 'false'"
        @click="vybratVse"
    >
      <span class="status-chip__label">{{ $t('unit.spisok_rep.filter.status_all') }}</span>
      <span class="status-chip__count">{{ total }}</span>
    </button>

    <button
        v-for="item in STATUSI"
        :key="item.status"
        type="button"
        class="status-chip"
        :class="[`status-chip--${item.status}`, {'status-chip--active': modelValue.includes(item.status)}]"
        :aria-pressed="modelValue.includes(item.status) ? 'true' : 'false'"
        @click="pereklyuchit(item.status)"
    >
      <span class="status-chip__dot" aria-hidden="true" />
      <span class="status-chip__label">{{ $t('unit.spisok_rep.card.status.' + item.status) }}</span>
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

/* Цветные точки статусов; счётчик остаётся muted. */
.status-chip--confirmed .status-chip__dot {
  background: var(--fgColor-success);
}

.status-chip--unconfirmed .status-chip__dot {
  background: var(--fgColor-muted);
}

/* Активный чип: цветная точка + цветной текст + тонкий бордер. */
.status-chip--all.status-chip--active {
  border-color: var(--borderColor-accent-muted);
  background: var(--bgColor-accent-muted);
  color: var(--fgColor-accent);
}

.status-chip--confirmed.status-chip--active {
  border-color: var(--borderColor-success-muted);
  background: var(--bgColor-success-muted);
  color: var(--fgColor-success);
}

/* unconfirmed — нейтральный, как в HranilishaStatusBadge. */
.status-chip--unconfirmed.status-chip--active {
  border-color: var(--borderColor-default);
  background: var(--bgColor-neutral-muted);
  color: var(--fgColor-default);
}
</style>
