<script setup lang="ts">
import {storeToRefs} from "pinia";
import {
  useFormaIzmeneniyaRoli
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaIzmeneniyaRoliStore";

const formaIzmeneniyaRoli = useFormaIzmeneniyaRoli();
const { form, oshibkaOtBackenda, loader, roles } = storeToRefs(formaIzmeneniyaRoli);

const props = defineProps<{
  id: string
}>();
formaIzmeneniyaRoli.otkritFormu(props.id, "");
async function otpravitFormu() {
  const response = await formaIzmeneniyaRoli.otpravitFormu();

  if (response.status === "success") {
    formaIzmeneniyaRoli.zakritFormu();
  }

}
</script>

<template>
  <q-card>
    <q-card-section class="q-pt-none">
      <q-select v-model="form.newRole" emit-value :options="roles" :label="$t('account.form_change_role.fields.labels.new_role')" />
      <div class="text-negative" v-if="oshibkaOtBackenda" v-html="oshibkaOtBackenda"></div>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn :label="$t('account.form_change_role.buttons.ok')" color="primary" @click="otpravitFormu" :loading="loader"/>
    </q-card-actions>
  </q-card>
</template>

<style scoped>

</style>
