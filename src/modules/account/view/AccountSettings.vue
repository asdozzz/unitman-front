<script setup lang="ts">
import {storNastroekPolzovatelya} from "@/modules/account/store/StorNastroekPolzovatelya";
import {storeToRefs} from "pinia";
import {onMounted} from "vue";

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
      <q-card-section class="bg-blue-8 text-white">
        <div class="text-subtitle2">Новый пароль</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-input v-model="formPassword.newPassword" label="Новый пароль" />
        <div v-if="oshibkaOtBackenda" class="text-red">{{oshibkaOtBackenda}}</div>
      </q-card-section>
      <q-card-actions>
        <q-btn color="primary" :loading="loader" @click="izmenitParol()">Сохранить</q-btn>
      </q-card-actions>
    </q-card>
  </div>
  <div class="col-6">
    <q-card class="q-mr-md q-mb-md">
      <q-card-section class="bg-blue-8 text-white">
        <div class="text-subtitle2">Новый никнейм</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-input v-model="formNickname.newNickname" label="Новый никнейм" />
        <div v-if="oshibkaOtBackendaNick" class="text-red">{{oshibkaOtBackendaNick}}</div>
      </q-card-section>
      <q-card-actions>
        <q-btn color="primary" :loading="loader" @click="izmenitNick()">Сохранить</q-btn>
      </q-card-actions>
    </q-card>
  </div>
</div>
</template>
