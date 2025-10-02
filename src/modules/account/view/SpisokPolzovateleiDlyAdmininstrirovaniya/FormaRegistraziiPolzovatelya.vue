<script setup lang="ts">
import {storeToRefs} from "pinia";
import {
  useFormaRegistraziiPolzovatelya
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaRegistraziiPolzovatelyaStore";

const addFormStore = useFormaRegistraziiPolzovatelya();
const { form, oshibkaOtBackenda, loader, roles, locales } = storeToRefs(addFormStore);

const emit = defineEmits<{
  formaBilaOtpravlena: []
}>()
async function otpravitFormu() {
  const response = await addFormStore.otpravitFormu();

  if (response.status === "success") {
    emit('formaBilaOtpravlena');
    addFormStore.zakritFormu();
  }

}
</script>

<template>
  <q-card  style="width: 700px; max-width: 80vw;">
    <q-card-section>
      <div class="text-h6">{{$t('account.form_add.caption')}}</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <q-input v-model="form.email" :label="$t('account.form_add.fields.labels.email')" />
      <q-input v-model="form.password" :label="$t('account.form_add.fields.labels.password')" />
      <q-select v-model="form.roles" :options="roles.spisok" :label="$t('account.form_add.fields.labels.role')" emit-value map-options/>
      <q-select v-model="form.locale" :options="locales.spisok" :label="$t('account.form_add.fields.labels.locale')" emit-value map-options/>
      <q-input v-model="form.nickname" :label="$t('account.form_add.fields.labels.nickname')" />
      <div class="text-negative" v-if="oshibkaOtBackenda" v-html="oshibkaOtBackenda"></div>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn :label="$t('account.form_add.buttons.ok')" color="primary" @click="otpravitFormu" :loading="loader"/>
      <q-btn :label="$t('account.form_add.buttons.close')" color="dark" @click="addFormStore.zakritFormu()" :loading="loader"/>
    </q-card-actions>
  </q-card>
</template>

<style scoped>

</style>
