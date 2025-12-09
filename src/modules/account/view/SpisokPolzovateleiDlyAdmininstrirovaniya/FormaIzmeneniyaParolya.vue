<script setup lang="ts">
import {storeToRefs} from "pinia";
import {
  useFormaIzmeneniyaParolya
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaIzmeneniyaParolyaStore";

const props = defineProps<{
  id: string
}>();

const formaIzmeneniyaParolya = useFormaIzmeneniyaParolya();
const { form, oshibkaOtBackenda, loader } = storeToRefs(formaIzmeneniyaParolya);

formaIzmeneniyaParolya.otkritFormu(props.id);
async function otpravitFormu() {
  const response = await formaIzmeneniyaParolya.otpravitFormu();

  if (response.status === "success") {
    formaIzmeneniyaParolya.zakritFormu();
  }
}
</script>

<template>
  <q-card>
    <q-card-section class="q-pt-none">
      <q-input v-model="form.newPassword" :label="$t('account.form_change_password.fields.labels.new_password')" />
      <div class="text-negative" v-if="oshibkaOtBackenda" v-html="oshibkaOtBackenda"></div>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn :label="$t('account.form_change_password.buttons.ok')" color="primary" @click="otpravitFormu" :loading="loader"/>
    </q-card-actions>
  </q-card>
</template>

<style scoped>

</style>
