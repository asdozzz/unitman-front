<script setup lang="ts">
import {storeToRefs} from "pinia";
import {
  HookSettingsForm,
  storeObnovleniyaNastroekHuka
} from "@/modules/unit/store/SpisokProektov/StoreObnovleniyaNastroekHuka";
import {storePolucheniyaProekta} from "@/modules/unit/store/SpisokProektov/StorPolucheniyaProekta";
import {useRoute} from "vue-router";
import {onMounted} from "vue";
import {copyToClipboard} from "quasar";
import {storeHelper} from "@/modules/app/store/HelperStore";

const helperStore = storeHelper();
const { baseUrl } = storeToRefs(helperStore);

const storeProekta = storePolucheniyaProekta();
const {loader: loaderProekta, proekt, oshibkaOtBeka } = storeToRefs(storeProekta);

const formStore = storeObnovleniyaNastroekHuka();
const { form, oshibkaOtBackenda, loader } = storeToRefs(formStore);

const route = useRoute();

onMounted(async () => {
  await storeProekta.poluchitProekt(route.params.id as string);
  if (proekt.value) {
    formStore.otkritFormu(new HookSettingsForm(proekt.value.id, proekt.value.nastroikiHukaProekta.avtosozdanie, proekt.value.nastroikiHukaProekta.avtoobnovlenie, proekt.value.nastroikiHukaProekta.avtoudalenie, proekt.value.nastroikiHukaProekta.obnovlenieBezSbrosaPodgotovki))
  }
});

async function otpravitFormu() {
  await formStore.otpravitFormu();
}
</script>

<template>
  <q-spinner-cube
      v-if="loaderProekta"
      color="primary"
      size="2em"
  />
  <template v-else-if="oshibkaOtBeka">
    <div class="text-negative" v-html="oshibkaOtBeka"></div>
  </template>
  <q-card v-else style="width: 500px">
    <q-card-section>
      Для работы настроек ниже, нужно настроить вебхук в своих системах хранения репозиториев(gitlab, github).
      <q-chip
        v-if="proekt"
        class="q-ml-none" dark square  color="primary" label="repository event handler" icon="content_copy" clickable
        @click="copyToClipboard(baseUrl+'/project/'+proekt.id+'/hook')">
    </q-chip>
    </q-card-section>
    <q-card-section class="q-pa-sm">
      <q-toggle v-model="form.avtosozdanie" :label="$t('unit.form_project_settings.fields.labels.autoCreate')" /><br>
      <q-toggle v-model="form.avtoobnovlenie" :label="$t('unit.form_project_settings.fields.labels.autoUpdate')" /><br>
      <q-toggle v-model="form.avtoudalenie" :label="$t('unit.form_project_settings.fields.labels.autoDelete')" /><br>
      <q-toggle v-model="form.obnovlenieBezSbrosaPodgotovki" :label="$t('unit.form_project_settings.fields.labels.updateWithoutReset')" /><br>
      <div class="text-negative" v-if="oshibkaOtBackenda" v-html="oshibkaOtBackenda"></div>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn :label="$t('unit.form_project_settings.buttons.save')" color="primary" @click="otpravitFormu" :loading="loader"/>
    </q-card-actions>
  </q-card>
</template>

<style scoped>

</style>
