<script setup lang="ts">
/**
 * Текстовая запись ленты чата: сообщение пользователя/ассистента, ошибка
 * провайдера или служебное уведомление.
 *
 * Любой текст модели и данные бэкенда выводятся только интерполяцией —
 * `v-html` здесь принципиально не используется.
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { GhBanner } from "@/components/ui";
import type { GhBannerVariant } from "@/components/ui";
import type {
  AiChatEntry,
  AiChatToolInvocationEntry,
} from "@/modules/ai-chat/composables/useAiAgentChat";

/** Все записи ленты, кроме вызовов инструментов (для них своя строка). */
type TekstovayaZapis = Exclude<AiChatEntry, AiChatToolInvocationEntry>;

const props = defineProps<{
  entry: TekstovayaZapis;
}>();

const { t, te } = useI18n();

/** Текст записи: для ошибок переводится стабильный ключ бэкенда. */
const tekst = computed<string>(() => {
  if (props.entry.kind === "user" || props.entry.kind === "assistant") {
    return props.entry.text;
  }

  if (props.entry.kind === "notice") {
    return t(`aiChat.notice.${props.entry.noticeKey}`);
  }

  const klyuch = props.entry.errorKey;

  return klyuch !== null && te(klyuch)
    ? t(klyuch)
    : t("ai.chat.unexpected_error");
});

/** Вариант баннера для ошибок и уведомлений. */
const variantBannera = computed<GhBannerVariant>(() => {
  if (props.entry.kind === "error") {
    return "danger";
  }

  if (props.entry.kind === "notice" && props.entry.noticeKey === "step_limit_reached") {
    return "attention";
  }

  return "accent";
});
</script>

<template>
  <div class="soobshenie" :class="`soobshenie--${entry.kind}`">
    <template v-if="entry.kind === 'user'">
      <span class="soobshenie__author">{{ t("aiChat.roles.user") }}</span>
      <div class="soobshenie__bubble soobshenie__bubble--user">
        {{ entry.text }}
      </div>
    </template>

    <template v-else-if="entry.kind === 'assistant'">
      <span class="soobshenie__author">{{ t("aiChat.roles.assistant") }}</span>
      <div class="soobshenie__bubble">
        {{ entry.text }}
      </div>
    </template>

    <GhBanner
      v-else-if="entry.kind === 'error'"
      :variant="variantBannera"
      :title="t('aiChat.errors.title')"
    >
      <p class="soobshenie__banner-text">{{ tekst }}</p>
      <p v-if="entry.status !== 0" class="soobshenie__status">
        {{ t("aiChat.errors.status", { status: entry.status }) }}
      </p>
      <p v-if="entry.details" class="soobshenie__details">
        {{ entry.details }}
      </p>
    </GhBanner>

    <GhBanner
      v-else
      :variant="variantBannera"
      :title="t('aiChat.notice.title')"
    >
      {{ tekst }}
    </GhBanner>
  </div>
</template>

<style scoped>
.soobshenie {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 100%;
}

.soobshenie--user {
  align-items: flex-end;
}

.soobshenie--assistant {
  align-items: flex-start;
}

.soobshenie__author {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
}

.soobshenie__bubble {
  max-width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-medium);
  background-color: var(--bgColor-default);
  color: var(--fgColor-default);
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-normal);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.soobshenie__bubble--user {
  border-color: var(--borderColor-accent-muted);
  background-color: var(--bgColor-accent-muted);
}

.soobshenie__banner-text {
  margin: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.soobshenie__status {
  margin: 4px 0 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.soobshenie__details {
  margin: 4px 0 0;
  color: var(--fgColor-muted);
  font-family: var(--fontStack-monospace);
  font-size: var(--fontSize-caption);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
</style>
