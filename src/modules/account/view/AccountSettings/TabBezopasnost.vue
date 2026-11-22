<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import {
  GhBanner,
  GhBox,
  GhButton,
  GhFormField,
  GhInput,
} from "@/components/ui";
import { storNastroekPolzovatelya } from "@/modules/account/store/StorNastroekPolzovatelya";

const { t } = useI18n();

const store = storNastroekPolzovatelya();
const { formPassword, oshibkaOtBackenda, loader } = storeToRefs(store);

const pokazatParol = ref<boolean>(false);
const parolIzmenen = ref<boolean>(false);
const oshibkaSohraneniya = ref<boolean>(false);

const MINIMALNAYA_DLINA = 8;

/** Валидация: минимум символов, как указано в подсказке. */
const parolValidniy = computed<boolean>(
  () => formPassword.value.newPassword.trim().length >= MINIMALNAYA_DLINA,
);

/** В форме есть несохранённые изменения. */
const estIzmeneniya = computed<boolean>(
  () => formPassword.value.newPassword.trim() !== "",
);

const mozhnoSohranit = computed<boolean>(
  () => estIzmeneniya.value && parolValidniy.value && !loader.value,
);

const tekstOshibki = computed<string>(() => {
  if (oshibkaOtBackenda.value) {
    return oshibkaOtBackenda.value;
  }

  return oshibkaSohraneniya.value ? t("settings.save_error") : "";
});

function obnovitParol(znachenie: string | number | null): void {
  formPassword.value.newPassword = znachenie === null ? "" : String(znachenie);
  parolIzmenen.value = false;
  oshibkaSohraneniya.value = false;
}

function pereklyuchitVidimost(): void {
  pokazatParol.value = !pokazatParol.value;
}

/** Смена пароля через существующий use-case стора. */
async function izmenitParol(): Promise<void> {
  if (!mozhnoSohranit.value) {
    return;
  }

  oshibkaSohraneniya.value = false;

  const otvet = await store.izmenitParol();

  if (otvet?.status === "success") {
    parolIzmenen.value = true;
    pokazatParol.value = false;
    return;
  }

  parolIzmenen.value = false;
  oshibkaSohraneniya.value = true;
}
</script>

<template>
  <GhBox>
    <template #header>
      <span>{{ t("settings.security.title") }}</span>
    </template>

    <div class="tab-parol__body">
      <GhBanner
        v-if="parolIzmenen"
        variant="attention"
        :title="t('settings.security.saved')"
        dismissible
        @dismiss="parolIzmenen = false"
      >
        {{ t("settings.security.use_new_password") }}
      </GhBanner>

      <GhBanner
        v-if="tekstOshibki"
        variant="danger"
        :title="t('settings.save_error')"
        dismissible
        @dismiss="oshibkaSohraneniya = false"
      >
        {{ tekstOshibki }}
      </GhBanner>

      <GhFormField
        :label="t('settings.security.new_password')"
        :caption="t('settings.security.password_hint')"
      >
        <template #default="{ controlId, ariaDescribedby, ariaInvalid }">
          <GhInput
            :id="controlId"
            :model-value="formPassword.newPassword"
            :type="pokazatParol ? 'text' : 'password'"
            autocomplete="new-password"
            :aria-describedby="ariaDescribedby"
            :aria-invalid="ariaInvalid"
            :disabled="loader"
            @update:model-value="obnovitParol"
          >
            <template #append>
              <GhButton
                variant="invisible"
                size="sm"
                :icon="pokazatParol ? 'eye-closed' : 'eye'"
                :aria-label="
                  pokazatParol
                    ? t('settings.security.hide_password')
                    : t('settings.security.show_password')
                "
                v-bind="{ 'aria-pressed': pokazatParol }"
                @click="pereklyuchitVidimost"
              />
            </template>
          </GhInput>
        </template>
      </GhFormField>
    </div>

    <template #footer>
      <GhButton
        variant="primary"
        icon="shield"
        :label="t('common.buttons.save')"
        :loading="loader"
        :disabled="!mozhnoSohranit"
        @click="izmenitParol"
      />
    </template>
  </GhBox>
</template>

<style scoped>
.tab-parol__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
