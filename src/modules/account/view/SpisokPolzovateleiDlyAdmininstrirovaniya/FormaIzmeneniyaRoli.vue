<script setup lang="ts">
import {storeToRefs} from "pinia";
import {
  useFormaIzmeneniyaRoli
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaIzmeneniyaRoliStore";

const formaIzmeneniyaRoli = useFormaIzmeneniyaRoli();
const { form, oshibkaOtBackenda, loader, roles } = storeToRefs(formaIzmeneniyaRoli);

const emit = defineEmits<{
  formaBilaOtpravlena: []
}>()
async function otpravitFormu() {
  const response = await formaIzmeneniyaRoli.otpravitFormu();

  if (response.status === "success") {
    emit('formaBilaOtpravlena');
    formaIzmeneniyaRoli.zakritFormu();
  }

}
</script>

<template>
  <q-card  style="width: 700px; max-width: 80vw;">
    <q-card-section>
      <div class="text-h6">{{$t('account.form_change_role.caption')}}</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <q-select v-model="form.newRole" emit-value :options="roles" :label="$t('account.form_change_role.fields.labels.new_role')" />
      <div class="text-negative" v-if="oshibkaOtBackenda" v-html="oshibkaOtBackenda"></div>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn :label="$t('account.form_change_role.buttons.ok')" color="primary" @click="otpravitFormu" :loading="loader"/>
      <q-btn :label="$t('account.form_change_role.buttons.close')" color="dark" @click="formaIzmeneniyaRoli.zakritFormu()" :loading="loader"/>
    </q-card-actions>
  </q-card>
</template>

<style scoped>

</style>
