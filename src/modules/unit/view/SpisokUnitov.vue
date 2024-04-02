<script setup lang="ts">
import {useSpisokUnitovStore} from "@/modules/unit/store/SpisokUnitovStore";
import {storeToRefs} from "pinia";
import {onMounted} from "vue";
import FormaSozdaniyaUnita from "@/modules/unit/view/Unit/FormaSozdaniyaUnita.vue";
import {useFormaDobavleniyaUnitaStore} from "@/modules/unit/store/SpisokUnitov/FormaDobavleniyaUnitaStore";
import {
  useFormaZapolneniyaPeremenihUnitaStore
} from "@/modules/unit/store/SpisokUnitov/FormaZapolneniyaPeremenihUnitStore";
import FormaZapolneniyaPeremenihUnita from "@/modules/unit/view/Unit/FormaZapolneniyaPeremenihUnita.vue";

const unitiStore = useSpisokUnitovStore();
const { spisok, loaderSpiskaUnitov, oshibkaZagruzkiSpiska, getUnitLoader } = storeToRefs(unitiStore);

const addFormStore = useFormaDobavleniyaUnitaStore();
const { enable: enableAddForm } = storeToRefs(addFormStore);

const konfigFormStore = useFormaZapolneniyaPeremenihUnitaStore();
const { enable: enableKonfigForm } = storeToRefs(konfigFormStore);

function openAddForm() {
  addFormStore.otkritFormu();
}

async function sobrat(id: string) {
  await unitiStore.sobratMoiUnit(id);
}

async function ustanovitResultatSborkiMoegoUnita(id: string) {
  await unitiStore.ustanovitResultatSborkiMoegoUnita(id);
}

async function udalit(id: string) {
  await unitiStore.udalitMoiUnit(id);
}

async function ustanovitResultatUdaleniyaMoegoUnita(id: string) {
  await unitiStore.ustanovitResultatUdaleniyaMoegoUnita(id);
}

async function obnovit(id: string) {
  await unitiStore.obnovitUnit(id);
}

async function obnovitKodMoegoUnita(id: string) {
  await unitiStore.obnovitKodMoegoUnita(id);
}

async function ustanovitResultatObnovleniya(id: string) {
  await unitiStore.ustanovitResultatObnovleniyaMoegoUnita(id);
}

async function podgotovitMoiUnit(id: string) {
  await unitiStore.podgotovitMoiUnit(id);
}

async function ustanovitResultatPodgovkiMoegoUnita(id: string) {
  await unitiStore.ustanovitResultatPodgovkiMoegoUnita(id);
}

async function sbrositPodgotovkuMoegoUnita(id: string) {
  await unitiStore.sbrositPodgotovkuMoegoUnita(id);
}

async function ustanovitResultatSbrosaPodgotovkiMoegoUnita(id: string) {
  await unitiStore.ustanovitResultatSbrosaPodgotovkiMoegoUnita(id);
}

async function zapustitMoiUnit(id: string) {
  await unitiStore.zapustitMoiUnit(id);
}

async function ustanovitResultatZapuskaMoegoUnita(id: string) {
  await unitiStore.ustanovitResultatZapuskaMoegoUnita(id);
}

async function ostanovitMoiUnit(id: string) {
  await unitiStore.ostanovitMoiUnit(id);
}

async function ustanovitResultatOstanovkiMoegoUnita(id: string) {
  await unitiStore.ustanovitResultatOstanovkiMoegoUnita(id);
}
function zapolnitPeremenie(id: string) {
  konfigFormStore.otkritFormu(id);
}

async function udalitMoiSlomaniiUnit(id: string) {
  await unitiStore.udalitMoiSlomaniiUnit(id);
}

onMounted(async () => {
  await unitiStore.poluchitSpisokUnitov();

  unitiStore.zapustitObrabotkuOcherediNaObnovlenie();
})
</script>

<template>

  <div class="full-width flex column">
    <q-spinner
        v-if="loaderSpiskaUnitov"
        color="primary"
        size="3em"
    />
    <div class="row wrap items-start content-start">
      <q-card class="q-mb-md">
        <q-card-section>
          <q-btn class="q-mr-md" size="md" color="primary" icon="add" @click="openAddForm">
            <q-tooltip>add</q-tooltip>
          </q-btn>
          <q-btn size="md" color="primary" icon="refresh" @click="unitiStore.poluchitSpisokUnitov()">
            <q-tooltip>refresh</q-tooltip>
          </q-btn>
        </q-card-section>
      </q-card>
    </div>
    <div class="row wrap items-start content-start">
      <template v-if="oshibkaZagruzkiSpiska">
        <div v-html="oshibkaZagruzkiSpiska"></div>
      </template>
      <template v-else>
        <div v-if="spisok.length === 0">У вас пока нету юнитов</div>
        <template v-for="item in spisok">
          <q-card class="q-mr-md" style="width: 300px">
            <q-card-section>
              <div class="text-h6 text-left" v-if="!item.url">
                {{ item.name }}.{{ item.projectName }}
              </div>
              <div class="text-h6 text-left" v-else>
                <a :href="item.url" target="_blank">{{ item.name }}.{{ item.projectName }}</a>
              </div>
              <div class="text-subtitle2 text-left">Id: {{ item.id }}</div>
              <div class="text-subtitle2 text-left">Branch: {{ item.branch }}</div>
            </q-card-section>

            <q-inner-loading :showing="item.waitResultFromRunner">
              <q-spinner-gears size="50px" color="primary" />
            </q-inner-loading>

            <q-separator dark />
            <q-card-actions>
              <q-btn size="md" color="black" icon="refresh" @click="obnovit(item.id)" :loading="getUnitLoader(item.id)">
                <q-tooltip>update</q-tooltip>
              </q-btn>
              <template v-for="command in item.commands">

                <q-btn v-if="command === 'nachatUdalenie'" size="md" color="black" icon="delete" @click="udalit(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>delete</q-tooltip>
                </q-btn>
<!--                <q-btn v-if="command === 'ustanovitResultatUdaleniya'" size="md" color="black" icon="sync" @click="ustanovitResultatUdaleniyaMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>sync</q-tooltip>
                </q-btn>-->
                <q-btn v-if="command === 'nachatSborku'" size="lg" color="black" icon="build" @click="sobrat(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>build</q-tooltip>
                </q-btn>
<!--                <q-btn v-if="command === 'ustanovitResultatSborki'" size="md" color="black" icon="sync" @click="ustanovitResultatSborkiMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>sync</q-tooltip>
                </q-btn>-->
                <q-btn v-if="command === 'nachatObnovlenie'" size="md" color="black" icon="update" @click="obnovitKodMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>fetch changes</q-tooltip>
                </q-btn>
<!--                <q-btn v-if="command === 'ustanovitResultatObnovleniya'" size="md" color="black" icon="sync" @click="ustanovitResultatObnovleniya(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>sync</q-tooltip>
                </q-btn>-->
                <q-btn v-if="command === 'zapolnitPeremenie'" size="md" color="black" icon="settings" @click="zapolnitPeremenie(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>set config</q-tooltip>
                </q-btn>
                <q-btn v-if="command === 'nachatPodgotovku'" size="lg" color="black" icon="done_all" @click="podgotovitMoiUnit(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>preparing</q-tooltip>
                </q-btn>
<!--                <q-btn v-if="command === 'ustanovitResultatPodgotovki'" size="md" color="black" icon="sync" @click="ustanovitResultatPodgovkiMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>sync</q-tooltip>
                </q-btn>-->
                <q-btn v-if="command === 'nachatSbrosPodgotovki'" size="md" color="black" icon="remove_done" @click="sbrositPodgotovkuMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>remove preparing</q-tooltip>
                </q-btn>
<!--                <q-btn v-if="command === 'ustanovitResultatSbrosaPodgotovki'" size="md" color="black" icon="sync" @click="ustanovitResultatSbrosaPodgotovkiMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>sync</q-tooltip>
                </q-btn>-->
                <q-btn v-if="command === 'nachatZapusk'" size="lg" color="black" icon="play_arrow" @click="zapustitMoiUnit(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>up</q-tooltip>
                </q-btn>
<!--                <q-btn v-if="command === 'ustanovitResultatZapuska'" size="md" color="black" icon="sync" @click="ustanovitResultatZapuskaMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>sync</q-tooltip>
                </q-btn>-->
                <q-btn v-if="command === 'nachatOstanovku'" size="md" color="black" icon="stop" @click="ostanovitMoiUnit(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>down</q-tooltip>
                </q-btn>
<!--                <q-btn v-if="command === 'ustanovitResultatOstanovki'" size="md" color="black" icon="sync" @click="ustanovitResultatOstanovkiMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>sync</q-tooltip>
                </q-btn>-->
                <q-btn v-if="command === 'udalitVruchnuyu'" size="md" color="black" icon="delete" @click="udalitMoiSlomaniiUnit(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>delete</q-tooltip>
                </q-btn>
              </template>
            </q-card-actions>
          </q-card>
        </template>
      </template>
      <q-dialog v-model="enableAddForm" persistent transition-show="scale" transition-hide="scale">
        <FormaSozdaniyaUnita @formaBilaOtpravlena="unitiStore.poluchitSpisokUnitov()"/>
      </q-dialog>
      <q-dialog v-model="enableKonfigForm" persistent transition-show="scale" transition-hide="scale">
        <FormaZapolneniyaPeremenihUnita @formaBilaOtpravlena="unitiStore.poluchitSpisokUnitov()"/>
      </q-dialog>
    </div>
  </div>

</template>

<style scoped>

</style>
