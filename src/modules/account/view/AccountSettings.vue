<script setup lang="ts">
import {storNastroekPolzovatelya} from "@/modules/account/store/StorNastroekPolzovatelya";
import {storeToRefs} from "pinia";
import {onMounted} from "vue";
import SpisokRekvizitovOpenCode from "@/modules/account/view/AccountSettings/SpisokRekvizitovOpenCode.vue";

const storeNastroekPolzovatelya = storNastroekPolzovatelya();
const { formPassword, formNickname, oshibkaOtBackenda, oshibkaOtBackendaNick, loader } = storeToRefs(storeNastroekPolzovatelya);

function izmenitParol() {
  storeNastroekPolzovatelya.izmenitParol()
}

function izmenitNick() {
  storeNastroekPolzovatelya.izmenitNick()
}

onMounted(async () => {
  storeNastroekPolzovatelya.poluchitNastroiki();
})

</script>

<template>
<div class="row">
  <div class="col-6">
    <q-card class="q-mr-md q-mb-md">
      <q-card-section class="bg-primary text-white">
        <div class="text-subtitle2">{{ $t('account.settings.password.title') }}</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-input v-model="formPassword.newPassword" :label="$t('account.settings.password.label')" />
        <div v-if="oshibkaOtBackenda" class="text-negative">{{oshibkaOtBackenda}}</div>
      </q-card-section>
      <q-card-actions>
        <q-btn color="primary" :loading="loader" @click="izmenitParol()">{{ $t('common.buttons.save') }}</q-btn>
      </q-card-actions>
    </q-card>
  </div>
  <div class="col-6">
    <q-card class="q-mr-md q-mb-md">
      <q-card-section class="bg-primary text-white">
        <div class="text-subtitle2">{{ $t('account.settings.nickname.title') }}</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-input v-model="formNickname.newNickname" :label="$t('account.settings.nickname.label')" />
        <div v-if="oshibkaOtBackendaNick" class="text-negative">{{oshibkaOtBackendaNick}}</div>
      </q-card-section>
      <q-card-actions>
        <q-btn color="primary" :loading="loader" @click="izmenitNick()">{{ $t('common.buttons.save') }}</q-btn>
      </q-card-actions>
    </q-card>
  </div>
</div>
<div class="row">
  <div class="col-12">
    <SpisokRekvizitovOpenCode />
  </div>
</div>
</template>
