<script setup lang="ts">
import {storeToRefs} from "pinia";
import {
  useFormaIzmeneniyaParolya
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaIzmeneniyaParolyaStore";

const formaIzmeneniyaParolya = useFormaIzmeneniyaParolya();
const { form, oshibkaOtBackenda, loader } = storeToRefs(formaIzmeneniyaParolya);

const emit = defineEmits<{
  formaBilaOtpravlena: []
}>()
async function otpravitFormu() {
  const response = await formaIzmeneniyaParolya.otpravitFormu();

  if (response.status === "success") {
    emit('formaBilaOtpravlena');
    formaIzmeneniyaParolya.zakritFormu();
  }

}
</script>

<template>
  <q-card  style="width: 700px; max-width: 80vw;">
    <q-card-section>
      <div class="text-h6">{{$t('account.form_change_password.caption')}}</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <q-input v-model="form.newPassword" :label="$t('account.form_change_password.fields.labels.new_password')" />
      <div class="text-negative" v-if="oshibkaOtBackenda" v-html="oshibkaOtBackenda"></div>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn :label="$t('account.form_change_password.buttons.ok')" color="primary" @click="otpravitFormu" :loading="loader"/>
      <q-btn :label="$t('account.form_change_password.buttons.close')" color="dark" @click="formaIzmeneniyaParolya.zakritFormu()" :loading="loader"/>
    </q-card-actions>
  </q-card>
</template>

<style scoped>

</style>
