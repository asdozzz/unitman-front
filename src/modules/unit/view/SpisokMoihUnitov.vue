<script setup lang="ts">
import {useSpisokUnitovStore} from "@/modules/unit/store/SpisokUnitovStore";
import {storeToRefs} from "pinia";
import {onMounted, onBeforeUnmount} from "vue";
import FormaSozdaniyaUnita from "@/modules/unit/view/Unit/FormaSozdaniyaUnita.vue";
import {useFormaDobavleniyaUnitaStore} from "@/modules/unit/store/SpisokUnitov/FormaDobavleniyaUnitaStore";
import {
  useFormaZapolneniyaPeremenihUnitaStore
} from "@/modules/unit/store/SpisokUnitov/FormaZapolneniyaPeremenihUnitStore";
import FormaZapolneniyaPeremenihUnita from "@/modules/unit/view/Unit/FormaZapolneniyaPeremenihUnita.vue";
import {storVipolnenihZadachRunnera} from "@/modules/unit/store/SpisokUnitov/StorVipolnenihZadachRunnera";
import OknoVipolnenihZadachRunnera from "@/modules/unit/view/Unit/OknoVipolnenihZadachRunnera.vue";

const unitiStore = useSpisokUnitovStore();
const { spisok, loaderSpiskaUnitov, oshibkaZagruzkiSpiska, getUnitLoader, showForceRemove } = storeToRefs(unitiStore);

const addFormStore = useFormaDobavleniyaUnitaStore();
const { enable: enableAddForm } = storeToRefs(addFormStore);

const konfigFormStore = useFormaZapolneniyaPeremenihUnitaStore();
const { enable: enableKonfigForm } = storeToRefs(konfigFormStore);

const storeVipolnenihZadach = storVipolnenihZadachRunnera();
const { enable: pokazanoOknoVipolnenihZadachRunnera } = storeToRefs(storeVipolnenihZadach);

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

async function udalitSlomaniiUnit(id: string) {
  await unitiStore.udalitSlomaniiUnit(id);
}

async function otkritOknoSZadachamiRunnera(id: string) {
  await storeVipolnenihZadach.otkritOkno(id)
}

onMounted(async () => {
  await unitiStore.poluchitSpisokUnitov();

  unitiStore.zapustitObrabotkuOcherediNaObnovlenie();
})

onBeforeUnmount(() => {
  unitiStore.ostanovitObrabotkuOcherediNaObnovlenie();
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
          <q-card class="q-mr-md" style="min-width: 330px">
            <q-card-section>
              <div class="text-h6 text-left" v-if="!item.url">
                <span :class="{'text-red-8':item.error, 'text-green-7':!item.error}">
                  {{ item.name }}.{{ item.projectName }}
                </span>
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
              <q-btn size="sm" color="black" icon="info" @click="otkritOknoSZadachamiRunnera(item.id)">
                <q-tooltip>jobs</q-tooltip>
              </q-btn>
              <q-btn size="md" color="black" v-if="item.waitResultFromRunner" icon="refresh" @click="obnovit(item.id)" :loading="getUnitLoader(item.id)">
                <q-tooltip>update</q-tooltip>
              </q-btn>
              <template v-for="command in item.commands">
                <q-btn v-if="command === 'nachatUdalenie'" size="sm" color="black" icon="delete" @click="udalit(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>delete</q-tooltip>
                </q-btn>
                <q-btn v-if="command === 'ustanovitResultatUdaleniya'" size="sm" color="black" icon="sync" @click="ustanovitResultatUdaleniyaMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>sync</q-tooltip>
                </q-btn>
                <q-btn v-if="command === 'nachatSborku'" size="md" color="black" icon="build" @click="sobrat(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>build</q-tooltip>
                </q-btn>
                <q-btn v-if="command === 'ustanovitResultatSborki'" size="sm" color="black" icon="sync" @click="ustanovitResultatSborkiMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>sync</q-tooltip>
                </q-btn>
                <q-btn v-if="command === 'nachatObnovlenie'" size="sm" color="black" icon="update" @click="obnovitKodMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>fetch changes</q-tooltip>
                </q-btn>
                <q-btn v-if="command === 'ustanovitResultatObnovleniya'" size="sm" color="black" icon="sync" @click="ustanovitResultatObnovleniya(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>sync</q-tooltip>
                </q-btn>
                <q-btn v-if="command === 'zapolnitPeremenie'" size="sm" color="black" icon="settings" @click="zapolnitPeremenie(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>set config</q-tooltip>
                </q-btn>
                <q-btn v-if="command === 'nachatPodgotovku'" size="md" color="black" icon="done_all" @click="podgotovitMoiUnit(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>preparing</q-tooltip>
                </q-btn>
                <q-btn v-if="command === 'ustanovitResultatPodgotovki'" size="sm" color="black" icon="sync" @click="ustanovitResultatPodgovkiMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>sync</q-tooltip>
                </q-btn>
                <q-btn v-if="command === 'nachatSbrosPodgotovki'" size="sm" color="black" icon="remove_done" @click="sbrositPodgotovkuMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>remove preparing</q-tooltip>
                </q-btn>
                <q-btn v-if="command === 'ustanovitResultatSbrosaPodgotovki'" size="sm" color="black" icon="sync" @click="ustanovitResultatSbrosaPodgotovkiMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>sync</q-tooltip>
                </q-btn>
                <q-btn v-if="command === 'nachatZapusk'" size="md" color="black" icon="play_arrow" @click="zapustitMoiUnit(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>up</q-tooltip>
                </q-btn>
                <q-btn v-if="command === 'ustanovitResultatZapuska'" size="sm" color="black" icon="sync" @click="ustanovitResultatZapuskaMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>sync</q-tooltip>
                </q-btn>
                <q-btn v-if="command === 'nachatOstanovku'" size="sm" color="black" icon="stop" @click="ostanovitMoiUnit(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>down</q-tooltip>
                </q-btn>
                <q-btn v-if="command === 'ustanovitResultatOstanovki'" size="sm" color="black" icon="sync" @click="ustanovitResultatOstanovkiMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
                  <q-tooltip>sync</q-tooltip>
                </q-btn>

              </template>
              <q-btn v-if="showForceRemove(item)" size="sm" color="black" icon="delete" @click="udalitSlomaniiUnit(item.id)" :loading="getUnitLoader(item.id)">
                <q-tooltip>delete</q-tooltip>
              </q-btn>
            </q-card-actions>
          </q-card>
        </template>
      </template>
      <q-dialog v-model="enableAddForm" persistent transition-show="scale" transition-hide="scale" backdrop-filter="blur(4px)">
        <FormaSozdaniyaUnita @formaBilaOtpravlena="unitiStore.poluchitSpisokUnitov()"/>
      </q-dialog>
      <q-dialog v-model="enableKonfigForm" persistent transition-show="scale" transition-hide="scale">
        <FormaZapolneniyaPeremenihUnita @formaBilaOtpravlena="unitiStore.poluchitSpisokUnitov()"/>
      </q-dialog>
      <OknoVipolnenihZadachRunnera v-if="pokazanoOknoVipolnenihZadachRunnera"/>
    </div>
  </div>

</template>

<style scoped>

</style>
