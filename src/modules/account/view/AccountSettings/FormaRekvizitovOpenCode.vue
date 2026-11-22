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
} from "@/components/ui";
import { useFormaRekvizitovOpenCodeStore } from "@/modules/account/store/SpisokRekvizitovOpenCode/FormaRekvizitovOpenCodeStore";
import { useStorSpiskaRekvizitovOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/StorSpiskaRekvizitovOpenCode";

const { t } = useI18n();

const formaStore = useFormaRekvizitovOpenCodeStore();
const storSpiska = useStorSpiskaRekvizitovOpenCode();
const { forma, loader, oshibkaOtBackenda, redaktiruemiId, maskaTekushegoKlyucha, etoSozdanie } =
  storeToRefs(formaStore);

const zagolovok = computed<string>(() =>
  etoSozdanie.value
    ? t("opencode.rekvizity.form.caption_create")
    : t("opencode.rekvizity.form.caption_edit"),
);

/** При изменении ключ не приходит целиком — показывается только маска. */
const podskazkaKlyucha = computed<string>(() => {
  if (etoSozdanie.value) {
    return t("opencode.rekvizity.form.fields.api_key_new");
  }

  return t("opencode.rekvizity.form.fields.api_key_keep", {
    hint: maskaTekushegoKlyucha.value ?? "",
  });
});

const mozhnoSohranit = computed<boolean>(() => {
  if (loader.value) {
    return false;
  }

  const estImya = forma.value.name.trim() !== "";
  const estUrl = forma.value.url.trim() !== "";
  const estModel = forma.value.model.trim() !== "";
  const estKlyuch = forma.value.apiKey.trim() !== "";

  // Ключ обязателен только при создании: при изменении пустое поле — «не менять».
  return estImya && estUrl && estModel && (estKlyuch || !etoSozdanie.value);
});

function obrabotatZakrytie(otkryto: boolean): void {
  if (otkryto || loader.value) {
    return;
  }

  formaStore.zakrit();
}

function zakrit(): void {
  if (loader.value) {
    return;
  }

  formaStore.zakrit();
}

/** Сохранение идёт через стор списка: он же перезапрашивает список после успеха. */
async function sohranit(): Promise<void> {
  if (!mozhnoSohranit.value) {
    return;
  }

  await storSpiska.sohranitRekvizity();
}
</script>

<template>
  <GhDialog
    :model-value="redaktiruemiId !== null"
    :title="zagolovok"
    @update:model-value="obrabotatZakrytie"
  >
    <div class="forma-opencode__body">
      <GhBanner v-if="oshibkaOtBackenda" variant="danger">
        {{ oshibkaOtBackenda }}
      </GhBanner>

      <GhFormField :label="t('opencode.rekvizity.form.fields.name')">
        <template #default="{ controlId, ariaDescribedby, ariaInvalid }">
          <GhInput
            :id="controlId"
            v-model="forma.name"
            :aria-describedby="ariaDescribedby"
            :aria-invalid="ariaInvalid"
            :disabled="loader"
            autocomplete="off"
          />
        </template>
      </GhFormField>

      <GhFormField
        :label="t('opencode.rekvizity.form.fields.url')"
        caption="https://api.opencode.ai"
      >
        <template #default="{ controlId, ariaDescribedby, ariaInvalid }">
          <GhInput
            :id="controlId"
            v-model="forma.url"
            type="url"
            :aria-describedby="ariaDescribedby"
            :aria-invalid="ariaInvalid"
            :disabled="loader"
            autocomplete="off"
          />
        </template>
      </GhFormField>

      <GhFormField
        :label="t('opencode.rekvizity.form.fields.model')"
        caption="claude-sonnet-4"
      >
        <template #default="{ controlId, ariaDescribedby, ariaInvalid }">
          <GhInput
            :id="controlId"
            v-model="forma.model"
            :aria-describedby="ariaDescribedby"
            :aria-invalid="ariaInvalid"
            :disabled="loader"
            autocomplete="off"
          />
        </template>
      </GhFormField>

      <GhFormField
        :label="t('opencode.rekvizity.form.fields.api_key')"
        :caption="podskazkaKlyucha"
      >
        <template #default="{ controlId, ariaDescribedby, ariaInvalid }">
          <GhInput
            :id="controlId"
            v-model="forma.apiKey"
            type="password"
            :aria-describedby="ariaDescribedby"
            :aria-invalid="ariaInvalid"
            :disabled="loader"
            autocomplete="off"
          />
        </template>
      </GhFormField>
    </div>

    <template #footer>
      <GhButton
        variant="default"
        :label="t('opencode.rekvizity.form.buttons.close')"
        :disabled="loader"
        @click="zakrit"
      />
      <GhButton
        variant="primary"
        icon="check"
        :label="t('opencode.rekvizity.form.buttons.ok')"
        :loading="loader"
        :disabled="!mozhnoSohranit"
        @click="sohranit"
      />
    </template>
  </GhDialog>
</template>

<style scoped>
.forma-opencode__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
