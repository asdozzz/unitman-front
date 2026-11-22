<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import {
  GhBanner,
  GhBox,
  GhButton,
  GhFormField,
  GhInput,
} from "@/components/ui";
import {
  useFormaIzmeneniyaNickname,
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaIzmeneniyaNikaStore";

const { t } = useI18n();

const formaIzmeneniyaNickname = useFormaIzmeneniyaNickname();
const { form, oshibkaOtBackenda, loader } = storeToRefs(formaIzmeneniyaNickname);

const props = defineProps<{
  id: string;
}>();

formaIzmeneniyaNickname.otkritFormu(props.id, "");

/** Успешно сохранено — показываем inline-баннер. */
const uspeh = ref<boolean>(false);

function izmenit(value: string | number | null): void {
  form.value.newNickname = value === null ? "" : String(value);
  uspeh.value = false;
}

async function otpravitFormu(): Promise<void> {
  const response = await formaIzmeneniyaNickname.otpravitFormu();

  if (response.status === "success") {
    uspeh.value = true;
    formaIzmeneniyaNickname.zakritFormu();
  }
}
</script>

<template>
  <GhBox class="account-form">
    <template #header>{{ t("account.form_change_nickname.caption") }}</template>

    <div class="account-form__body">
      <GhBanner
        v-if="uspeh"
        variant="success"
        :title="t('account.common.saved')"
      />

      <GhFormField
        :label="t('account.form_change_nickname.fields.labels.new_nickname')"
        control-id="account-nickname"
      >
        <template #default="{ controlId, ariaInvalid }">
          <GhInput
            :id="controlId"
            :model-value="form.newNickname"
            type="text"
            autocomplete="nickname"
            :aria-invalid="ariaInvalid"
            @update:model-value="izmenit"
          />
        </template>
      </GhFormField>

      <GhBanner
        v-if="oshibkaOtBackenda"
        variant="danger"
        :title="t('account.common.error_title')"
      >
        {{ oshibkaOtBackenda }}
      </GhBanner>
    </div>

    <template #footer>
      <GhButton
        variant="primary"
        icon="check"
        :loading="loader"
        :label="t('account.form_change_nickname.buttons.ok')"
        @click="otpravitFormu"
      />
    </template>
  </GhBox>
</template>

<style scoped>
.account-form__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
