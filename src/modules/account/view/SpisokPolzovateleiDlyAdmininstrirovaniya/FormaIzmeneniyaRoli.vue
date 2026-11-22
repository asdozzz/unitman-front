<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import {
  GhBanner,
  GhBox,
  GhButton,
  GhFormField,
  GhSelect,
} from "@/components/ui";
import {
  useFormaIzmeneniyaRoli,
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaIzmeneniyaRoliStore";

const { t } = useI18n();

const formaIzmeneniyaRoli = useFormaIzmeneniyaRoli();
const { form, oshibkaOtBackenda, loader, roles } = storeToRefs(formaIzmeneniyaRoli);

const props = defineProps<{
  id: string;
}>();

formaIzmeneniyaRoli.otkritFormu(props.id, "");

/** Успешно сохранено — показываем inline-баннер. */
const uspeh = ref<boolean>(false);

function izmenit(value: string | number | null): void {
  form.value.newRole = value === null ? "" : String(value);
  uspeh.value = false;
}

async function otpravitFormu(): Promise<void> {
  const response = await formaIzmeneniyaRoli.otpravitFormu();

  if (response.status === "success") {
    uspeh.value = true;
    formaIzmeneniyaRoli.zakritFormu();
  }
}
</script>

<template>
  <GhBox class="account-form">
    <template #header>{{ t("account.form_change_role.caption") }}</template>

    <div class="account-form__body">
      <GhBanner
        v-if="uspeh"
        variant="success"
        :title="t('account.common.saved')"
      />

      <GhFormField
        :label="t('account.form_change_role.fields.labels.new_role')"
        control-id="account-role"
      >
        <template #default="{ controlId, ariaInvalid }">
          <GhSelect
            :id="controlId"
            :model-value="form.newRole"
            :options="roles"
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
        :label="t('account.form_change_role.buttons.ok')"
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
