<script setup lang="ts">
import {onMounted} from "vue";
import {storeToRefs} from "pinia";
import {
  useFormaZapolneniyaPeremenihUnitaStore
} from "@/modules/unit/store/SpisokUnitov/FormaZapolneniyaPeremenihUnitStore";
import PeremenayaKonfiga from "@/modules/unit/view/Unit/Konfig/PeremenayaKonfiga.vue";
import FaylVoluma from "@/modules/unit/view/Unit/Konfig/FaylVoluma.vue";

const formStore = useFormaZapolneniyaPeremenihUnitaStore();
const { form, oshibkaOtBackenda, loader } = storeToRefs(formStore);

onMounted(async () => {
  await formStore.poluchitPeremenieUnita();
})

const emit = defineEmits<{
  formaBilaOtpravlena: []
}>()

async function otpravitFormu() {
  const response = await formStore.otpravitFormu();

  if (response.status === "success") {
    emit('formaBilaOtpravlena');
    formStore.zakritFormu();
  }
}

</script>

<template>
  <q-card  style="width: 700px; max-width: 80vw;">
    <q-card-section>
      <div class="text-h6">Set Config Variables</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <div class="flex flex-center" v-if="loader">
        <q-spinner  color="primary" size="3em"/>
      </div>
      <template v-else>
        <template v-for="peremenaya in form.values" :key="peremenaya.konfig.id">
          <PeremenayaKonfiga :peremenaya="peremenaya"/>
        </template>

        <template v-if="form.volumes.length > 0">
          <div class="text-subtitle1 q-mt-md">{{ $t('unit.form_volume.title') }}</div>
          <template v-for="volume in form.volumes" :key="volume.volume.dir">
            <FaylVoluma
                :volume="volume"
                @zagruzit="formStore.zagruzitFaylToma"
                @udalit="formStore.udalitFaylToma"
                @vibrat="formStore.vibratFaylProekta"
                @ochistit="formStore.ochistitFaylToma"
            />
          </template>
        </template>
      </template>

      <div class="text-negative" v-if="oshibkaOtBackenda" v-html="oshibkaOtBackenda"></div>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn label="OK" color="primary" @click="otpravitFormu" :loading="loader"/>
      <q-btn label="Close" color="dark" @click="formStore.zakritFormu()" :loading="loader"/>
    </q-card-actions>
  </q-card>
</template>
