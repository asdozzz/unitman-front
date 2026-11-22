<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import GhIcon from "./GhIcon.vue";
import type { GhControlSize, GhSelectOption } from "./types";

const props = withDefaults(
  defineProps<{
    modelValue: string | number | null;
    options: GhSelectOption[];
    label?: string;
    placeholder?: string;
    size?: GhControlSize;
    disabled?: boolean;
    clearable?: boolean;
    error?: boolean;
    errorMessage?: string;
    /** id нативного контрола для связи с GhFormField. */
    id?: string;
    ariaDescribedby?: string;
    ariaInvalid?: boolean;
    /** Режим поиска: поле ввода с фильтрацией списка опций. */
    useInput?: boolean;
    /** Скрывать уже выбранную опцию из выпадающего списка. */
    hideSelected?: boolean;
    /** Показывать выбранное значение прямо в поле ввода (вместе с use-input). */
    fillInput?: boolean;
    /** Спиннер загрузки в поле (например, пока грузятся ветки). */
    loading?: boolean;
  }>(),
  {
    label: "",
    placeholder: "",
    size: "md",
    disabled: false,
    clearable: false,
    error: false,
    errorMessage: "",
    id: undefined,
    ariaDescribedby: undefined,
    ariaInvalid: false,
    useInput: false,
    hideSelected: false,
    fillInput: false,
    loading: false,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string | number | null): void;
  (
    e: "filter",
    inputValue: string,
    update: (callback: () => void) => void,
    abort: () => void,
  ): void;
}>();

const { t } = useI18n();

const podskazka = computed<string>(
  () => props.placeholder || t("common.select.placeholder"),
);

const ariaInvalidFinal = computed<boolean | undefined>(() =>
  props.ariaInvalid || props.error ? true : undefined,
);

function obnovitZnachenie(value: string | number | null): void {
  emit("update:modelValue", value);
}

/** Пробрасывает фильтрацию ввода наружу для серверного поиска опций. */
function propogatFilter(
  inputValue: string,
  update: (callback: () => void) => void,
  abort: () => void,
): void {
  emit("filter", inputValue, update, abort);
}
</script>

<template>
  <div
    class="gh-select primer"
    :class="[`gh-select--${size}`, { 'gh-select--error': error }]"
  >
    <span v-if="label" class="gh-select__label">{{ label }}</span>

    <q-select
      class="gh-select__field"
      :model-value="modelValue"
      :options="options"
      :placeholder="podskazka"
      :disable="disabled"
      :clearable="clearable"
      :error="error"
      :id="id"
      :aria-label="label || podskazka"
      :aria-describedby="ariaDescribedby"
      :aria-invalid="ariaInvalidFinal"
      :use-input="useInput"
      :hide-selected="hideSelected"
      :fill-input="fillInput"
      :loading="loading"
      emit-value
      map-options
      outlined
      dense
      hide-bottom-space
      popup-content-class="gh-select__menu primer"
      @update:model-value="obnovitZnachenie"
      @filter="propogatFilter"
    >
      <template #option="scope">
        <q-item v-bind="scope.itemProps" class="gh-select__option">
          <q-item-section>
            <q-item-label class="gh-select__option-label">
              {{ scope.opt.label }}
            </q-item-label>
            <q-item-label
              v-if="scope.opt.description"
              caption
              class="gh-select__option-description"
            >
              {{ scope.opt.description }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </template>

      <!-- Дополнительные действия справа (кнопки, спиннеры). -->
      <template v-if="$slots.append" #append>
        <slot name="append" />
      </template>

      <!-- Пустой результат фильтрации. -->
      <template v-if="$slots['no-option']" #no-option="scope">
        <slot name="no-option" v-bind="scope" />
      </template>
    </q-select>

    <p v-if="errorMessage" class="gh-select__error">
      <GhIcon name="alert" :size="12" class="gh-select__error-icon" />
      <span>{{ errorMessage }}</span>
    </p>
  </div>
</template>

<style scoped>
.gh-select {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.gh-select__label {
  color: var(--fgColor-default);
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
}

/*
 * Высота поля. В dense-режиме Quasar держит корень поля на 40px даже при
 * контроле 32px, поэтому селект выходил выше соседней кнопки/инпута.
 * Фиксируем высоту корня и растягиваем внутреннюю часть на всю высоту.
 */
.gh-select__field {
  height: var(--control-height-md);
  min-height: var(--control-height-md);
}

.gh-select .gh-select__field :deep(.q-field__inner) {
  height: 100%;
  min-height: 0;
}

.gh-select .gh-select__field :deep(.q-field__control) {
  height: 100%;
  min-height: 0;
  padding: 0;
  border-radius: var(--borderRadius-medium);
  background-color: var(--bgColor-default);
}

.gh-select__field :deep(.q-field__control::before) {
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-medium);
}

.gh-select__field :deep(.q-field__control::after) {
  border-radius: var(--borderRadius-medium);
}

/*
 * Значение выравнивается по центру контрола. Quasar растягивает контейнер,
 * а текст при нулевом padding «прилипал» к верху — отсюда кривые отступы у
 * «Все проекты». Длинные значения обрезаются троеточием, а не переносятся.
 */
.gh-select__field :deep(.q-field__control-container) {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 12px;
}

.gh-select__field :deep(.q-field__native) {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0;
  overflow: hidden;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-normal);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Режим use-input: значение/поиск живёт в нативном input. */
.gh-select__field :deep(.q-field__input) {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-normal);
  white-space: nowrap;
}

.gh-select__field :deep(.q-field__native::placeholder),
.gh-select__field :deep(.q-field__input::placeholder) {
  color: var(--fgColor-muted);
  opacity: 1;
}

/*
 * Стрелка (и прочие иконки справа): в dense-режиме Quasar задаёт маргиналу
 * фиксированную высоту 40px, поэтому в контроле 32px иконка съезжала вниз.
 * Прижимаем маргинал к высоте контрола и центрируем содержимое по вертикали.
 */
.gh-select__field :deep(.q-field__append) {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 0;
  padding: 0 8px;
  color: var(--fgColor-muted);
}

.gh-select__field :deep(.q-field__append .q-icon),
.gh-select__field :deep(.q-select__dropdown-icon) {
  margin: 0;
}

.gh-select__field :deep(.q-field__control:hover::before) {
  border-color: var(--fgColor-muted);
}

.gh-select__field.q-field--focused :deep(.q-field__control) {
  box-shadow: 0 0 0 2px var(--focus-ring-color);
}

.gh-select__field.q-field--focused :deep(.q-field__control::before) {
  border-color: var(--focus-outlineColor);
}

.gh-select__field.q-field--error :deep(.q-field__control) {
  box-shadow: 0 0 0 2px var(--focus-ring-danger);
}

.gh-select__field.q-field--error :deep(.q-field__control::before) {
  border-color: var(--fgColor-danger);
}

.gh-select__field.q-field--disabled :deep(.q-field__control) {
  background-color: var(--bgColor-muted);
  opacity: 1;
}

/* Ошибка рендерится своим элементом — q-field__bottom скрыт hide-bottom-space. */
.gh-select__error {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  color: var(--fgColor-danger);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-normal);
}

.gh-select__error-icon {
  flex-shrink: 0;
  color: var(--fgColor-danger);
}

.gh-select--sm .gh-select__field {
  height: var(--control-height-sm);
  min-height: var(--control-height-sm);
}

.gh-select--lg .gh-select__field {
  height: var(--control-height-lg);
  min-height: var(--control-height-lg);
}

.gh-select__menu {
  padding: 4px;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-large);
  background-color: var(--bgColor-default);
  box-shadow: var(--shadow-floating-small);
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.gh-select__option {
  min-height: 32px;
  padding: 6px 8px;
  border-radius: var(--borderRadius-medium);
  color: var(--fgColor-default);
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-tight);
}

.gh-select__option-label {
  font-size: var(--fontSize-body);
}

.gh-select__option-description {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}
</style>
