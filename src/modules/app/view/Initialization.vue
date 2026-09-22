<script setup lang="ts">
import {storeToRefs} from "pinia";
import {storeInizializii} from "@/modules/app/store/InitializationStore";

const store = storeInizializii();
const { formaProxyHost: form, proverkaProxyHost } = storeToRefs(store);
</script>

<template>
  <q-card square class="q-ma-md"  style="width: 700px;">
    <q-card-section>
      <div class="text-h6">{{$t('app.form_proxy_host.caption')}}</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <q-input v-model="form.value" label="Default Proxy Host" />
      <div class="text-negative" v-if="form.oshibkaOtBeka" v-html="form.oshibkaOtBeka"></div>
      <div class="text-negative" v-if="proverkaProxyHost.oshibkaOtBeka" v-html="proverkaProxyHost.oshibkaOtBeka"></div>
      <span v-if="proverkaProxyHost.result === true" class="text-light-green">Доступен</span>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn :label="$t('app.form_proxy_host.buttons.check')" color="primary" @click="store.proveritProxyHost()" :loading="form.loader" :disabled="store.elsiProxyHostNeZapolnen"/>
      <q-btn :label="$t('app.form_proxy_host.buttons.ok')" color="primary" @click="store.obnovitProxyHost()" :loading="form.loader" :disabled="store.elsiProxyHostNeZapolnen"/>
    </q-card-actions>
  </q-card>
</template>

<style scoped>

</style>
