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
const { getUnitLoader, esliZapushen,getUserRoleByProjectIdAndUserId, esliJdemRunner } = storeToRefs(unitiStore);

const konfigFormStore = useFormaZapolneniyaPeremenihUnitaStore();

const storFormaDeistviy = storFormiDeistviyUnita();

async function sobrat(id: string) {
  await unitiStore.sobratMoiUnit(id);
}

async function obnovit(id: string) {
  await unitiStore.obnovitUnit(id);
}

async function obnovitKodMoegoUnita(id: string) {
  await unitiStore.obnovitKodMoegoUnita(id);
}

async function podgotovitMoiUnit(id: string) {
  await unitiStore.podgotovitMoiUnit(id);
}

async function sbrositPodgotovkuMoegoUnita(id: string) {
  await unitiStore.sbrositPodgotovkuMoegoUnita(id);
}

async function zapustitMoiUnit(id: string) {
  await unitiStore.zapustitMoiUnit(id);
}
async function proveritKonteinerUnita(id: string) {
  await unitiStore.proveritKonteinerUnita(id);
}

async function ostanovitMoiUnit(id: string) {
  await unitiStore.ostanovitMoiUnit(id);
}

function zapolnitPeremenie(id: string) {
  konfigFormStore.otkritFormu(id);
}

function pokazatFormuDeistviya(id: string, deistviye: Deistviye) {
  storFormaDeistviy.otkritFormu(id, deistviye);
}

function otkritOknoSZadachamiRunnera(id: string) {
  router.push({ name: 'unit_jobs', params: { id }});
}

const authStore = useAuthStore();
const { userId, isAdmin } = storeToRefs(authStore);

</script>

<template>
  <template v-if="item.unitSozdanSystemoi || userId === item.authorId || getUserRoleByProjectIdAndUserId(item.projectId, userId as string) === 'ADMIN'">
    <q-btn square color="dark" padding="5px 6px" size="sm" icon="info" @click="otkritOknoSZadachamiRunnera(item.id)">
      <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.jobs')}}</q-tooltip>
    </q-btn>
    <q-btn size="md" square color="dark" padding="5px 6px" v-if="esliJdemRunner(item)" icon="refresh" @click="obnovit(item.id)" :loading="getUnitLoader(item.id)">
      <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.update')}}</q-tooltip>
    </q-btn>
    <template v-for="command in item.commands">
      <q-btn v-if="command === 'nachatSborku'" size="md" square color="dark" padding="5px 6px" icon="build" @click="sobrat(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.build')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'nachatObnovlenie'" size="sm" square color="dark" padding="5px 6px" icon="update" @click="obnovitKodMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.fetch_changes')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'nachatObnovleniePosleZapuska'" size="sm" square color="dark" padding="5px 6px" icon="update" @click="obnovitKodMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.fetch_changes')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'zapolnitPeremenie'" size="sm" square color="dark" padding="5px 6px" icon="settings" @click="zapolnitPeremenie(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.set_config')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'nachatPodgotovku'" size="md" square color="dark" padding="5px 6px" icon="done_all" @click="podgotovitMoiUnit(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.preparing')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'nachatSbrosPodgotovki'" size="sm" square color="dark" padding="5px 6px" icon="remove_done" @click="sbrositPodgotovkuMoegoUnita(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.remove_preparing')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'nachatZapusk'" size="md" square color="dark" padding="5px 6px" icon="play_arrow" @click="zapustitMoiUnit(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.up')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'nachatOstanovku'" size="sm" square color="dark" padding="5px 6px" icon="stop" @click="ostanovitMoiUnit(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.down')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'proveritKonteinerUnita' && isAdmin" size="sm" square color="dark" padding="5px 6px" icon="sync" @click="proveritKonteinerUnita(item.id)" :loading="getUnitLoader(item.id)">
        <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.check_container')}}</q-tooltip>
      </q-btn>
      <q-btn v-if="command === 'vipolnitDeistvie' && item.deistviya.length > 0" size="sm" square color="dark" padding="5px 6px" icon="apps" :loading="getUnitLoader(item.id)">
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
    <q-btn v-if="esliZapushen(item)" size="sm" square color="dark" padding="5px 6px" icon="settings" @click="zapolnitPeremenie(item.id)" :loading="getUnitLoader(item.id)">
      <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.set_config')}}</q-tooltip>
    </q-btn>
  </template>

</template>

<style scoped>

</style>
