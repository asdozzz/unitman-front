<script setup lang="ts">
import {storFormiDeistviyUnita} from "@/modules/unit/store/SpisokUnitov/StorFormiDeistviy";
import {storeToRefs} from "pinia";

const storFormiDeistviy = storFormiDeistviyUnita();
const {form, deistvie, loader, oshibkaOtBackenda} = storeToRefs(storFormiDeistviy);

const emit = defineEmits<{
  formaBilaOtpravlena: []
}>()

async function otpravitFormu() {
  const response = await storFormiDeistviy.otpravitFormu();

  if (response.status === "success") {
    emit('formaBilaOtpravlena');
    storFormiDeistviy.zakritFormu();
  }
}

</script>

<template>
  <q-card  style="width: 700px; max-width: 80vw;">
    <q-card-section>
      <div class="text-h6">{{ deistvie?.name }}</div>
      <div v-for="command in deistvie?.commands">
        {{command}}
      </div>
    </q-card-section>
    <q-card-section>
      <template v-for="peremenaya in form.values">
        <template v-if="peremenaya.konfig.type === 'collection'">
          <q-select v-model="peremenaya.value" option-value="id" option-label="name"
                    :options="peremenaya.konfig.options.options ?? []" :label="peremenaya.konfig.label" emit-value map-options/>
        </template>
        <template v-else>
          <q-input v-model="peremenaya.value" :label="peremenaya.konfig.label" />
        </template>

      </template>
      <div class="text-red" v-if="oshibkaOtBackenda" v-html="oshibkaOtBackenda"></div>
    </q-card-section>
    <q-card-actions align="right">
      <q-btn label="OK" color="primary" @click="otpravitFormu" :loading="loader"/>
      <q-btn label="Close" color="black" @click="storFormiDeistviy.zakritFormu()" :loading="loader"/>
    </q-card-actions>
  </q-card>
</template>

<style scoped>

</style>
