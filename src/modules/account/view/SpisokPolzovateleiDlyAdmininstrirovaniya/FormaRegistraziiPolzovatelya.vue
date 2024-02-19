<script setup lang="ts">
import {storeToRefs} from "pinia";
import {
  useFormaRegistraziiPolzovatelya
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaRegistraziiPolzovatelyaStore";

const addFormStore = useFormaRegistraziiPolzovatelya();
const { form, oshibkaOtBackenda, loader, roles } = storeToRefs(addFormStore);

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
      <div class="text-h6">Add User</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <q-input v-model="form.email" label="Email" />
      <q-input v-model="form.password" label="Password" />
      <q-select v-model="form.roles" :options="roles.spisok" label="Role" emit-value/>
      <div class="text-red" v-if="oshibkaOtBackenda" v-html="oshibkaOtBackenda"></div>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn label="OK" color="primary" @click="otpravitFormu" :loading="loader"/>
      <q-btn label="Close" color="black" @click="addFormStore.zakritFormu()" :loading="loader"/>
    </q-card-actions>
  </q-card>
</template>

<style scoped>

</style>
