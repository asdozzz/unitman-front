<script setup lang="ts">
import {storeToRefs} from "pinia";
import {onMounted} from "vue";
import {storFormiIzmeneniyaVetkiUnita} from "@/modules/unit/store/SpisokUnitov/StorFormiIzmeneniyaVetkiUnita";

const storFormiIzmeneniyaVetki = storFormiIzmeneniyaVetkiUnita();
const { form, oshibkaOtBackenda, loader, vetki } = storeToRefs(storFormiIzmeneniyaVetki);

onMounted(async () => {
  await storFormiIzmeneniyaVetki.poluchitVetki();
})

const emit = defineEmits<{
  formaBilaOtpravlena: []
}>()

async function otpravitFormu() {
  const response = await storFormiIzmeneniyaVetki.otpravitFormu();

  if (response.status === "success") {
    emit('formaBilaOtpravlena');
    storFormiIzmeneniyaVetki.zakritFormu();
  }

}

function filterSpiskaVetok(val: string | null, update: any) {
  vetki.value.query = val;
  update(() => storFormiIzmeneniyaVetki.poluchitVetki());
}
</script>

<template>
  <q-card  style="width: 700px; max-width: 80vw;">
    <q-card-section>
      <div class="text-h6">Change branch</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <q-select
          :loading="vetki.loader"
          v-model="form.newBranch"
          :options="vetki.spisok"
          @filter="filterSpiskaVetok"
          label="New Branch"
          fill-input
          clearable
          use-input
          hide-selected
          emit-value
      >
        <template v-slot:no-option>
          <q-item>
            <q-item-section class="text-grey">
              No results
            </q-item-section>
          </q-item>
        </template>
      </q-select>

      <div class="text-negative" v-if="oshibkaOtBackenda" v-html="oshibkaOtBackenda"></div>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn label="OK" color="primary" @click="otpravitFormu" :loading="loader"/>
      <q-btn label="Close" color="dark" @click="storFormiIzmeneniyaVetki.zakritFormu()" :loading="loader"/>
    </q-card-actions>
  </q-card>
</template>

<style scoped>

</style>
