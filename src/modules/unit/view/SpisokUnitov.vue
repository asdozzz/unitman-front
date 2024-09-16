<script setup lang="ts">
import { useCentrifugo } from "@/bootstrap/centrifugeClient";
import {useSpisokUnitovStore} from "@/modules/unit/store/SpisokUnitovStore";
import {storeToRefs} from "pinia";
import {onMounted, onBeforeUnmount} from "vue";
import FormaSozdaniyaUnita from "@/modules/unit/view/Unit/FormaSozdaniyaUnita.vue";
import {useFormaDobavleniyaUnitaStore} from "@/modules/unit/store/SpisokUnitov/FormaDobavleniyaUnitaStore";
import {
  useFormaZapolneniyaPeremenihUnitaStore
} from "@/modules/unit/store/SpisokUnitov/FormaZapolneniyaPeremenihUnitStore";
import FormaZapolneniyaPeremenihUnita from "@/modules/unit/view/Unit/FormaZapolneniyaPeremenihUnita.vue";
import {storFormiIzmeneniyaVetkiUnita} from "@/modules/unit/store/SpisokUnitov/StorFormiIzmeneniyaVetkiUnita";
import FormaIzmeneniyaVetkiUnita from "@/modules/unit/view/Unit/FormaIzmeneniyaVetkiUnita.vue";
import UnitCard from "@/modules/unit/view/Unit/SpisokUnitov/UnitCard.vue";

const unitiStore = useSpisokUnitovStore();
const { spisok, oshibkaZagruzkiSpiska, nastroikiSpiska } = storeToRefs(unitiStore);

const addFormStore = useFormaDobavleniyaUnitaStore();
const { enable: enableAddForm } = storeToRefs(addFormStore);

const konfigFormStore = useFormaZapolneniyaPeremenihUnitaStore();
const { enable: enableKonfigForm } = storeToRefs(konfigFormStore);

const storFormiIzmeneniyaVetki = storFormiIzmeneniyaVetkiUnita();
const { enable: enableIzmenenieVetki } = storeToRefs(storFormiIzmeneniyaVetki);

function openAddForm() {
  addFormStore.otkritFormu();
}

onMounted(async () => {
  await unitiStore.poluchitMoiProekti();
  await unitiStore.poluchitSpisokUnitov();
  unitiStore.zapustitObrabotkuOcherediNaObnovlenie();

  const centrifuge = useCentrifugo();
  const unitSub = centrifuge.newSubscription('units');
  console.log("unitSub", unitSub);
  unitSub.on('publication', (ctx) => {
    console.log("publication", ctx);
  });
  unitSub.subscribe();

  centrifuge.connect();
})

onBeforeUnmount(() => {
  unitiStore.ostanovitObrabotkuOcherediNaObnovlenie();
})
</script>

<template>

  <div class="full-width flex column">

    <div class="row wrap items-start content-start q-pb-md">
      <div class="col-auto">
        <q-btn class="q-mr-md" size="md" color="primary" icon="add" @click="openAddForm">
          <q-tooltip>add</q-tooltip>
        </q-btn>
        <q-btn size="md" color="primary" icon="refresh" @click="unitiStore.poluchitSpisokUnitov()">
          <q-tooltip>refresh</q-tooltip>
        </q-btn>

      </div>
      <div class="col-auto">
        <q-toggle
            v-model="nastroikiSpiska.filter.onlyMine"
            label="Only Mine"
            @update:model-value="unitiStore.poluchitSpisokUnitov()"
        />
      </div>
      <div class="col q-px-md">
        <q-input dense outlined v-model="nastroikiSpiska.filter.name" label="Unit Name" @update:model-value="unitiStore.poluchitSpisokUnitov()"/>
      </div>
      <div class="col">
        <q-input dense outlined v-model="nastroikiSpiska.filter.branch" label="Branch" @update:model-value="unitiStore.poluchitSpisokUnitov()"/>
      </div>

      <div class="col"></div>
    </div>

    <div class="row wrap items-start content-start">
      <template v-if="oshibkaZagruzkiSpiska">
        <div v-html="oshibkaZagruzkiSpiska"></div>
      </template>
      <template v-else>
        <div v-if="spisok.length === 0">У вас пока нету юнитов</div>
        <template v-for="item in spisok">
          <UnitCard :item="item"></UnitCard>
        </template>
      </template>
      <q-dialog v-model="enableAddForm" persistent transition-show="scale" transition-hide="scale" backdrop-filter="blur(4px)">
        <FormaSozdaniyaUnita @formaBilaOtpravlena="unitiStore.poluchitSpisokUnitov()"/>
      </q-dialog>
      <q-dialog v-model="enableKonfigForm" persistent transition-show="scale" transition-hide="scale">
        <FormaZapolneniyaPeremenihUnita @formaBilaOtpravlena="unitiStore.poluchitSpisokUnitov()"/>
      </q-dialog>
      <q-dialog v-model="enableIzmenenieVetki" persistent transition-show="scale" transition-hide="scale">
        <FormaIzmeneniyaVetkiUnita @formaBilaOtpravlena="unitiStore.poluchitSpisokUnitov()"/>
      </q-dialog>
    </div>
  </div>

</template>

<style scoped>

</style>
