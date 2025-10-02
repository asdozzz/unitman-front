<script setup lang="ts">
import {onMounted } from "vue";
import {storeToRefs} from "pinia";
import {useSpisokPolzovateleiProektaStore} from "@/modules/unit/store/SpisokProektov/SpisokPolzovateleiProektaStore";
import {useSpisokVsehPolzovateleiStore} from "@/modules/account/store/SpisokVsehPolzovateleiStore";

const spisokPolzovateleiProektaStore = useSpisokPolzovateleiProektaStore();
const { loaderSpiskaPolzovatei, oshibkaZagruzkiSpiska, loaderUdaleniya, loaderDobavleniya } = storeToRefs(spisokPolzovateleiProektaStore);

const spisokVsehPolzovateleiStore = useSpisokVsehPolzovateleiStore();
const { spisok: spisokVsehPolzovatelei } = storeToRefs(spisokVsehPolzovateleiStore)

onMounted(async () => {
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

</script>

<template>
  <q-card style="width: 700px;">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6">User list</div>
      <q-space />
      <q-btn icon="close" flat round dense @click="spisokPolzovateleiProektaStore.skritSpisok" />
    </q-card-section>

    <q-card-section>
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
          :label="item.nickname ? item.nickname : item.email"></q-chip>


<!--      <q-list style="width: 300px" v-else>
        <q-item>
          <q-item-section>
            <q-select dense v-model="form.userId" option-value="id" :option-label="(item: Polzovatel) => item.nickname ? item.nickname : item.email" map-options
                      :options="polzovateliDlyDobavleniyaVProekt()" label="New user" emit-value/>
          </q-item-section>
          <q-item-section side>
            <q-btn size="md" padding="5px 6px" color="dark" icon="add" @click="dobavitPolzovatelyaVProekt" :loading="loaderDobavleniya">
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
            <q-btn size="md" padding="5px 6px" color="dark" icon="delete" @click="udalit(contact.userId)" :loading="loaderUdaleniya">
              <q-tooltip>delete</q-tooltip>
            </q-btn>
          </q-item-section>
        </q-item>
      </q-list>-->
    </q-card-section>
  </q-card>

</template>

