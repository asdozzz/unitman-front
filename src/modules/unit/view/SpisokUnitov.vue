<script setup lang="ts">
import {useSpisokUnitovStore} from "@/modules/unit/store/SpisokUnitovStore";
import {storeToRefs} from "pinia";
import {onMounted, onUnmounted} from "vue";
import FormaSozdaniyaUnita from "@/modules/unit/view/Unit/FormaSozdaniyaUnita.vue";
import {useFormaDobavleniyaUnitaStore} from "@/modules/unit/store/SpisokUnitov/FormaDobavleniyaUnitaStore";
import {
  useFormaZapolneniyaPeremenihUnitaStore
} from "@/modules/unit/store/SpisokUnitov/FormaZapolneniyaPeremenihUnitStore";
import FormaZapolneniyaPeremenihUnita from "@/modules/unit/view/Unit/FormaZapolneniyaPeremenihUnita.vue";
import UnitCard from "@/modules/unit/view/Unit/SpisokUnitov/UnitCard.vue";
import {ModelForChannelSpisokUnitov} from "@/modules/unit/model/websocket/ModelForChannelSpisokUnitov";
import {podpisatsyaNaSobitiyaUnitov} from "@/modules/unit/model/websocket/PodpiskaNaSobitiyaUnitov";
import FormaDeistviyUnita from "@/modules/unit/view/Unit/FormaDeistviyUnita.vue";
import {storFormiDeistviyUnita} from "@/modules/unit/store/SpisokUnitov/StorFormiDeistviy";
import {useRoute} from "vue-router";

const unitiStore = useSpisokUnitovStore();
const { spisok, oshibkaZagruzkiSpiska, nastroikiSpiska, proekti, nazvanieUnitaPoId } = storeToRefs(unitiStore);

const addFormStore = useFormaDobavleniyaUnitaStore();
const { enable: enableAddForm } = storeToRefs(addFormStore);

const konfigFormStore = useFormaZapolneniyaPeremenihUnitaStore();
const { enable: enableKonfigForm } = storeToRefs(konfigFormStore);

const storFormiDeistviy = storFormiDeistviyUnita();
const { enable: enableFormiDeistviya } = storeToRefs(storFormiDeistviy);

function openAddForm() {
  addFormStore.otkritFormu();
}


/**
 * Отписка от канала событий юнитов.
 *
 * Подписка общая с окном задач runner'а, поэтому создаётся и снимается
 * через модуль-реестр, а не напрямую через клиент Centrifugo.
 */
let otpisatsyaOtSobitiy: (() => void) | null = null;

onMounted(async () => {
  const route = useRoute();
  if (route.query.id) {
    nastroikiSpiska.value.filter.unitId = route.query.id as string;
  }

  unitiStore.poluchitMoiProekti();
  unitiStore.poluchitSpisokUnitov();

  otpisatsyaOtSobitiy = podpisatsyaNaSobitiyaUnitov(handleWebsocketEvent);
})

onUnmounted(() => {
  otpisatsyaOtSobitiy?.();
  otpisatsyaOtSobitiy = null;
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

function clearUnitIdFilter() {
  nastroikiSpiska.value.filter.unitId = null;
  unitiStore.poluchitSpisokUnitov();
}

/** Подпись чипа фильтра связей: имя юнита из кеша либо его идентификатор. */
function podpisSvyazi(unitId: string): string {
  return nazvanieUnitaPoId.value(unitId) ?? unitId;
}

function clearSvyaziFilter() {
  unitiStore.ochistitSvyaziUnita();
}

async function udalitSvyazIzFiltra(unitId: string) {
  await unitiStore.perekluchitSvyazUnita(unitId);
}

</script>

<template>

  <div class="full-width flex column">

    <div class="row wrap items-start content-start q-pb-md">

     <div class="col-auto">
        <q-input square style="width: 235px"
            dense outlined v-model="nastroikiSpiska.filter.name"  :label="$t('unit.spisok_unitov.filter.unit_name')" @update:model-value="unitiStore.poluchitSpisokUnitov()"/>
      </div>
      <div class="col-auto q-pl-md">
        <q-input square style="width: 235px"
            dense outlined v-model="nastroikiSpiska.filter.branch" :label="$t('unit.spisok_unitov.filter.branch')" @update:model-value="unitiStore.poluchitSpisokUnitov()"/>
      </div>

      <div class="col-auto q-pl-md">
        <q-select square style="width: 235px"
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

          <q-btn square padding="7px 7px" class="q-ml-md" size="md" color="primary" icon="refresh" @click="unitiStore.poluchitSpisokUnitov()">
            <q-tooltip>{{$t('unit.spisok_unitov.buttons.refresh')}}</q-tooltip>
          </q-btn>

          <q-btn square padding="7px 7px" class="q-ml-md" size="md" color="primary" icon="add" @click="openAddForm">
            <q-tooltip>{{$t('unit.spisok_unitov.buttons.add')}}</q-tooltip>
          </q-btn>

        </div>
      </div>
    </div>
    <div class="q-mb-md" v-if="nastroikiSpiska.filter.unitId">
      <q-chip
          removable
          color="primary"
          square
          text-color="white"
          :label="'id: '+ nastroikiSpiska.filter.unitId"
          @remove="clearUnitIdFilter"
      />
    </div>
    <div class="q-mb-md row items-center q-gutter-xs" v-if="nastroikiSpiska.filter.unitIds.length > 0">
      <span class="fs-12 text-grey-8">{{ $t('unit.spisok_unitov.filter.svyazi') }}:</span>
      <q-chip
          v-for="unitId in nastroikiSpiska.filter.unitIds"
          :key="'svyaz_filter_' + unitId"
          removable
          square
          color="primary"
          text-color="white"
          icon="link"
          :label="podpisSvyazi(unitId)"
          @remove="udalitSvyazIzFiltra(unitId)"
      />
      <q-btn flat dense size="sm" color="primary" icon="clear" @click="clearSvyaziFilter">
        <q-tooltip>{{ $t('unit.spisok_unitov.filter.clear_svyazi') }}</q-tooltip>
      </q-btn>
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
      <q-dialog v-model="enableFormiDeistviya" persistent transition-show="scale" transition-hide="scale">
        <FormaDeistviyUnita @formaBilaOtpravlena="unitiStore.poluchitSpisokUnitov()"/>
      </q-dialog>
    </div>
  </div>

</template>

<style scoped>

</style>
