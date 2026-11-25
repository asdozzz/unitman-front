<script setup lang="ts">
/**
 * Боковая панель активных инструментов сессии.
 *
 * Список приходит исключительно из реестра (`activeTools`): никаких
 * захардкоженных эндпоинтов или ролей в компоненте нет.
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  GhBox,
  GhCounter,
  GhEmptyState,
  GhIcon,
  GhLabel,
  GhProgress,
} from "@/components/ui";
import type { GhProgressLevel } from "@/components/ui";
import type { OpenApiToolMeta } from "@/modules/ai-chat/model/types";

const props = defineProps<{
  tools: OpenApiToolMeta[];
  stepCount: number;
  maxSteps: number;
}>();

const { t } = useI18n();

const procentShaga = computed<number>(() => {
  if (props.maxSteps <= 0) {
    return 0;
  }

  return Math.min(100, (props.stepCount / props.maxSteps) * 100);
});

const urovenShaga = computed<GhProgressLevel>(() =>
  props.stepCount >= props.maxSteps ? "warning" : "neutral",
);

const podpisShaga = computed<string>(() =>
  t("aiChat.steps.label", {
    current: props.stepCount,
    max: props.maxSteps,
  }),
);
</script>

<template>
  <GhBox class="panel" padding="none">
    <template #header>
      <GhIcon name="tools" class="panel__icon" />
      <span>{{ t("aiChat.tools.title") }}</span>
      <GhCounter :value="tools.length" />
    </template>

    <div class="panel__body">
      <GhProgress
        :value="procentShaga"
        :level="urovenShaga"
        :label="podpisShaga"
        :show-value="false"
        size="sm"
      />

      <GhEmptyState
        v-if="tools.length === 0"
        icon="search"
        :title="t('aiChat.tools.empty_title')"
        :description="t('aiChat.tools.empty')"
      />

      <ul v-else class="panel__list">
        <li v-for="tool in tools" :key="tool.toolName" class="panel__item">
          <div class="panel__item-head">
            <span class="panel__name">{{ tool.toolName }}</span>
            <GhLabel
              v-if="tool.confirm"
              variant="attention"
              :label="t('aiChat.tools.confirm_required')"
            />
          </div>

          <p v-if="tool.summary" class="panel__summary">{{ tool.summary }}</p>

          <span class="panel__route">
            {{ tool.method.toUpperCase() }} {{ tool.path }}
          </span>
        </li>
      </ul>
    </div>
  </GhBox>
</template>

<style scoped>
.panel {
  min-height: 100%;
}

.panel__icon {
  flex-shrink: 0;
  color: var(--fgColor-muted);
}

.panel__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.panel__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.panel__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-medium);
  background-color: var(--bgColor-muted);
}

.panel__item-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.panel__name {
  color: var(--fgColor-default);
  font-family: var(--fontStack-monospace);
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-semibold);
  overflow-wrap: anywhere;
}

.panel__summary {
  margin: 0;
  color: var(--fgColor-default);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-normal);
}

.panel__route {
  color: var(--fgColor-muted);
  font-family: var(--fontStack-monospace);
  font-size: var(--fontSize-caption);
  overflow-wrap: anywhere;
}
</style>
