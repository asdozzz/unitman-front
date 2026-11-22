<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import {
    GhBanner,
    GhButton,
    GhDialog,
    GhFormField,
    GhInput,
    GhSelect,
} from "@/components/ui";
import type { GhSelectOption } from "@/components/ui";
import { useStorFormiSozdaniyaSessiiUnita } from "@/modules/opencode/store/StorFormiSozdaniyaSessiiUnita";

/**
 * Диалог создания unit-сессии.
 *
 * Юнит фиксирован контекстом открытия: форма не даёт выбрать другой или
 * несколько юнитов. Сессия всегда создаётся ровно с одним юнитом.
 */
const emit = defineEmits<{ sozdana: [id: string] }>();

const formaStore = useStorFormiSozdaniyaSessiiUnita();
const {
    otkrita,
    unitLabel,
    unitDescription,
    title,
    credentialId,
    loader,
    oshibkaOtBackenda,
    rekvizity,
    mozhnoSohranit,
} = storeToRefs(formaStore);

const optsRekvizitov = computed<GhSelectOption[]>(() =>
    rekvizity.value.map((rekvizit) => ({
        value: rekvizit.id,
        label: rekvizit.name,
    })),
);

async function sozdat() {
    const id = await formaStore.sozdatIDobavitVSpiske();

    if (id !== null) {
        emit("sozdana", id);
    }
}
</script>

<template>
  <GhDialog
      :model-value="otkrita"
      :title="$t('opencode.unit_sessions.form.caption')"
      width="520px"
      persistent
      @update:model-value="formaStore.zakrit()"
  >
    <div class="opencode-form">
      <GhFormField :label="$t('opencode.unit_sessions.form.fields.unit')">
        <div class="opencode-form__fixed-unit">
          <span class="opencode-form__fixed-unit-name">{{ unitLabel }}</span>
          <span class="opencode-form__fixed-unit-description">{{ unitDescription }}</span>
        </div>
      </GhFormField>

      <GhFormField
          :label="$t('opencode.unit_sessions.form.fields.title')"
          :caption="$t('opencode.unit_sessions.form.hint_title')"
      >
        <GhInput v-model="title" :maxlength="256" />
      </GhFormField>

      <GhFormField :label="$t('opencode.unit_sessions.form.fields.credential')">
        <GhSelect v-model="credentialId" :options="optsRekvizitov" />
      </GhFormField>

      <GhBanner v-if="oshibkaOtBackenda" variant="danger">
        {{ oshibkaOtBackenda }}
      </GhBanner>
    </div>

    <template #footer>
      <GhButton
          :label="$t('common.buttons.cancel')"
          :disabled="loader"
          @click="formaStore.zakrit()"
      />
      <GhButton
          variant="primary"
          :label="$t('opencode.unit_sessions.form.buttons.ok')"
          :loading="loader"
          :disabled="!mozhnoSohranit"
          @click="sozdat()"
      />
    </template>
  </GhDialog>
</template>

<style scoped>
.opencode-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.opencode-form__fixed-unit {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-medium);
  background-color: var(--bgColor-muted);
}

.opencode-form__fixed-unit-name {
  font-weight: 600;
}

.opencode-form__fixed-unit-description {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}
</style>
