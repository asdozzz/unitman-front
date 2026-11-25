<script setup lang="ts">
/**
 * Композер чата: многострочный ввод, Enter — отправить,
 * Shift+Enter — перенос строки.
 *
 * Во время выполнения хода или ожидания подтверждения поле блокируется;
 * пока ход идёт, доступна кнопка остановки.
 */
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { GhButton, GhInput, GhKbd } from "@/components/ui";

const props = defineProps<{
  /** Ввод запрещён (нет реквизитов, идёт ход или ждём подтверждения). */
  disabled: boolean;
  /** Ход агента выполняется. */
  running: boolean;
  /** Цикл приостановлен карточкой подтверждения. */
  paused: boolean;
}>();

const emit = defineEmits<{
  (e: "send", text: string): void;
  (e: "stop"): void;
}>();

const { t } = useI18n();

const tekst = ref<string>("");

function otpravit(): void {
  const znachenie = tekst.value.trim();

  if (znachenie === "" || props.disabled) {
    return;
  }

  emit("send", znachenie);
  tekst.value = "";
}

function obrabotatKlavishu(event: KeyboardEvent): void {
  if (
    event.key !== "Enter" ||
    event.shiftKey ||
    event.isComposing ||
    props.disabled
  ) {
    return;
  }

  event.preventDefault();
  otpravit();
}
</script>

<template>
  <div class="kompozer">
    <p v-if="paused" class="kompozer__paused">
      {{ t("aiChat.composer.paused_hint") }}
    </p>

    <div class="kompozer__row" @keydown="obrabotatKlavishu">
      <GhInput
        v-model="tekst"
        type="textarea"
        autogrow
        :rows="2"
        :placeholder="t('aiChat.composer.placeholder')"
        :disabled="disabled"
      />

      <GhButton
        v-if="running"
        variant="danger"
        icon="stop"
        :label="t('aiChat.composer.stop')"
        @click="emit('stop')"
      />
      <GhButton
        v-else
        variant="primary"
        icon="paper-airplane"
        :label="t('aiChat.composer.send')"
        :disabled="disabled || tekst.trim() === ''"
        @click="otpravit"
      />
    </div>

    <div class="kompozer__hints">
      <span class="kompozer__hint">
        <GhKbd>Enter</GhKbd>
        {{ t("aiChat.composer.hint_send") }}
      </span>
      <span class="kompozer__hint">
        <GhKbd>Shift</GhKbd>
        <span aria-hidden="true">+</span>
        <GhKbd>Enter</GhKbd>
        {{ t("aiChat.composer.hint_newline") }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.kompozer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--borderColor-default);
  background-color: var(--bgColor-default);
}

.kompozer__paused {
  margin: 0;
  color: var(--fgColor-attention);
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-normal);
}

.kompozer__row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.kompozer__row :deep(.gh-input) {
  flex: 1 1 auto;
  min-width: 0;
}

.kompozer__hints {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-normal);
}

.kompozer__hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
