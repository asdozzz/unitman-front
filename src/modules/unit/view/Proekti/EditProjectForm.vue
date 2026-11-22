<script setup lang="ts">
import {storeToRefs} from "pinia";
import {EditProjectForm, useEditProjectFormStore} from "@/modules/unit/store/SpisokProektov/EditProjectFormStore";
import {onMounted} from "vue";
import {useRoute} from "vue-router";
import {storePolucheniyaProekta} from "@/modules/unit/store/SpisokProektov/StorPolucheniyaProekta";
import ZashishennieVetkiProekta from "@/modules/unit/view/Proekti/ZashishennieVetkiProekta.vue";
import {
  GhBanner,
  GhBox,
  GhButton,
  GhFormField,
  GhInput,
  GhSkeleton,
} from "@/components/ui";

const storeProekta = storePolucheniyaProekta();
const {loader: loaderProekta, proekt, oshibkaOtBeka } = storeToRefs(storeProekta);

const editFormStore = useEditProjectFormStore();
const { form, oshibkaOtBackenda, loader } = storeToRefs(editFormStore);

const route = useRoute();

async function zagruzitProekt(): Promise<void> {
  await storeProekta.poluchitProekt(route.params.id as string);
  if (proekt.value) {
    await editFormStore.otkritFormu(new EditProjectForm(proekt.value.id, proekt.value.name, proekt.value.proxyHost, proekt.value.memoryLimit));
  }
}

onMounted(zagruzitProekt);

async function otpravitFormu() {
  await editFormStore.otpravitFormu();
}
</script>

<template>
  <div class="edit-project">
    <GhBox v-if="loaderProekta" padding="md" aria-busy="true">
      <div class="edit-project__skeleton">
        <GhSkeleton variant="text" width="30%" height="14" />
        <GhSkeleton variant="rect" width="100%" height="32" />
        <GhSkeleton variant="text" width="30%" height="14" />
        <GhSkeleton variant="rect" width="100%" height="32" />
        <GhSkeleton variant="rect" width="120px" height="32" />
      </div>
    </GhBox>

    <GhBanner
        v-else-if="oshibkaOtBeka"
        variant="danger"
        :title="$t('common.states.error')"
    >
      {{ oshibkaOtBeka }}
      <template #actions>
        <GhButton
            variant="default"
            icon="sync"
            :label="$t('common.buttons.retry')"
            @click="zagruzitProekt"
        />
      </template>
    </GhBanner>

    <form v-else class="edit-project__form" @submit.prevent="otpravitFormu">
      <GhBox padding="md">
        <template #header>
          {{ $t('unit.proekt.tabs.project_data') }}
        </template>

        <div class="edit-project__fields">
          <GhFormField :label="$t('unit.form_edit_project.fields.labels.projectName')">
            <GhInput v-model="form.newProjectName" />
          </GhFormField>

          <GhFormField :label="$t('unit.form_edit_project.fields.labels.proxyHost')">
            <GhInput v-model="form.newProxyHost" />
          </GhFormField>

          <GhFormField :label="$t('unit.form_edit_project.fields.labels.unitContainerMemory')">
            <GhInput
                :model-value="form.memoryLimit"
                type="number"
                @update:model-value="form.memoryLimit = $event === null || $event === '' ? 0 : Number($event)"
            />
          </GhFormField>
        </div>

        <GhBanner v-if="oshibkaOtBackenda" variant="danger" class="edit-project__error">
          {{ oshibkaOtBackenda }}
        </GhBanner>

        <template #footer>
          <GhButton
              type="submit"
              variant="primary"
              icon="check"
              :label="$t('unit.form_edit_project.buttons.save')"
              :loading="loader"
          />
        </template>
      </GhBox>
    </form>

    <ZashishennieVetkiProekta v-if="proekt && !loaderProekta" />
  </div>
</template>

<style scoped>
.edit-project {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 560px;
}

.edit-project__form {
  display: contents;
}

.edit-project__fields,
.edit-project__skeleton {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.edit-project__error {
  margin-top: 12px;
}
</style>
