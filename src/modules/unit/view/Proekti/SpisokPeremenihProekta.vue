<script setup lang="ts">
import {storeToRefs} from "pinia";
import {onMounted } from "vue";
import {useSpisokPeremenihProektaStore} from "@/modules/unit/store/SpisokProektov/SpisokPeremenihProektaStore";
import {useRoute} from "vue-router";

const spisokPeremenihProekta = useSpisokPeremenihProektaStore();
const {spisok, form, loaderUdaleniya, loaderDobavleniya, tipiPeremenoi, loaderSpiskaPeremenih} = storeToRefs(spisokPeremenihProekta);

const route = useRoute();

onMounted(async () => {
  spisokPeremenihProekta.pokazatSpisok(route.params.id as string)
  await spisokPeremenihProekta.poluchitSpisok();
})

async function dobavitPeremnuyu() {
  await spisokPeremenihProekta.dobavitPeremenuyu();
}

async function udalitPeremenuyu(code: string) {
  await spisokPeremenihProekta.udalitPeremenuyu(code);
}

</script>

<template>
  <q-card style="width: 720px; max-width: 80vw;">
    <q-card-section>
      <div class="row">
        <div class="col-3 q-pa-sm"><q-select v-model="form.tip" :options="tipiPeremenoi" label="Type" emit-value/></div>
        <div class="col-3 q-pa-sm"><q-input v-model="form.code" label="Code" /></div>
        <div class="col q-pa-sm"><q-input v-model="form.value" label="Value" /></div>
        <div class="col-auto q-pa-sm">
          <q-btn size="sm" padding="5px 6px" color="primary" icon="add" @click="dobavitPeremnuyu" :loading="loaderDobavleniya">
            <q-tooltip>add</q-tooltip>
          </q-btn>
        </div>
      </div>
      <div v-for="variable in spisok" :key="variable.code" class="q-mb-sm">
          <q-btn size="sm" padding="5px 6px" color="primary" icon="delete" @click="udalitPeremenuyu(variable.code)" :loading="loaderUdaleniya">
            <q-tooltip>delete</q-tooltip>
          </q-btn>
          <span class="q-pl-sm">
            <span v-if="variable.tip !== 'hidden'">
              {{variable.code}}: {{variable.value}}
            </span>
            <span v-else>
              {{variable.code}}: *******
            </span>
          </span>
      </div>
    </q-card-section>
  </q-card>
</template>
