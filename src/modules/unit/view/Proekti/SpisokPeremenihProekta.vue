<script setup lang="ts">
import {storeToRefs} from "pinia";
import {onMounted } from "vue";
import {useSpisokPeremenihProektaStore} from "@/modules/unit/store/SpisokProektov/SpisokPeremenihProektaStore";

const spisokPeremenihProekta = useSpisokPeremenihProektaStore();
const {spisok, form, loaderUdaleniya, loaderDobavleniya, tipiPeremenoi} = storeToRefs(spisokPeremenihProekta);

onMounted(async () => {
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
  <q-card style="width: 700px; max-width: 80vw;">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6">Variables list</div>
      <q-space />
      <q-btn icon="close" flat round dense @click="spisokPeremenihProekta.skritSpisok" />
    </q-card-section>

    <q-card-section>
      <div class="row">
        <div class="col-3 q-pa-sm"><q-select dense v-model="form.tip" :options="tipiPeremenoi" label="Type" emit-value/></div>
        <div class="col-3 q-pa-sm"><q-input dense v-model="form.code" label="Code" /></div>
        <div class="col q-pa-sm"><q-input dense v-model="form.value" label="Value" /></div>
        <div class="col-auto q-pa-sm">
          <q-btn size="md" color="dark" icon="add" @click="dobavitPeremnuyu" :loading="loaderDobavleniya">
            <q-tooltip>add</q-tooltip>
          </q-btn>
        </div>
      </div>
      <q-list>
        <q-item>
          <q-item-section>

          </q-item-section>
        </q-item>
        <q-item v-for="variable in spisok" :key="variable.code" class="q-mb-sm" clickable v-ripple>
          <q-item-section v-if="variable.tip !== 'hidden'">
            <q-item-label>{{variable.code}}: {{variable.value}}</q-item-label>
          </q-item-section>
          <q-item-section v-else>
            <q-item-label>{{variable.code}}: *******</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-btn size="md" color="dark" icon="delete" @click="udalitPeremenuyu(variable.code)" :loading="loaderUdaleniya">
              <q-tooltip>delete</q-tooltip>
            </q-btn>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>
  </q-card>
</template>
