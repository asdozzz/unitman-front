<script setup lang="ts">
import {onMounted } from "vue";
import {storeToRefs} from "pinia";
import {useSpisokPolzovateleiProektaStore} from "@/modules/unit/store/SpisokProektov/SpisokPolzovateleiProektaStore";
import {useSpisokVsehPolzovateleiStore} from "@/modules/account/store/SpisokVsehPolzovateleiStore";
import {useRoute} from "vue-router";
import Polzovatel from "@/modules/account/store/SpisokVsehPolzovatelei/model/Polzovatel";

const spisokPolzovateleiProektaStore = useSpisokPolzovateleiProektaStore();
const { loaderSpiskaPolzovatei, oshibkaZagruzkiSpiska, loaderUdaleniya, loaderDobavleniya } = storeToRefs(spisokPolzovateleiProektaStore);

const spisokVsehPolzovateleiStore = useSpisokVsehPolzovateleiStore();
const { spisok: spisokVsehPolzovatelei } = storeToRefs(spisokVsehPolzovateleiStore)

const route = useRoute();

onMounted(async () => {
  spisokPolzovateleiProektaStore.pokazatSpisok(route.params.id as string)
  await spisokVsehPolzovateleiStore.poluchitVsehPolzovatelei();
  await spisokPolzovateleiProektaStore.poluchitSpisok();
})

function esliVibran(userId: string): boolean {
  return spisokPolzovateleiProektaStore.spisokIdPolzovatelei.includes(userId)
}

function toggleUser(userId: string): void {
  if (esliVibran(userId)) {
    udalit(userId)
  } else {
    dobavit(userId)
  }
}

async function udalit(userId: string) {
  await spisokPolzovateleiProektaStore.udalitPolzovatelyaIzProekta(userId);
}

async function dobavit(userId: string) {
  await spisokPolzovateleiProektaStore.dobavitPolzovatelya(userId);
}

function getLabel(item: Polzovatel): string {
  let result = item.email;

  if (item.nickname) {
    result += ' ('+item.nickname+')';
  }

  return result;
}

</script>

<template>
  <q-spinner-cube
      v-if="loaderSpiskaPolzovatei"
      color="primary"
      size="2em"
  />
  <template v-else-if="oshibkaZagruzkiSpiska">
    <div v-html="oshibkaZagruzkiSpiska"></div>
  </template>
  <q-chip
      v-for="item in spisokVsehPolzovatelei"
      :color="esliVibran(item.id) ? 'positive' : 'primary'"
      clickable
      @click="toggleUser(item.id)"
      :disable="loaderDobavleniya || loaderUdaleniya"
      dark
      square
      :selected="esliVibran(item.id)"
      :label="getLabel(item)"></q-chip>

</template>

