<script setup lang="ts">
import {storeToRefs} from "pinia";
import {
  useFormaIzmeneniyaEmail
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaIzmeneniyaEmailStore";

const formaIzmeneniyaEmail = useFormaIzmeneniyaEmail();
const { form, oshibkaOtBackenda, loader } = storeToRefs(formaIzmeneniyaEmail);

const emit = defineEmits<{
  formaBilaOtpravlena: []
}>()
async function otpravitFormu() {
  const response = await formaIzmeneniyaEmail.otpravitFormu();

  if (response.status === "success") {
    emit('formaBilaOtpravlena');
    formaIzmeneniyaEmail.zakritFormu();
  }

}
</script>

<template>
  <q-card  style="width: 700px; max-width: 80vw;">
    <q-card-section>
      <div class="text-h6">Change Email</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <q-input v-model="form.newEmail" label="New Email" />
      <div class="text-red" v-if="oshibkaOtBackenda" v-html="oshibkaOtBackenda"></div>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn label="OK" color="primary" @click="otpravitFormu" :loading="loader"/>
      <q-btn label="Close" color="black" @click="formaIzmeneniyaEmail.zakritFormu()" :loading="loader"/>
    </q-card-actions>
  </q-card>
</template>

<style scoped>

</style>
