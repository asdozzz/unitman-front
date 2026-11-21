<script setup lang="ts">
import {storeToRefs} from "pinia";
import {ref, watch} from "vue";
import {Notify} from "quasar";
import i18n from "@/bootstrap/translator";
import {useAuthStore} from "@/modules/account/store/auth";
import {storePolucheniyaProekta} from "@/modules/unit/store/SpisokProektov/StorPolucheniyaProekta";
import {useStorZashishennyhVetok} from "@/modules/unit/store/SpisokProektov/StorZashishennyhVetok";
import {OshibkaMaski, proveritMaskuVetki} from "@/modules/unit/utils/zashishennieVetki";

const authStore = useAuthStore();
const {isAdmin} = storeToRefs(authStore);

const storeProekta = storePolucheniyaProekta();
const {proekt} = storeToRefs(storeProekta);

const stor = useStorZashishennyhVetok();
const {loader, oshibkaOtBackenda, spisok} = storeToRefs(stor);

const lokalnayaOshibka = ref<string | null>(null);

type NewValueDone = (value?: string, mode?: 'add' | 'add-unique' | 'toggle') => void;

watch(
    () => proekt.value?.zashishennieVetki,
    (vetki) => stor.ustanovitSpisok(vetki ?? []),
    {immediate: true},
);

function tekstOshibkiMaski(kod: OshibkaMaski): string {
  switch (kod) {
    case 'empty':
      return i18n.global.t('unit.proekt.zashishennie_vetki.validation.empty');
    case 'too_long':
      return i18n.global.t('unit.proekt.zashishennie_vetki.validation.too_long');
    case 'duplicate':
      return i18n.global.t('unit.proekt.zashishennie_vetki.validation.duplicate');
    case 'too_many':
      return i18n.global.t('unit.proekt.zashishennie_vetki.validation.too_many');
    default:
      return '';
  }
}

function dobavitMasku(value: string, done: NewValueDone): void {
  const oshibka = proveritMaskuVetki(value, spisok.value);
  if (oshibka) {
    lokalnayaOshibka.value = tekstOshibkiMaski(oshibka);
    return;
  }

  lokalnayaOshibka.value = null;
  done(value.trim());
}

async function sohranit(): Promise<void> {
  const id = proekt.value?.id;
  if (!id) {
    return;
  }

  lokalnayaOshibka.value = null;
  const response = await stor.sohranit(id);

  if (response.status === "success") {
    Notify.create({message: i18n.global.t('common.notifications.success'), type: 'positive', timeout: 100});
    await storeProekta.poluchitProekt(id);
  }
}
</script>

<template>
  <q-card v-if="isAdmin" class="q-mt-md" style="width: 500px; max-width: 80vw;">
    <q-card-section>
      <div class="text-h6">{{ $t('unit.proekt.zashishennie_vetki.title') }}</div>
      <div class="text-caption text-grey q-mb-sm">{{ $t('unit.proekt.zashishennie_vetki.hint') }}</div>

      <q-select
          v-model="spisok"
          use-input
          use-chips
          multiple
          hide-selected
          fill-input
          @new-value="dobavitMasku"
      />

      <div v-if="lokalnayaOshibka" class="text-negative text-caption">{{ lokalnayaOshibka }}</div>
      <div v-if="spisok.length === 0" class="text-grey text-caption">{{ $t('unit.proekt.zashishennie_vetki.empty') }}</div>
      <div class="text-negative" v-if="oshibkaOtBackenda" v-html="oshibkaOtBackenda"></div>

      <q-btn
          :label="$t('unit.proekt.zashishennie_vetki.buttons.save')"
          color="primary"
          class="q-mt-sm"
          :loading="loader"
          @click="sohranit"
      />
    </q-card-section>
  </q-card>
</template>

<style scoped>

</style>
