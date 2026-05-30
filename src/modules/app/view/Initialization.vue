<script setup lang="ts">
import {storeToRefs} from "pinia";
import {storeInizializii} from "@/modules/app/store/InitializationStore";

const store = storeInizializii();
const { formaProxyHost: form } = storeToRefs(store);
</script>

<template>
  <q-card square class="q-ma-md"  style="width: 700px;">
    <q-card-section>
      <div class="text-h6">{{$t('app.form_proxy_host.caption')}}</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <q-input v-model="form.value" label="Default Proxy Host" />
      <div class="text-negative" v-if="form.oshibkaOtBeka" v-html="form.oshibkaOtBeka"></div>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn :label="$t('app.form_proxy_host.buttons.ok')" color="primary" @click="store.obnovitProxyHost()" :loading="form.loader"/>
    </q-card-actions>
  </q-card>
</template>

<style scoped>

</style>
