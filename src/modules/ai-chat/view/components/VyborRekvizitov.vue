<script setup lang="ts">
/**
 * Селекторы реквизитов OpenCode и модели.
 *
 * Данные приходят из существующего стора реквизитов аккаунта; компонент
 * только отображает их и сообщает о выборе, не выполняя собственных запросов.
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { GhSelect } from "@/components/ui";
import type { GhSelectOption } from "@/components/ui";
import type { RekvizityOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/model/OpenCodeRekvizity";

const props = defineProps<{
  credentials: RekvizityOpenCode[];
  selectedId: string | null;
  selectedModel: string | null;
  loading: boolean;
  disabled: boolean;
}>();

const emit = defineEmits<{
  (e: "update:selectedId", value: string | null): void;
  (e: "update:selectedModel", value: string | null): void;
}>();

const { t } = useI18n();

const tekushieRekvizity = computed<RekvizityOpenCode | null>(
  () => props.credentials.find((rekvizity) => rekvizity.id === props.selectedId) ?? null,
);

const opciiRekvizitov = computed<GhSelectOption[]>(() =>
  props.credentials.map((rekvizity) => ({
    value: rekvizity.id,
    label: rekvizity.name,
    description: `${rekvizity.provider} · ${rekvizity.apiKeyHint}`,
  })),
);

const opciiModelei = computed<GhSelectOption[]>(() => {
  const rekvizity = tekushieRekvizity.value;

  if (rekvizity === null) {
    return [];
  }

  return rekvizity.models.map((model) => ({
    value: model,
    label: model,
    description:
      model === rekvizity.defaultModel
        ? t("aiChat.credentials.default_marker")
        : undefined,
  }));
});

function izmenitRekvizity(value: string | number | null | Array<string | number>): void {
  emit("update:selectedId", typeof value === "string" ? value : null);
}

function izmenitModel(value: string | number | null | Array<string | number>): void {
  emit("update:selectedModel", typeof value === "string" ? value : null);
}
</script>

<template>
  <div class="vybor">
    <GhSelect
      class="vybor__field"
      :label="t('aiChat.credentials.label')"
      :model-value="selectedId"
      :options="opciiRekvizitov"
      :loading="loading"
      :disabled="disabled"
      :placeholder="t('aiChat.credentials.placeholder')"
      @update:model-value="izmenitRekvizity"
    />

    <GhSelect
      class="vybor__field"
      :label="t('aiChat.credentials.model_label')"
      :model-value="selectedModel"
      :options="opciiModelei"
      :disabled="disabled || opciiModelei.length === 0"
      :placeholder="t('aiChat.credentials.model_placeholder')"
      use-input
      hide-selected
      @update:model-value="izmenitModel"
    />
  </div>
</template>

<style scoped>
.vybor {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px;
  min-width: 0;
}

.vybor__field {
  width: 220px;
  max-width: 100%;
}

@media (max-width: 640px) {
  .vybor__field {
    width: 100%;
  }
}
</style>
