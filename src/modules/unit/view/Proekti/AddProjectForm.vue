<script setup lang="ts">
import {storeToRefs} from "pinia";
import {useAddProjectFormStore} from "@/modules/unit/store/SpisokProektov/AddProjectFormStore";
import {onMounted} from "vue";

const addFormStore = useAddProjectFormStore();
const { form, oshibkaOtBackenda, loader, hranilisha } = storeToRefs(addFormStore);

onMounted(async () => {
  await addFormStore.poluchitActivnieHranilisha();
})

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
      <div class="text-h6">Add Project</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <q-select v-model="form.repoId" :options="hranilisha.spisok" label="Repo" emit-value map-options/>
      <q-input v-model="form.projectCode" label="Project Code" />
      <q-input v-model="form.projectName" label="Project Name" />
      <q-input v-model="form.mainBranch" label="Main Branch" />
      <q-input v-model="form.proxyHost" label="Proxy Host" />
      <div class="text-negative" v-if="oshibkaOtBackenda" v-html="oshibkaOtBackenda"></div>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn label="OK" color="primary" @click="otpravitFormu" :loading="loader"/>
      <q-btn label="Close" color="dark" @click="addFormStore.zakritFormu()" :loading="loader"/>
    </q-card-actions>
  </q-card>
</template>

<style scoped>

</style>
