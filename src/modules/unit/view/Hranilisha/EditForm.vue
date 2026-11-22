<script setup lang="ts">
import {storeToRefs} from "pinia";
import {useEditFormStore} from "@/modules/unit/store/SpisokHranilish/EditFormStore";
import {
  GhBanner,
  GhButton,
  GhFormField,
  GhInput,
} from "@/components/ui";

const editFormStore = useEditFormStore();
const { form, oshibkaOtBackenda, loader } = storeToRefs(editFormStore);

const emit = defineEmits<{
  formaBilaOtpravlena: []
}>()
async function otpravitFormu() {
  const response = await editFormStore.otpravitFormu();

  if (response.status === "success") {
    emit('formaBilaOtpravlena');
    editFormStore.zakritFormu();
  }

}
</script>

<template>
  <form class="edit-repo" @submit.prevent="otpravitFormu">
    <GhFormField :label="$t('unit.form_edit_rep.fields.labels.token')">
      <GhInput v-model="form.token" type="password" autocomplete="new-password" />
    </GhFormField>

    <GhBanner v-if="oshibkaOtBackenda" variant="danger" class="edit-repo__error">
      {{ oshibkaOtBackenda }}
    </GhBanner>

    <div class="edit-repo__actions">
      <GhButton
          variant="default"
          :label="$t('unit.form_edit_rep.buttons.close')"
          :disabled="loader"
          @click="editFormStore.zakritFormu()"
      />
      <GhButton
          type="submit"
          variant="primary"
          icon="check"
          :label="$t('unit.form_edit_rep.buttons.ok')"
          :loading="loader"
      />
    </div>
  </form>
</template>

<style scoped>
.edit-repo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.edit-repo__error {
  margin-top: 4px;
}

.edit-repo__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--borderColor-default);
}
</style>
