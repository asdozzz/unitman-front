<script setup lang="ts">
import {onMounted } from "vue";
import {storeToRefs} from "pinia";
import {useSpisokPolzovateleiProektaStore} from "@/modules/unit/store/SpisokProektov/SpisokPolzovateleiProektaStore";
import {useSpisokVsehPolzovateleiStore} from "@/modules/account/store/SpisokVsehPolzovateleiStore";
import Polzovatel from "@/modules/account/store/SpisokVsehPolzovatelei/model/Polzovatel";

const spisokPolzovateleiProektaStore = useSpisokPolzovateleiProektaStore();
const { spisok, loaderSpiskaPolzovatei, oshibkaZagruzkiSpiska, loaderUdaleniya, form, loaderDobavleniya } = storeToRefs(spisokPolzovateleiProektaStore);

const spisokVsehPolzovateleiStore = useSpisokVsehPolzovateleiStore();
const { poluchitEmailPolzovatelyaPoId, esliPolzovatelZablokirovan } = storeToRefs(spisokVsehPolzovateleiStore)

onMounted(async () => {
  await spisokVsehPolzovateleiStore.poluchitVsehPolzovatelei();
  await spisokPolzovateleiProektaStore.poluchitSpisok();
})

function polzovateliDlyDobavleniyaVProekt(): Polzovatel[] {
  const exludeIds = spisokPolzovateleiProektaStore.spisokIdPolzovatelei;
  return spisokVsehPolzovateleiStore.spisokActivnihPolzovatelei
      .filter((item: Polzovatel) => !exludeIds.includes(item.id));
}

async function udalit(userId: string) {
  await spisokPolzovateleiProektaStore.udalitPolzovatelyaIzProekta(userId);
}

function dobavitPolzovatelyaVProekt() {
  spisokPolzovateleiProektaStore.dobavitPolzovatelya();
}

</script>

<template>
  <q-card>
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6">User list</div>
      <q-space />
      <q-btn icon="close" flat round dense @click="spisokPolzovateleiProektaStore.skritSpisok" />
    </q-card-section>

    <q-card-section>
      <q-spinner
          v-if="loaderSpiskaPolzovatei"
          color="primary"
          size="3em"
      />
      <template v-if="oshibkaZagruzkiSpiska">
        <div v-html="oshibkaZagruzkiSpiska"></div>
      </template>
      <q-list style="width: 300px" v-else>
        <q-item>
          <q-item-section>
            <q-select dense v-model="form.userId" option-value="id" :option-label="(item: Polzovatel) => item.nickname ? item.nickname : item.email" map-options
                      :options="polzovateliDlyDobavleniyaVProekt()" label="New user" emit-value/>
          </q-item-section>
          <q-item-section side>
            <q-btn size="md" color="black" icon="add" @click="dobavitPolzovatelyaVProekt" :loading="loaderDobavleniya">
              <q-tooltip>add user</q-tooltip>
            </q-btn>
          </q-item-section>
        </q-item>
        <q-item v-for="contact in spisok" :key="contact.userId" class="q-mb-sm" clickable v-ripple>
          <q-item-section avatar>
            <q-avatar color="primary" text-color="white">
              R
            </q-avatar>
          </q-item-section>

          <q-item-section>
            <q-item-label :class="{'text-strike':esliPolzovatelZablokirovan(contact.userId)}">{{poluchitEmailPolzovatelyaPoId(contact.userId) }}</q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-btn size="md" color="black" icon="delete" @click="udalit(contact.userId)" :loading="loaderUdaleniya">
              <q-tooltip>delete</q-tooltip>
            </q-btn>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>
  </q-card>

</template>

