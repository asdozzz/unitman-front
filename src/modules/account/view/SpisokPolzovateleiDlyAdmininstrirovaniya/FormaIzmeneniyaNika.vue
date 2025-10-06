<script setup lang="ts">
import {storeToRefs} from "pinia";
import {
  useFormaIzmeneniyaNickname
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaIzmeneniyaNikaStore";

const formaIzmeneniyaNickname = useFormaIzmeneniyaNickname();
const { form, oshibkaOtBackenda, loader } = storeToRefs(formaIzmeneniyaNickname);
const props = defineProps<{
  id: string
}>();
formaIzmeneniyaNickname.otkritFormu(props.id, "");
async function otpravitFormu() {
  const response = await formaIzmeneniyaNickname.otpravitFormu();

  if (response.status === "success") {
    formaIzmeneniyaNickname.zakritFormu();
  }

}
</script>

<template>
  <q-card>
    <q-card-section>
      <div class="text-h6">{{$t('account.form_change_nickname.caption')}}</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <q-input v-model="form.newNickname" :label="$t('account.form_change_nickname.fields.labels.new_nickname')" />
      <div class="text-negative" v-if="oshibkaOtBackenda" v-html="oshibkaOtBackenda"></div>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn :label="$t('account.form_change_nickname.buttons.ok')" color="primary" @click="otpravitFormu" :loading="loader"/>
      <q-btn :label="$t('account.form_change_nickname.buttons.close')" color="dark" @click="formaIzmeneniyaNickname.zakritFormu()" :loading="loader"/>
    </q-card-actions>
  </q-card>
</template>

<style scoped>

</style>
