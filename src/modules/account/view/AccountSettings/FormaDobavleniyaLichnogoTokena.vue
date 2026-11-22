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
import { useStorFormiLichnogoTokena } from "@/modules/account/store/StorFormiLichnogoTokena";
import { useStorLichnihTokenov } from "@/modules/account/store/StorLichnihTokenov";

const emit = defineEmits<{
  (e: "sozdan", payload: { nazvanie: string; token: string }): void;
}>();

const { t } = useI18n();

const formaStore = useStorFormiLichnogoTokena();
const storSpiska = useStorLichnihTokenov();

const {
  otkryta,
  repoId,
  token,
  nazvanie,
  loader,
  oshibkaOtBackenda,
  spisokRepo,
  loaderRepo,
  oshibkaRepo,
  mozhnoDobavit,
} = storeToRefs(formaStore);

const opciiRepo = computed<GhSelectOption[]>(() =>
  spisokRepo.value.map((repo) => ({ value: repo.id, label: repo.name })),
);

function obrabotatZakrytie(otkryto: boolean): void {
  if (otkryto || loader.value) {
    return;
  }

  formaStore.zakryt();
}

function zakryt(): void {
  if (loader.value) {
    return;
  }

  formaStore.zakryt();
}

/**
 * Добавление идёт через стор списка. Секрет пользователь вводит сам,
 * а бэкенд его не возвращает, поэтому значение запоминается до отправки
 * и передаётся родителю для одноразового показа.
 */
async function dobavit(): Promise<void> {
  if (!mozhnoDobavit.value) {
    return;
  }

  const sohranennoeNazvanie = formaStore.nazvanie.trim();
  const sohranenniyToken = formaStore.token.trim();

  const otvet = await storSpiska.dobavitToken();

  if (otvet?.status === "success") {
    emit("sozdan", {
      nazvanie: sohranennoeNazvanie,
      token: sohranenniyToken,
    });
  }
}
</script>

<template>
  <GhDialog
    :model-value="otkryta"
    :title="t('account.lichniy_tokeni.form.caption')"
    @update:model-value="obrabotatZakrytie"
  >
    <div class="forma-token__body">
      <GhBanner v-if="oshibkaOtBackenda" variant="danger">
        {{ oshibkaOtBackenda }}
      </GhBanner>

      <GhBanner v-if="oshibkaRepo" variant="danger">
        {{ oshibkaRepo }}
      </GhBanner>

      <GhFormField :label="t('account.lichniy_tokeni.fields.repo')">
        <template #default="{ controlId, ariaDescribedby, ariaInvalid }">
          <GhSelect
            :id="controlId"
            v-model="repoId"
            :options="opciiRepo"
            :aria-describedby="ariaDescribedby"
            :aria-invalid="ariaInvalid"
            :disabled="loaderRepo || loader"
          />
        </template>
      </GhFormField>

      <GhFormField :label="t('account.lichniy_tokeni.fields.nazvanie')">
        <template #default="{ controlId, ariaDescribedby, ariaInvalid }">
          <GhInput
            :id="controlId"
            v-model="nazvanie"
            :aria-describedby="ariaDescribedby"
            :aria-invalid="ariaInvalid"
            :disabled="loader"
            autocomplete="off"
          />
        </template>
      </GhFormField>

      <GhFormField :label="t('account.lichniy_tokeni.fields.token')">
        <template #default="{ controlId, ariaDescribedby, ariaInvalid }">
          <GhInput
            :id="controlId"
            v-model="token"
            type="password"
            autocomplete="off"
            :aria-describedby="ariaDescribedby"
            :aria-invalid="ariaInvalid"
            :disabled="loader"
          />
        </template>
      </GhFormField>
    </div>

    <template #footer>
      <GhButton
        variant="default"
        :label="t('account.lichniy_tokeni.form.buttons.close')"
        :disabled="loader"
        @click="zakryt"
      />
      <GhButton
        variant="primary"
        icon="plus"
        :label="t('account.lichniy_tokeni.form.buttons.ok')"
        :loading="loader"
        :disabled="!mozhnoDobavit"
        @click="dobavit"
      />
    </template>
  </GhDialog>
</template>

<style scoped>
.forma-token__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
