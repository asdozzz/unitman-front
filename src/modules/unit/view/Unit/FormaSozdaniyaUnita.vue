<script setup lang="ts">
import {storeToRefs} from "pinia";
import {Notify} from "quasar";
import i18n from "@/bootstrap/translator";
import {useFormaDobavleniyaUnitaStore} from "@/modules/unit/store/SpisokUnitov/FormaDobavleniyaUnitaStore";
import {useSpisokUnitovStore} from "@/modules/unit/store/SpisokUnitovStore";
import PeremenayaKonfiga from "@/modules/unit/view/Unit/Konfig/PeremenayaKonfiga.vue";
import FaylVoluma from "@/modules/unit/view/Unit/Konfig/FaylVoluma.vue";
import type {Unit} from "@/modules/unit/store/SpisokUnitov/model/Unit";

const addFormStore = useFormaDobavleniyaUnitaStore();
const { form, oshibkaOtBackenda, loader, vetki, initPeremenie, dubli, vetkaZashishenaDlyaFormi } = storeToRefs(addFormStore);

const unitiStore = useSpisokUnitovStore();
const { proekti } = storeToRefs(unitiStore);

const emit = defineEmits<{
  formaBilaOtpravlena: []
}>()

async function otpravitFormu() {
  const response = await addFormStore.otpravitFormu();

  if (response.status === "success") {
    // Юнит создан штатно, но ветка защищена: редактирование файлов
    // в нём будет запрещено. Ничего не блокируем, только предупреждаем.
    if (response.data.vetkaZashishena) {
      Notify.create({
        type: 'warning',
        message: i18n.global.t('unit.form_add_unit.messages.vetka_zashishena_created'),
      });
    }

    emit('formaBilaOtpravlena');
    addFormStore.zakritFormu();
  }

}

function filterSpiskaVetok(val: string | null, update: any): void {
  vetki.value.query = val;
  update(() => addFormStore.poluchitVetki());
}

function vetkaVibrana(): void {
  addFormStore.poluchitPeremenieKonfiga()
  console.log("RRR", form.value.branch);
  if (form.value.branch) {
    addFormStore.naitiDubliUnita();
  } else {
    addFormStore.ochistitDubliUnita();
  }
}

function otkritStranizuSDublem(dubl: Unit): void {
  window.open('/unit/list?id='+dubl.id, "_blank");
}

function projectChanged() {
  addFormStore.poluchitVetki()

  const proekt = proekti.value.spisok.find(item => item.value === form.value.projectId);
  if (proekt) {
    form.value.memoryLimit = proekt.memoryLimit;
  }
}
</script>

<template>
  <q-card  style="width: 700px; max-width: 80vw;">
    <q-card-section>
      <div class="text-h6">{{ $t('unit.form_add_unit.caption') }}</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <q-select v-model="form.projectId"
                :options="proekti.spisok"
                :label="$t('unit.form_add_unit.fields.labels.project')"
                emit-value
                map-options
                @update:model-value="projectChanged"/>
      <q-select
          :loading="vetki.loader"
          v-model="form.branch"
          :options="vetki.spisok"
          @filter="filterSpiskaVetok"
          @update:model-value="vetkaVibrana"
          :label="$t('unit.form_add_unit.fields.labels.branch')"
          fill-input
          clearable
          use-input
          hide-selected
          emit-value
      >
        <template v-slot:no-option>
          <q-item>
            <q-item-section class="text-grey">
              {{ $t('common.no_results') }}
            </q-item-section>
          </q-item>
        </template>
      </q-select>
      <q-banner
          v-if="vetkaZashishenaDlyaFormi"
          class="bg-orange-1 text-warning q-mt-sm"
          rounded
          dense
      >
        <template v-slot:avatar>
          <q-icon name="lock" color="warning"/>
        </template>
        {{ $t('unit.form_add_unit.messages.vetka_zashishena') }}
      </q-banner>
      <div v-if="dubli.spisok.length > 0">
        <span class="text-negative">{{ $t('unit.form_add_unit.messages.duplicates') }} </span>
        <q-chip
            v-for="duble in dubli.spisok"
            size="12px"
            clickable
            color="primary"
            square
            text-color="white"
            :label="duble.name"
            @click="otkritStranizuSDublem(duble)"
        />
      </div>
      <q-input v-model="form.unitName" :label="$t('unit.form_add_unit.fields.labels.unitName')" />
      <q-input type="number" v-model.number="form.memoryLimit" :label="$t('unit.form_add_unit.fields.labels.unitContainerMemory')" />
      <template v-if="form.peremenieKonfiga.length > 0">
        <template v-for="peremenaya in form.peremenieKonfiga" :key="peremenaya.konfig.id">
          <PeremenayaKonfiga :peremenaya="peremenaya"/>
        </template>
      </template>
      <template v-if="form.volumes.length > 0">
        <div class="text-subtitle1 q-mt-md">{{ $t('unit.form_volume.title') }}</div>
        <template v-for="volume in form.volumes" :key="volume.volume.dir">
          <FaylVoluma
              :volume="volume"
              @zagruzit="addFormStore.zagruzitFaylToma"
              @udalit="addFormStore.udalitFaylToma"
              @vibrat="addFormStore.vibratFaylProekta"
              @ochistit="addFormStore.ochistitFaylToma"
          />
        </template>
      </template>
      <template v-if="initPeremenie && form.peremenieKonfiga.length == 0 && form.volumes.length == 0">
        {{ $t('unit.form_add_unit.messages.no_variables') }}
      </template>
      <div class="text-negative" v-if="oshibkaOtBackenda" v-html="oshibkaOtBackenda"></div>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn :label="$t('common.buttons.ok')" color="primary" @click="otpravitFormu" :loading="loader || dubli.loader"/>
      <q-btn :label="$t('common.buttons.close')" color="dark" @click="addFormStore.zakritFormu()" :loading="loader || dubli.loader"/>
    </q-card-actions>
  </q-card>
</template>
