<script setup lang="ts">
/**
 * Строка вызова инструмента в ленте чата.
 *
 * Показывает имя инструмента, `METHOD path`, статус и обрезанный результат.
 * Аргументы и полный результат доступны в раскрывающемся блоке; всё
 * выводится как текст, без `v-html`.
 */
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { GhBanner, GhButton, GhIcon, GhLabel } from "@/components/ui";
import type { GhLabelVariant } from "@/components/ui";
import type {
  AiChatToolCallStatus,
  AiChatToolInvocationEntry,
} from "@/modules/ai-chat/composables/useAiAgentChat";

const props = defineProps<{
  entry: AiChatToolInvocationEntry;
}>();

const { t } = useI18n();

const raskryto = ref<boolean>(false);

/** Цвет бейджа статуса. */
const variantStatus = computed<GhLabelVariant>(() => {
  const varianty: Record<AiChatToolCallStatus, GhLabelVariant> = {
    pending: "neutral",
    awaiting_confirmation: "attention",
    running: "accent",
    success: "success",
    error: "danger",
    cancelled: "neutral",
  };

  return varianty[props.entry.status];
});

const podpisStatusa = computed<string>(
  () => t(`aiChat.tools.status.${props.entry.status}`),
);

/** Маршрут вызова, если инструмент сопоставлен операции OpenAPI. */
const marshrut = computed<string | null>(() =>
  props.entry.method !== null && props.entry.path !== null
    ? `${props.entry.method.toUpperCase()} ${props.entry.path}`
    : null,
);

/** Безопасное форматирование аргументов для показа. */
const argumenty = computed<string>(() => {
  const znachenie = props.entry.args;

  if (Object.keys(znachenie).length === 0) {
    return props.entry.argsRaw;
  }

  try {
    return JSON.stringify(znachenie, null, 2);
  } catch {
    return props.entry.argsRaw;
  }
});

const estDetali = computed<boolean>(
  () =>
    argumenty.value !== "" ||
    props.entry.resultSummary !== null ||
    props.entry.resultError !== null,
);

const podpisRaskritiya = computed<string>(() =>
  t(raskryto.value ? "aiChat.tools.collapse" : "aiChat.tools.expand"),
);

function pereklyuchitDetali(): void {
  raskryto.value = !raskryto.value;
}
</script>

<template>
  <div class="instrument">
    <div class="instrument__head">
      <GhIcon name="tools" class="instrument__icon" />
      <span class="instrument__name">{{ entry.toolName }}</span>
      <GhLabel :variant="variantStatus" :label="podpisStatusa" />
      <span v-if="marshrut" class="instrument__route">{{ marshrut }}</span>
      <GhButton
        v-if="estDetali"
        variant="invisible"
        size="sm"
        :icon="raskryto ? 'chevron-up' : 'chevron-down'"
        :aria-label="podpisRaskritiya"
        :aria-expanded="raskryto"
        @click="pereklyuchitDetali"
      />
    </div>

    <p v-if="entry.summary" class="instrument__summary">{{ entry.summary }}</p>

    <pre v-if="entry.resultSummary" class="instrument__preview">{{ entry.resultSummary }}</pre>

    <p v-if="entry.truncated" class="instrument__truncated">
      {{ t("aiChat.tools.truncated") }}
    </p>

    <GhBanner
      v-if="entry.status === 'error' && entry.resultError"
      variant="danger"
      :title="t('aiChat.tools.error')"
    >
      {{ entry.resultError }}
    </GhBanner>

    <div v-if="raskryto" class="instrument__details">
      <template v-if="argumenty !== ''">
        <p class="instrument__label">{{ t("aiChat.tools.arguments") }}</p>
        <pre class="instrument__code">{{ argumenty }}</pre>
      </template>

      <template v-if="entry.resultSummary !== null">
        <p class="instrument__label">{{ t("aiChat.tools.result") }}</p>
        <pre class="instrument__code">{{ entry.resultSummary }}</pre>
      </template>

      <template v-if="entry.resultError !== null">
        <p class="instrument__label">{{ t("aiChat.tools.error") }}</p>
        <pre class="instrument__code">{{ entry.resultError }}</pre>
      </template>
    </div>
  </div>
</template>

<style scoped>
.instrument {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-medium);
  background-color: var(--bgColor-muted);
  font-size: var(--fontSize-body);
}

.instrument__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.instrument__icon {
  flex-shrink: 0;
  color: var(--fgColor-muted);
}

.instrument__name {
  color: var(--fgColor-default);
  font-family: var(--fontStack-monospace);
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-semibold);
}

.instrument__route {
  color: var(--fgColor-muted);
  font-family: var(--fontStack-monospace);
  font-size: var(--fontSize-caption);
  overflow-wrap: anywhere;
}

.instrument__summary {
  margin: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-normal);
}

.instrument__preview {
  max-height: 120px;
  margin: 0;
  padding: 6px 8px;
  overflow: auto;
  border: 1px solid var(--borderColor-muted);
  border-radius: var(--borderRadius-small);
  background-color: var(--bgColor-default);
  color: var(--fgColor-default);
  font-family: var(--fontStack-monospace);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-normal);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.instrument__truncated {
  margin: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.instrument__details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.instrument__label {
  margin: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-semibold);
}

.instrument__code {
  max-height: 220px;
  margin: 0;
  padding: 6px 8px;
  overflow: auto;
  border: 1px solid var(--borderColor-muted);
  border-radius: var(--borderRadius-small);
  background-color: var(--bgColor-default);
  color: var(--fgColor-default);
  font-family: var(--fontStack-monospace);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-normal);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
