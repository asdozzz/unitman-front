<script setup lang="ts">
import {storeToRefs} from "pinia";
import {useEditProjectFormStore} from "@/modules/unit/store/SpisokProektov/EditProjectFormStore";

const editFormStore = useEditProjectFormStore();
const { form, oshibkaOtBackenda, loader } = storeToRefs(editFormStore);

const emit = defineEmits<{
  formaBilaOtpravlena: []
}>()
async function otpravitFormu() {
  const response = await editFormStore.otpravitFormu();

  if (response.status === "success") {
    emit('formaBilaOtpravlena');
    editFormStore.zakritFormu();
  }

}
</script>

<template>
  <q-card  style="width: 700px; max-width: 80vw;">
    <q-card-section>
      <div class="text-h6">Edit Project</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <q-input v-model="form.newProjectName" label="New Project Name" />
      <div class="text-red" v-if="oshibkaOtBackenda" v-html="oshibkaOtBackenda"></div>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn label="OK" color="primary" @click="otpravitFormu" :loading="loader"/>
      <q-btn label="Close" color="black" @click="editFormStore.zakritFormu()" :loading="loader"/>
    </q-card-actions>
  </q-card>
</template>

<style scoped>

</style>
