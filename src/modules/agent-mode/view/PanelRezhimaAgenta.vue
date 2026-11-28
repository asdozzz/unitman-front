<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { GhSelect } from "@/components/ui";
import type { GhSelectOption } from "@/components/ui";
import { modeliRekvizitov } from "@/modules/opencode/model/ModeliOpenCode";
import type { RekvizityOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/model/OpenCodeRekvizity";
import type { AgentMode } from "@/modules/agent-mode/model/AgentMode";

/**
 * Компактный блок под полем промпта: мод агента, реквизиты и модель.
 *
 * Компонент не знает, как загружать моды и реквизиты. Смена мода только
 * сообщает родителю id; подстановку реквизитов/модели выполняет стор чата.
 */
const props = withDefaults(defineProps<{
    modes: AgentMode[];
    modeId: string;
    credentials: RekvizityOpenCode[];
    credentialId: string;
    model: string;
    disabled?: boolean;
    loading?: boolean;
    error?: string | null;
}>(), {
    disabled: false,
    loading: false,
    error: null,
});

const emit = defineEmits<{
    "update:modeId": [value: string];
    "update:credentialId": [value: string];
    "update:model": [value: string];
}>();

const { t } = useI18n();

const optsRezhimov = computed<GhSelectOption[]>(() =>
    props.modes.map((mode) => ({
        value: mode.id,
        label: mode.name,
        description: mode.description,
    })),
);

const optsRekvizitov = computed<GhSelectOption[]>(() =>
    props.credentials.map((credential) => ({
        value: credential.id,
        label: credential.name,
    })),
);

const vybrannayaRekvizity = computed<RekvizityOpenCode | null>(
    () => props.credentials.find((item) => item.id === props.credentialId) ?? null,
);

const optsModelei = computed<GhSelectOption[]>(() =>
    modeliRekvizitov(vybrannayaRekvizity.value).map((model) => ({
        value: model,
        label: model,
    })),
);

const vybrannyyRezhim = computed<AgentMode | null>(
    () => props.modes.find((item) => item.id === props.modeId) ?? null,
);

const neNastroen = computed<boolean>(
    () => vybrannyyRezhim.value !== null
        && (vybrannyyRezhim.value.credentialId === null || vybrannyyRezhim.value.model === null),
);

function izmenitRezhim(value: string | number | null): void {
    emit("update:modeId", value === null ? "" : String(value));
}

function izmenitRekvizity(value: string | number | null): void {
    emit("update:credentialId", value === null ? "" : String(value));
}

function izmenitModel(value: string | number | null): void {
    emit("update:model", value === null ? "" : String(value));
}
</script>

<template>
  <div class="panel-rezhima">
    <GhSelect
        :model-value="modeId"
        :options="optsRezhimov"
        size="sm"
        :disable="disabled || loading"
        :loading="loading"
        :aria-label="t('opencode.agent_modes.mode')"
        :placeholder="t('opencode.agent_modes.mode_placeholder')"
        @update:model-value="izmenitRezhim"
    />
    <GhSelect
        :model-value="credentialId"
        :options="optsRekvizitov"
        size="sm"
        :disable="disabled || loading || credentials.length === 0"
        :aria-label="t('opencode.agent_modes.credential')"
        :placeholder="t('opencode.agent_modes.credential_placeholder')"
        @update:model-value="izmenitRekvizity"
    />
    <GhSelect
        :model-value="model"
        :options="optsModelei"
        size="sm"
        use-input
        hide-selected
        fill-input
        :disable="disabled || loading || optsModelei.length === 0"
        :aria-label="t('opencode.agent_modes.model')"
        :placeholder="t('opencode.agent_modes.model_placeholder')"
        @update:model-value="izmenitModel"
    />
    <div v-if="error" class="panel-rezhima__hint panel-rezhima__hint--error">
      {{ error }}
    </div>
    <div v-else-if="neNastroen" class="panel-rezhima__hint">
      {{ t('opencode.agent_modes.not_configured') }}
    </div>
  </div>
</template>

<style scoped>
.panel-rezhima {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.panel-rezhima :deep(.gh-select) {
  flex: 1 1 160px;
  min-width: 140px;
}

.panel-rezhima__hint {
  flex: 1 1 100%;
  color: var(--fgColor-muted);
  font-size: 12px;
}

.panel-rezhima__hint--error {
  color: var(--fgColor-danger);
}
</style>
