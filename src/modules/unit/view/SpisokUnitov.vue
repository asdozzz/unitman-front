<script setup lang="ts">
import {useSpisokUnitovStore} from "@/modules/unit/store/SpisokUnitovStore";
import {storeToRefs} from "pinia";
import {onMounted, onBeforeUnmount} from "vue";
import FormaSozdaniyaUnita from "@/modules/unit/view/Unit/FormaSozdaniyaUnita.vue";
import UnitActions from "@/modules/unit/view/Unit/SpisokUnitov/UnitActions.vue";
import {useFormaDobavleniyaUnitaStore} from "@/modules/unit/store/SpisokUnitov/FormaDobavleniyaUnitaStore";
import {
  useFormaZapolneniyaPeremenihUnitaStore
} from "@/modules/unit/store/SpisokUnitov/FormaZapolneniyaPeremenihUnitStore";
import FormaZapolneniyaPeremenihUnita from "@/modules/unit/view/Unit/FormaZapolneniyaPeremenihUnita.vue";
import {storVipolnenihZadachRunnera} from "@/modules/unit/store/SpisokUnitov/StorVipolnenihZadachRunnera";
import OknoVipolnenihZadachRunnera from "@/modules/unit/view/Unit/OknoVipolnenihZadachRunnera.vue";

const unitiStore = useSpisokUnitovStore();
const { spisok, oshibkaZagruzkiSpiska, nastroikiSpiska } = storeToRefs(unitiStore);

const addFormStore = useFormaDobavleniyaUnitaStore();
const { enable: enableAddForm } = storeToRefs(addFormStore);

const konfigFormStore = useFormaZapolneniyaPeremenihUnitaStore();
const { enable: enableKonfigForm } = storeToRefs(konfigFormStore);

const storeVipolnenihZadach = storVipolnenihZadachRunnera();
const { enable: pokazanoOknoVipolnenihZadachRunnera } = storeToRefs(storeVipolnenihZadach);

function openAddForm() {
  addFormStore.otkritFormu();
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
          <q-card class="q-mr-md q-mb-md" style="min-width: 330px">
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
              <div class="text-subtitle2 text-left">Author: {{ item.authorName }}</div>
            </q-card-section>

            <q-inner-loading :showing="item.waitResultFromRunner">
              <q-spinner-gears size="50px" color="primary" />
            </q-inner-loading>

            <q-separator dark />
            <q-card-actions>
                <UnitActions :item="item"/>
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
