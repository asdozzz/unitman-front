<script setup lang="ts">
import {storeToRefs} from "pinia";
import {useAddFormStore} from "@/modules/unit/store/SpisokHranilish/AddFormStore";
import {onMounted} from "vue";
import {
  GhBanner,
  GhButton,
  GhFormField,
  GhInput,
  GhSelect,
} from "@/components/ui";

const addFormStore = useAddFormStore();
const { form, oshibkaOtBackenda, loader, tipiHranilisha } = storeToRefs(addFormStore);

onMounted(async () => {
  await addFormStore.poluchitTipiHranilisha();
})

const emit = defineEmits<{
  formaBilaOtpravlena: []
}>()
async function otpravitFormu() {
  const response = await addFormStore.otpravitFormu();

  if (response.status === "success") {
    emit('formaBilaOtpravlena');
    addFormStore.zakritFormu();
  }

}
</script>

<template>
  <form class="add-repo" @submit.prevent="otpravitFormu">
    <div class="add-repo__fields">
      <GhFormField :label="$t('unit.form_add_rep.fields.labels.type')">
        <GhSelect
            :model-value="form.repoType"
            :options="tipiHranilisha.spisok"
            :disabled="tipiHranilisha.loader"
            @update:model-value="form.repoType = $event === null ? '' : String($event)"
        />
      </GhFormField>

      <GhFormField :label="$t('unit.form_add_rep.fields.labels.name')">
        <GhInput v-model="form.repoName" />
      </GhFormField>

      <GhFormField :label="$t('unit.form_add_rep.fields.labels.token')">
        <GhInput v-model="form.token" type="password" autocomplete="new-password" />
      </GhFormField>

      <GhFormField :label="$t('unit.form_add_rep.fields.labels.url')">
        <GhInput v-model="form.repoUrl" type="url" />
      </GhFormField>
    </div>

    <GhBanner v-if="oshibkaOtBackenda" variant="danger" class="add-repo__error">
      {{ oshibkaOtBackenda }}
    </GhBanner>

    <div class="add-repo__actions">
      <GhButton
          variant="default"
          :label="$t('unit.form_add_rep.buttons.close')"
          :disabled="loader"
          @click="addFormStore.zakritFormu()"
      />
      <GhButton
          type="submit"
          variant="primary"
          icon="check"
          :label="$t('unit.form_add_rep.buttons.ok')"
          :loading="loader"
      />
    </div>
  </form>
</template>

<style scoped>
.add-repo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.add-repo__fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.add-repo__error {
  margin-top: 4px;
}

.add-repo__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--borderColor-default);
}
</style>
