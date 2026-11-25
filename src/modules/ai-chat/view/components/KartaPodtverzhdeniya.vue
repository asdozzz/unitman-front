<script setup lang="ts">
/**
 * Карточка подтверждения действия агента.
 *
 * Пока она показана, ReAct-цикл приостановлен и HTTP-вызов инструмента не
 * выполняется. Подтверждение — единственный путь разрешить мутацию.
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { GhBox, GhButton, GhIcon, GhLabel } from "@/components/ui";
import type { PendingConfirmationState } from "@/modules/ai-chat/composables/useAiAgentChat";

const props = defineProps<{
  pending: PendingConfirmationState;
}>();

const emit = defineEmits<{
  (e: "confirm"): void;
  (e: "cancel"): void;
}>();

const { t } = useI18n();

const marshrut = computed<string>(
  () => `${props.pending.method.toUpperCase()} ${props.pending.path}`,
);

/** Безопасное форматирование аргументов, которые будут отправлены. */
const argumenty = computed<string>(() => {
  try {
    const stroka = JSON.stringify(props.pending.args, null, 2);

    return stroka === undefined ? props.pending.argsRaw : stroka;
  } catch {
    return props.pending.argsRaw;
  }
});
</script>

<template>
  <GhBox class="karta" padding="md">
    <template #header>
      <GhIcon name="alert" class="karta__icon" />
      <span>{{ t("aiChat.confirmation.title") }}</span>
      <GhLabel variant="attention" :label="t('aiChat.tools.confirm_required')" />
    </template>

    <p class="karta__paused">{{ t("aiChat.confirmation.paused") }}</p>
    <p class="karta__text">{{ t("aiChat.confirmation.description") }}</p>

    <dl class="karta__details">
      <dt>{{ t("aiChat.confirmation.tool") }}</dt>
      <dd class="karta__mono">{{ pending.toolName }}</dd>

      <dt>{{ t("aiChat.confirmation.action") }}</dt>
      <dd class="karta__mono">{{ marshrut }}</dd>

      <template v-if="pending.summary">
        <dt>{{ t("aiChat.confirmation.summary") }}</dt>
        <dd>{{ pending.summary }}</dd>
      </template>
    </dl>

    <p v-if="pending.description" class="karta__text">
      {{ pending.description }}
    </p>

    <p class="karta__label">{{ t("aiChat.confirmation.arguments") }}</p>
    <pre class="karta__code">{{ argumenty }}</pre>

    <template #footer>
      <GhButton
        variant="default"
        icon="x"
        :label="t('aiChat.confirmation.cancel')"
        @click="emit('cancel')"
      />
      <GhButton
        variant="primary"
        icon="check"
        :label="t('aiChat.confirmation.confirm')"
        @click="emit('confirm')"
      />
    </template>
  </GhBox>
</template>

<style scoped>
.karta {
  border-color: var(--borderColor-attention-muted);
}

.karta__icon {
  flex-shrink: 0;
  color: var(--fgColor-attention);
}

.karta__paused {
  margin: 0 0 8px;
  color: var(--fgColor-attention);
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-normal);
}

.karta__text {
  margin: 0 0 8px;
  color: var(--fgColor-default);
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-normal);
  overflow-wrap: anywhere;
}

.karta__details {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 4px 12px;
  margin: 0 0 8px;
  font-size: var(--fontSize-caption);
}

.karta__details dt {
  color: var(--fgColor-muted);
  font-weight: var(--fontWeight-semibold);
}

.karta__details dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.karta__mono {
  font-family: var(--fontStack-monospace);
}

.karta__label {
  margin: 0 0 4px;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-semibold);
}

.karta__code {
  max-height: 180px;
  margin: 0;
  padding: 6px 8px;
  overflow: auto;
  border: 1px solid var(--borderColor-muted);
  border-radius: var(--borderRadius-small);
  background-color: var(--bgColor-muted);
  color: var(--fgColor-default);
  font-family: var(--fontStack-monospace);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-normal);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
