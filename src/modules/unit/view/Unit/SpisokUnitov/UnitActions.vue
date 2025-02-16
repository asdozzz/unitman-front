<script setup lang="ts">
import Unit, {Deistviye} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import { useRouter } from 'vue-router'
import {storeToRefs} from "pinia";
import {useSpisokUnitovStore} from "@/modules/unit/store/SpisokUnitovStore";
import {
  useFormaZapolneniyaPeremenihUnitaStore
} from "@/modules/unit/store/SpisokUnitov/FormaZapolneniyaPeremenihUnitStore";
import {useAuthStore} from "@/modules/account/store/auth";
import {storFormiDeistviyUnita} from "@/modules/unit/store/SpisokUnitov/StorFormiDeistviy";

defineProps<{
  item: Unit,
}>();

const router = useRouter();

const unitiStore = useSpisokUnitovStore();
const { getUnitLoader, showForceRemove, esliZapushen,getUserRoleByProjectIdAndUserId } = storeToRefs(unitiStore);

const konfigFormStore = useFormaZapolneniyaPeremenihUnitaStore();

const storFormaDeistviy = storFormiDeistviyUnita();

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

async function obnovitKodPosleZapuska(id: string) {
  await unitiStore.obnovitKodPosleZapuska(id);
}

async function udalitUnitPosleZapuska(id: string) {
  await unitiStore.udalitUnitPosleZapuska(id);
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

async function ustanovitResultatDeistviya(id: string) {
  await unitiStore.ustanovitResultatDeistviya(id);
}

async function proveritKonteinerUnita(id: string) {
  await unitiStore.proveritKonteinerUnita(id);
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

function pokazatFormuDeistviya(id: string, deistviye: Deistviye) {
  storFormaDeistviy.otkritFormu(id, deistviye);
}

async function udalitSlomaniiUnit(id: string) {
  await unitiStore.udalitSlomaniiUnit(id);
}

function otkritOknoSZadachamiRunnera(id: string) {
  router.push({ name: 'unit_jobs', params: { id }});
}

/*
const storFormiIzmeneniyaVetki = storFormiIzmeneniyaVetkiUnita();
function otkritFormuIzmeneniyaVetkiUnita(unit: Unit) {
  storFormiIzmeneniyaVetki.otkritFormu(unit)
}
*/

const authStore = useAuthStore();
const { userId, isAdmin } = storeToRefs(authStore);

</script>

<template>
  <template v-if="item.unitSozdanSystemoi || userId === item.authorId || getUserRoleByProjectIdAndUserId(item.projectId, userId as string) === 'ADMIN'">
    <q-btn size="sm" color="black" icon="info" @click="otkritOknoSZadachamiRunnera(item.id)">
      <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.jobs')}}</q-tooltip>
    </q-btn>
    <q-btn size="md" color="black" v-if="item.waitResultFromRunner" icon="refresh" @click="obnovit(item.id)" :loading="getUnitLoader(item.id)">
      <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.update')}}</q-tooltip>
    </q-btn>
    <template v-for="command in item.commands">
      <q-btn v-if="command === 'nachatUdalenie' || isAdmin" size="sm" color="black" icon="delete" @click="udalit(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.delete')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'nachatUdaleniePosleZapuska'" size="sm" color="black" icon="delete" @click="udalitUnitPosleZapuska(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.delete')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'ustanovitResultatUdaleniya'" size="sm" color="black" icon="sync" @click="ustanovitResultatUdaleniyaMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.sync')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'nachatSborku'" size="md" color="black" icon="build" @click="sobrat(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.build')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'ustanovitResultatSborki'" size="sm" color="black" icon="sync" @click="ustanovitResultatSborkiMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.sync')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'nachatObnovlenie'" size="sm" color="black" icon="update" @click="obnovitKodMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.fetch_changes')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'nachatObnovleniePosleZapuska'" size="sm" color="black" icon="update" @click="obnovitKodPosleZapuska(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.fetch_changes')}}</q-tooltip>
      </q-btn>

      <q-btn v-if="command === 'ustanovitResultatObnovleniya'" size="sm" color="black" icon="sync" @click="ustanovitResultatObnovleniya(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.sync')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'zapolnitPeremenie'" size="sm" color="black" icon="settings" @click="zapolnitPeremenie(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.set_config')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'nachatPodgotovku'" size="md" color="black" icon="done_all" @click="podgotovitMoiUnit(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.preparing')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'ustanovitResultatPodgotovki'" size="sm" color="black" icon="sync" @click="ustanovitResultatPodgovkiMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.sync')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'nachatSbrosPodgotovki'" size="sm" color="black" icon="remove_done" @click="sbrositPodgotovkuMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.remove_preparing')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'ustanovitResultatSbrosaPodgotovki'" size="sm" color="black" icon="sync" @click="ustanovitResultatSbrosaPodgotovkiMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.sync')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'nachatZapusk'" size="md" color="black" icon="play_arrow" @click="zapustitMoiUnit(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.up')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'ustanovitResultatZapuska'" size="sm" color="black" icon="sync" @click="ustanovitResultatZapuskaMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.sync')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'nachatOstanovku'" size="sm" color="black" icon="stop" @click="ostanovitMoiUnit(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.down')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'ustanovitResultatOstanovki'" size="sm" color="black" icon="sync" @click="ustanovitResultatOstanovkiMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.sync')}}</q-tooltip>
      </q-btn>
<!--      <q-btn v-if="command === 'nachatIzmenenieVetki'" size="sm" color="black" icon="account_tree" @click="otkritFormuIzmeneniyaVetkiUnita(item)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.change_branch')}}</q-tooltip>
      </q-btn>-->
      <q-btn v-if="command === 'ustanovitResultatDeistviya'" size="sm" color="black" icon="sync" @click="ustanovitResultatDeistviya(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.sync')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'proveritKonteinerUnita'" size="sm" color="black" icon="sync" @click="proveritKonteinerUnita(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.check_container')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'vipolnitDeistvie' && item.deistviya.length > 0" size="sm" color="black" icon="apps" :loading="getUnitLoader(item.id)">
        <q-menu>
          <q-list>
            <template :key="actionConfig.id" v-for="actionConfig in item.deistviya">
              <q-item clickable v-close-popup @click="pokazatFormuDeistviya(item.id, actionConfig)">
                <q-item-section>
                  <q-item-label>{{ actionConfig.name }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-list>
        </q-menu>
      </q-btn>
    </template>
    <q-btn v-if="showForceRemove(item)" size="sm" color="black" icon="delete" @click="udalitSlomaniiUnit(item.id)" :loading="getUnitLoader(item.id)">
      <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.delete')}}</q-tooltip>
    </q-btn>
    <q-btn v-if="esliZapushen(item)" size="sm" color="black" icon="settings" @click="zapolnitPeremenie(item.id)" :loading="getUnitLoader(item.id)">
      <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.set_config')}}</q-tooltip>
    </q-btn>

  </template>

</template>

<style scoped>

</style>
