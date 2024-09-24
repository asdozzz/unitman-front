<script setup lang="ts">
import {storeToRefs} from "pinia";
import {storeObnovleniyaNastroekHuka} from "@/modules/unit/store/SpisokProektov/StoreObnovleniyaNastroekHuka";

const formStore = storeObnovleniyaNastroekHuka();
const { form, oshibkaOtBackenda, loader } = storeToRefs(formStore);

const emit = defineEmits<{
  formaBilaOtpravlena: []
}>()
async function otpravitFormu() {
  const response = await formStore.otpravitFormu();

  if (response.status === "success") {
    emit('formaBilaOtpravlena');
    formStore.zakritFormu();
  }

}
</script>

<template>
  <q-card>
    <q-card-section>
      <div class="text-h6">Project hook settings</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <q-toggle v-model="form.avtosozdanie" label="Auto create unit" /><br>
      <q-toggle v-model="form.avtoobnovlenie" label="Auto update unit" /><br>
      <q-toggle v-model="form.avtoudalenie" label="Auto delete unit" /><br>
      <div class="text-red" v-if="oshibkaOtBackenda" v-html="oshibkaOtBackenda"></div>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn label="OK" color="primary" @click="otpravitFormu" :loading="loader"/>
      <q-btn label="Close" color="black" @click="formStore.zakritFormu()" :loading="loader"/>
    </q-card-actions>
  </q-card>
</template>

<style scoped>

</style>
