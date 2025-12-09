<script setup lang="ts">
import {storeToRefs} from "pinia";
import {
  FormaProektovPolzovatelyaStore
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaProektovPolzovatelyaStore";
import {onMounted} from "vue";

const storProektov = FormaProektovPolzovatelyaStore();
const { proekti, moi, loader, oshibkaOtBeka } = storeToRefs(storProektov);

const props = defineProps<{
  id: string
}>();

onMounted(() => {
  storProektov.poluchitSpisokActivnih();
  storProektov.poluchitProektiPolzovatelya(props.id);
})

function esliVibran(id: string): boolean {
  return moi.value.includes(id);
}

function toggle(id: string) {
  if (esliVibran(id)) {
    storProektov.udalitIzProekta(id, props.id);
  } else {
    storProektov.dobavitVProekt(id, props.id)
  }
}

</script>

<template>
  <q-card>
    <q-card-section class="q-pb-none">
      <div class="text-h6">{{$t('account.form_projects.projects')}}</div>
    </q-card-section>
    <q-card-section class="q-pa-sm">
      <p class="text-negative" v-if="oshibkaOtBeka">{{oshibkaOtBeka}}</p>
      <q-chip
          :disable="loader"
          dark
          :color="esliVibran(proekt.id) ? 'positive':'primary'"
          v-for="proekt in proekti"
          :label="proekt.name"
          square
          clickable
          :selected="esliVibran(proekt.id)"
          @click="toggle(proekt.id)"
      ></q-chip>
    </q-card-section>
  </q-card>

</template>

<style scoped>

</style>
