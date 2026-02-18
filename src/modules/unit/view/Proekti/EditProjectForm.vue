<script setup lang="ts">
import {storeToRefs} from "pinia";
import {EditProjectForm, useEditProjectFormStore} from "@/modules/unit/store/SpisokProektov/EditProjectFormStore";
import {onMounted} from "vue";
import {useRoute} from "vue-router";
import {storePolucheniyaProekta} from "@/modules/unit/store/SpisokProektov/StorPolucheniyaProekta";

const storeProekta = storePolucheniyaProekta();
const {loader: loaderProekta, proekt, oshibkaOtBeka } = storeToRefs(storeProekta);

const editFormStore = useEditProjectFormStore();
const { form, oshibkaOtBackenda, loader } = storeToRefs(editFormStore);

const route = useRoute();

onMounted(async () => {
  await storeProekta.poluchitProekt(route.params.id as string);
  if (proekt.value) {
    await editFormStore.otkritFormu(new EditProjectForm(proekt.value.id, proekt.value.name, proekt.value.proxyHost, proekt.value.memoryLimit));
  }

})
async function otpravitFormu() {
  await editFormStore.otpravitFormu();
}
</script>

<template>
  <q-spinner-cube
      v-if="loaderProekta"
      color="primary"
      size="2em"
  />
  <template v-else-if="oshibkaOtBeka">
    <div class="text-negative" v-html="oshibkaOtBeka"></div>
  </template>
  <q-card v-else  style="width: 500px; max-width: 80vw;">
    <q-card-section>
      <q-input standou square dense outlined v-model="form.newProjectName" :label="$t('unit.form_edit_project.fields.labels.projectName')" />
      <q-input square dense outlined v-model="form.newProxyHost" :label="$t('unit.form_edit_project.fields.labels.proxyHost')" class="q-mt-sm" />
      <q-input type="number" v-model.number="form.memoryLimit" :label="$t('unit.form_edit_project.fields.labels.unitContainerMemory')" />
      <div class="text-negative" v-if="oshibkaOtBackenda" v-html="oshibkaOtBackenda"></div>
      <q-btn :label="$t('unit.form_edit_project.buttons.save')" color="primary" @click="otpravitFormu" :loading="loader" class="q-mt-sm"/>
    </q-card-section>
  </q-card>
</template>

<style scoped>

</style>
