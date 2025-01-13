<script setup lang="ts">
import { useCentrifugo } from "@/bootstrap/centrifugeClient";
import {useSpisokUnitovStore} from "@/modules/unit/store/SpisokUnitovStore";
import {storeToRefs} from "pinia";
import {onMounted} from "vue";
import FormaSozdaniyaUnita from "@/modules/unit/view/Unit/FormaSozdaniyaUnita.vue";
import {useFormaDobavleniyaUnitaStore} from "@/modules/unit/store/SpisokUnitov/FormaDobavleniyaUnitaStore";
import {
  useFormaZapolneniyaPeremenihUnitaStore
} from "@/modules/unit/store/SpisokUnitov/FormaZapolneniyaPeremenihUnitStore";
import FormaZapolneniyaPeremenihUnita from "@/modules/unit/view/Unit/FormaZapolneniyaPeremenihUnita.vue";
import {storFormiIzmeneniyaVetkiUnita} from "@/modules/unit/store/SpisokUnitov/StorFormiIzmeneniyaVetkiUnita";
import FormaIzmeneniyaVetkiUnita from "@/modules/unit/view/Unit/FormaIzmeneniyaVetkiUnita.vue";
import UnitCard from "@/modules/unit/view/Unit/SpisokUnitov/UnitCard.vue";
import {ModelForChannelSpisokUnitov} from "@/modules/unit/model/websocket/ModelForChannelSpisokUnitov";
import FormaDeistviyUnita from "@/modules/unit/view/Unit/FormaDeistviyUnita.vue";
import {storFormiDeistviyUnita} from "@/modules/unit/store/SpisokUnitov/StorFormiDeistviy";

const unitiStore = useSpisokUnitovStore();
const { spisok, oshibkaZagruzkiSpiska, nastroikiSpiska, proekti } = storeToRefs(unitiStore);

const addFormStore = useFormaDobavleniyaUnitaStore();
const { enable: enableAddForm } = storeToRefs(addFormStore);

const konfigFormStore = useFormaZapolneniyaPeremenihUnitaStore();
const { enable: enableKonfigForm } = storeToRefs(konfigFormStore);

const storFormiIzmeneniyaVetki = storFormiIzmeneniyaVetkiUnita();
const { enable: enableIzmenenieVetki } = storeToRefs(storFormiIzmeneniyaVetki);

const storFormiDeistviy = storFormiDeistviyUnita();
const { enable: enableFormiDeistviya } = storeToRefs(storFormiDeistviy);

function openAddForm() {
  addFormStore.otkritFormu();
}

onMounted(async () => {
  unitiStore.poluchitMoiProekti();
  unitiStore.poluchitSpisokUnitov();

  const centrifuge = useCentrifugo();
  const unitSub = centrifuge.newSubscription('spisok_unitov');
  unitSub.on('publication', (ctx) => {
    handleWebsocketEvent(ctx.data as ModelForChannelSpisokUnitov);

  });
  unitSub.subscribe();

  centrifuge.connect();
})

function handleWebsocketEvent(event: ModelForChannelSpisokUnitov) {
  console.log(event.eventType, event);
  switch (event.eventType) {
    case 'OBNOVLEN':
    case 'OBNOVLENA_STATA':
      if (unitiStore.issetUnit(event.id)) {
          unitiStore.obnovitUnit(event.id);
      }
    break;
    case 'UDALEN':
      unitiStore.udalitUnitIzSpiska(event.id);
    break;
    case 'SOZDAN':
      unitiStore.poluchitSpisokUnitov();
    break;
  }
}

</script>

<template>

  <div class="full-width flex column">

    <div class="row wrap items-start content-start q-pb-md">

     <div class="col-auto">
        <q-input style="width: 335px"
            dense outlined v-model="nastroikiSpiska.filter.name"  :label="$t('unit.spisok_unitov.filter.unit_name')" @update:model-value="unitiStore.poluchitSpisokUnitov()"/>
      </div>
      <div class="col-auto q-pl-md">
        <q-input style="width: 335px"
            dense outlined v-model="nastroikiSpiska.filter.branch" :label="$t('unit.spisok_unitov.filter.branch')" @update:model-value="unitiStore.poluchitSpisokUnitov()"/>
      </div>

      <div class="col-auto q-pl-md">
        <q-select style="width: 335px"
            dense outlined v-model="nastroikiSpiska.filter.projectId" @update:model-value="unitiStore.poluchitSpisokUnitov()"
                  :options="proekti.spisok" :label="$t('unit.spisok_unitov.filter.project')" emit-value map-options clearable/>
      </div>

      <div class="col-auto q-pl-md">
        <div style="width: 335px">
          <q-toggle
              stye="float:right"
              v-model="nastroikiSpiska.filter.onlyMine"
              :label="$t('unit.spisok_unitov.filter.only_mine')"
              @update:model-value="unitiStore.poluchitSpisokUnitov()"
          />

          <q-btn class="q-ml-md" size="md" color="primary" icon="refresh" @click="unitiStore.poluchitSpisokUnitov()">
            <q-tooltip>{{$t('unit.spisok_unitov.buttons.refresh')}}</q-tooltip>
          </q-btn>

          <q-btn class="q-ml-md" size="md" color="primary" icon="add" @click="openAddForm">
            <q-tooltip>{{$t('unit.spisok_unitov.buttons.add')}}</q-tooltip>
          </q-btn>

        </div>
      </div>
    </div>

    <div class="row wrap items-start content-start">
      <template v-if="oshibkaZagruzkiSpiska">
        <div v-html="oshibkaZagruzkiSpiska"></div>
      </template>
      <template v-else>
        <div v-if="spisok.length === 0">{{$t('unit.spisok_unitov.list.empty_result')}}</div>
        <template v-for="item in spisok" :key="'unit_card'+item.id">
          <UnitCard :item="item" ></UnitCard>
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
      <q-dialog v-model="enableFormiDeistviya" persistent transition-show="scale" transition-hide="scale">
        <FormaDeistviyUnita @formaBilaOtpravlena="unitiStore.poluchitSpisokUnitov()"/>
      </q-dialog>
    </div>
  </div>

</template>

<style scoped>

</style>
