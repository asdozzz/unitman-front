<script setup lang="ts">
import {storeToRefs} from "pinia";
import {useFormaDobavleniyaUnitaStore} from "@/modules/unit/store/SpisokUnitov/FormaDobavleniyaUnitaStore";
import {useSpisokUnitovStore} from "@/modules/unit/store/SpisokUnitovStore";
import PeremenayaKonfiga from "@/modules/unit/view/Unit/Konfig/PeremenayaKonfiga.vue";

const addFormStore = useFormaDobavleniyaUnitaStore();
const { form, oshibkaOtBackenda, loader, vetki, initPeremenie } = storeToRefs(addFormStore);

const unitiStore = useSpisokUnitovStore();
const { proekti } = storeToRefs(unitiStore);

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

function filterSpiskaVetok(val: string | null, update: any) {
  vetki.value.query = val;
  update(() => addFormStore.poluchitVetki());
}
</script>

<template>
  <q-card  style="width: 700px; max-width: 80vw;">
    <q-card-section>
      <div class="text-h6">Add Unit</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <q-select v-model="form.projectId" :options="proekti.spisok" label="Project" emit-value map-options @update:model-value="addFormStore.poluchitVetki()"/>
      <q-select
          :loading="vetki.loader"
          v-model="form.branch"
          :options="vetki.spisok"
          @filter="filterSpiskaVetok"
          @update:model-value="addFormStore.poluchitPeremenieKonfiga()"
          label="Branch"
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
      <q-input v-model="form.unitName" label="Unit Name" />
      <template v-if="form.peremenieKonfiga.length > 0">
        <template v-for="peremenaya in form.peremenieKonfiga">
          <PeremenayaKonfiga :peremenaya="peremenaya"/>
        </template>
      </template>
      <template v-if="initPeremenie && form.peremenieKonfiga.length == 0">
        В конфиге отсутствуют переменные
      </template>
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
