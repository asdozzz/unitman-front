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
    await editFormStore.otkritFormu(new EditProjectForm(proekt.value.id, proekt.value.name, proekt.value.proxyHost));
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
  <q-card v-else  style="width: 720px; max-width: 80vw;">
    <q-card-section class="q-pt-none">
      <q-input v-model="form.newProjectName" label="Project Name" />
      <q-input v-model="form.newProxyHost" label="Proxy Host" />
      <div class="text-negative" v-if="oshibkaOtBackenda" v-html="oshibkaOtBackenda"></div>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn label="OK" color="primary" @click="otpravitFormu" :loading="loader"/>
      <q-btn label="Close" color="dark" @click="editFormStore.zakritFormu()" :loading="loader"/>
    </q-card-actions>
  </q-card>
</template>

<style scoped>

</style>
