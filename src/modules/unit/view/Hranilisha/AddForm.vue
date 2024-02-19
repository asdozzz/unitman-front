<script setup lang="ts">
import {storeToRefs} from "pinia";
import {useAddFormStore} from "@/modules/unit/store/SpisokHranilish/AddFormStore";
import {onMounted} from "vue";

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
  console.log("BBB", response);
  if (response.status === "success") {
    emit('formaBilaOtpravlena');
    addFormStore.zakritFormu();
  }

}
</script>

<template>
  <q-card  style="width: 700px; max-width: 80vw;">
    <q-card-section>
      <div class="text-h6">Add Repository</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <q-select v-model="form.repoType" :options="tipiHranilisha.spisok" label="Type" emit-value/>
      <q-input v-model="form.repoName" label="Name" />
      <q-input v-model="form.token" label="Token" />
      <q-input v-model="form.repoUrl" label="Url" />
      <div class="text-red" v-if="oshibkaOtBackenda" v-html="oshibkaOtBackenda"></div>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn label="OK" color="primary" @click="otpravitFormu" :loading="loader"/>
      <q-btn label="Close" color="black" @click="addFormStore.zakritFormu()" :loading="loader"/>
    </q-card-actions>
  </q-card>
</template>

<style scoped>

</style>
