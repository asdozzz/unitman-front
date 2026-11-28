<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
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
import { useEffektivnieNavyki } from "@/modules/skill/composables/useEffektivnieNavyki";
import BlokNavykovSozdaniya from "@/modules/skill/view/BlokNavykovSozdaniya.vue";

/**
 * Диалог создания unit-сессии.
 *
 * Юнит фиксирован контекстом открытия: форма не даёт выбрать другой или
 * несколько юнитов. Сессия всегда создаётся ровно с одним юнитом.
 */
const emit = defineEmits<{ sozdana: [id: string] }>();

const { t } = useI18n();

const formaStore = useStorFormiSozdaniyaSessiiUnita();
const {
    otkrita,
    unitProjectId,
    unitLabel,
    unitDescription,
    title,
    credentialId,
    model,
    dostupnieModeli,
    modelPoUmolchaniyu,
    loader,
    oshibkaOtBackenda,
    rekvizity,
    mozhnoSohranit,
} = storeToRefs(formaStore);

/** Проект юнита известен заранее: показываем его навыки до старта сессии. */
const projectIdsDlyaNavykov = computed<string[]>(() =>
    unitProjectId.value === "" ? [] : [unitProjectId.value],
);

const {
    navyki,
    loading: navykiLoader,
    error: navykiOshibka,
    zagruzit: zagruzitNavyki,
} = useEffektivnieNavyki(projectIdsDlyaNavykov, { enabled: otkrita });

const optsRekvizitov = computed<GhSelectOption[]>(() =>
    rekvizity.value.map((rekvizit) => ({
        value: rekvizit.id,
        label: rekvizit.name,
    })),
);

/** Опции моделей выбранных реквизитов с подписью дефолтной. */
const optsModelei = computed<GhSelectOption[]>(() => {
    const marker = t("opencode.rekvizity.default_marker");
    const poUmolchaniyu = modelPoUmolchaniyu.value;

    return dostupnieModeli.value.map((nazvanie) => ({
        value: nazvanie,
        label: nazvanie === poUmolchaniyu ? `${nazvanie} (${marker})` : nazvanie,
    }));
});

/** Смена реквизитов: стор сбрасывает модель на их дефолт. */
function izmenitRekvizity(value: string | number | null): void {
    formaStore.ustanovitRekvizity(value === null ? "" : String(value));
}

/** Выбор модели для создаваемой сессии. */
function izmenitModel(value: string | number | null): void {
    formaStore.ustanovitModel(value === null ? null : String(value));
}

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
        <GhSelect
            :model-value="credentialId"
            :options="optsRekvizitov"
            @update:model-value="izmenitRekvizity"
        />
      </GhFormField>

      <GhFormField :label="$t('opencode.rekvizity.fields.default_model')">
        <GhSelect
            :model-value="model"
            :options="optsModelei"
            use-input
            hide-selected
            fill-input
            :placeholder="$t('opencode.rekvizity.fields.default_model')"
            @update:model-value="izmenitModel"
        />
      </GhFormField>

      <BlokNavykovSozdaniya
          :navyki="navyki"
          :loading="navykiLoader"
          :error="navykiOshibka"
          @retry="zagruzitNavyki"
      />

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
