<script setup lang="ts">
import {storeToRefs} from "pinia";
import {
  useFormaIzmeneniyaEmail
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaIzmeneniyaEmailStore";

const formaIzmeneniyaEmail = useFormaIzmeneniyaEmail();
const { form, oshibkaOtBackenda, loader } = storeToRefs(formaIzmeneniyaEmail);

const props = defineProps<{
  id: string
}>();

formaIzmeneniyaEmail.otkritFormu(props.id, "");
async function otpravitFormu() {
  const response = await formaIzmeneniyaEmail.otpravitFormu();

  if (response.status === "success") {
    formaIzmeneniyaEmail.zakritFormu();
  }

}
</script>

<template>
  <q-card>
    <q-card-section class="q-pt-none">
      <q-input v-model="form.newEmail" :label="$t('account.form_change_email.fields.labels.new_email')" />
      <div class="text-negative" v-if="oshibkaOtBackenda" v-html="oshibkaOtBackenda"></div>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn :label="$t('account.form_change_email.buttons.ok')" color="primary" @click="otpravitFormu" :loading="loader"/>
    </q-card-actions>
  </q-card>
</template>

<style scoped>

</style>
