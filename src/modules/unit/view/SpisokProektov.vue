<script setup lang="ts">
import {useSpisokProektovStore} from "@/modules/unit/store/SpisokProekotovStore";
import {useAddProjectFormStore} from "@/modules/unit/store/SpisokProektov/AddProjectFormStore";
import {EditProjectForm, useEditProjectFormStore} from "@/modules/unit/store/SpisokProektov/EditProjectFormStore";
import {storeToRefs} from "pinia";
import {onMounted} from "vue";
import AddForm from "@/modules/unit/view/Proekti/AddProjectForm.vue";
import EditForm from "@/modules/unit/view/Proekti/EditProjectForm.vue";
import Proekt from "@/modules/unit/store/SpisokProektov/model/Proekt";
import SpisokPolzovateleiProekta from "@/modules/unit/view/Proekti/SpisokPolzovateleiProekta.vue";
import {useSpisokPolzovateleiProektaStore} from "@/modules/unit/store/SpisokProektov/SpisokPolzovateleiProektaStore";
import {useSpisokPeremenihProektaStore} from "@/modules/unit/store/SpisokProektov/SpisokPeremenihProektaStore";
import SpisokPeremenihProekta from "@/modules/unit/view/Proekti/SpisokPeremenihProekta.vue";
import FormaObnovleniyaNastroekHuka from "@/modules/unit/view/Proekti/FormaObnovleniyaNastroekHuka.vue";
import {
  HookSettingsForm,
  storeObnovleniyaNastroekHuka
} from "@/modules/unit/store/SpisokProektov/StoreObnovleniyaNastroekHuka";
import {useRouter} from "vue-router";

const proektiStore = useSpisokProektovStore();
const { spisok, loaderSpiskaProektov, oshibkaZagruzkiSpiska, getProjectLoader, proektSloman, proektNeSobirali } = storeToRefs(proektiStore);

const addFormStore = useAddProjectFormStore();
const { enable: enableAddForm } = storeToRefs(addFormStore);

const editFormStore = useEditProjectFormStore();
const { enable: enableEditForm } = storeToRefs(editFormStore);

const hookSettingsStore = storeObnovleniyaNastroekHuka();
const { enable: enableHookSettingsForm } = storeToRefs(hookSettingsStore);

const spisokPolzovateleiProektaStore = useSpisokPolzovateleiProektaStore();
const { enable: enableSpisokPolzovateleiProekta } = storeToRefs(spisokPolzovateleiProektaStore);

const spisokPeremenihProektaStore = useSpisokPeremenihProektaStore();
const { enable: enableSpisokPeremenih} = storeToRefs(spisokPeremenihProektaStore);

const router = useRouter();

onMounted(async () => {
  await proektiStore.poluchitSpisokProektov();
})
function openAddForm() {
  addFormStore.otkritFormu();
}

function openEditForm(proekt: Proekt) {
  editFormStore.otkritFormu(new EditProjectForm(proekt.id, proekt.name, proekt.proxyHost))
}

function openHookSettingsForm(proekt: Proekt) {
  hookSettingsStore.otkritFormu(new HookSettingsForm(proekt.id, proekt.nastroikiHukaProekta.avtosozdanie, proekt.nastroikiHukaProekta.avtoobnovlenie, proekt.nastroikiHukaProekta.avtoudalenie, proekt.nastroikiHukaProekta.obnovlenieBezSbrosaPodgotovki))
}

function pokazatSpisokPolzovatelei(id: string) {
  spisokPolzovateleiProektaStore.pokazatSpisok(id);
}

function pokazatSpisokPeremenihProekta(proekt: Proekt) {
  spisokPeremenihProektaStore.pokazatSpisok(proekt.id);
}

async function udalit(id: string) {
  await proektiStore.udalitProekt(id);
}

async function udalitSlomaniiProekt(id: string) {
  await proektiStore.udalitSlomaniiProekt(id);
}

async function aktivirovat(id: string) {
  await proektiStore.aktivirovat(id);
}

async function deaktivirovat(id: string) {
  await proektiStore.deaktivirovat(id);
}

async function sobrat(id: string) {
  await proektiStore.sobrat(id);
}

function otkritOknoSZadachamiRunnera(id: string) {
  router.push({ name: 'project_jobs', params: { id }});
}

async function ochistit(id: string) {
  await proektiStore.ochistit(id);
}

</script>

<template>

  <div class="full-width flex column">
    <q-spinner
        v-if="loaderSpiskaProektov"
        color="primary"
        size="3em"
    />
    <div class="row">
      <div class="col q-pb-sm">
        <q-btn square padding="5px 6px" size="md" color="primary" icon="add" @click="openAddForm">
          <q-tooltip>{{ $t('unit.spisok_proektov.buttons.add') }}</q-tooltip>
        </q-btn>
      </div>
    </div>
    <div class="row wrap items-start content-start">
      <template v-if="oshibkaZagruzkiSpiska">
        <div v-html="oshibkaZagruzkiSpiska"></div>
      </template>
      <template v-else>
        <template v-for="item in spisok">
          <q-card square class="q-mr-md q-mb-md" style="width: 350px">
            <q-card-section class="bg-primary text-white q-py-sm">
              <div class="text-subtitle2 text-left"> {{ $t('unit.spisok_proektov.card_fields.project_name') }}: {{ item.name }}</div>
            </q-card-section>
            <q-card-section class="q-py-sm">
              <div class="fs-12 text-left">{{ $t('unit.spisok_proektov.card_fields.project_id') }}: {{ item.id }}</div>
              <div class="fs-12 text-left">{{ $t('unit.spisok_proektov.card_fields.repo_id') }}: {{ item.repoId }}</div>
              <div class="fs-12 text-left">{{ $t('unit.spisok_proektov.card_fields.project_code') }}: {{ item.code }}</div>
              <div class="fs-12 text-left">{{ $t('unit.spisok_proektov.card_fields.main_branch') }}: {{ item.mainBranch }}</div>
              <div class="fs-12 text-left">{{ $t('unit.spisok_proektov.card_fields.state') }}: {{ item.state }}</div>
<!--              <div class="text-subtitle2 text-left">Build Info: {{ item.buildInfo }}</div>
              <div class="text-subtitle2 text-left">Remove Info: {{ item.removeInfo }}</div>-->
            </q-card-section>

            <q-inner-loading :showing="item.waitResultRunner">
              <q-spinner-gears size="50px" color="primary" />
            </q-inner-loading>

            <q-separator dark />

           <q-card-actions>

             <q-btn size="sm" padding="5px 6px" square color="black" icon="info" @click="otkritOknoSZadachamiRunnera(item.id)">
               <q-tooltip>{{$t('unit.spisok_proektov.buttons.jobs')}}</q-tooltip>
             </q-btn>

             <q-btn size="sm" padding="5px 6px" square color="black" v-if="!proektSloman(item.id)" icon="manage_accounts" @click="pokazatSpisokPolzovatelei(item.id)">
               <q-tooltip>{{ $t('unit.spisok_proektov.buttons.manage_accounts') }}</q-tooltip>
             </q-btn>
             <q-btn size="sm" padding="5px 6px" square color="black" icon="layers_clear" @click="ochistit(item.id)">
               <q-tooltip>{{$t('unit.spisok_proektov.buttons.layers_clear')}}</q-tooltip>
             </q-btn>
              <q-btn size="sm" padding="5px 6px" square color="black" v-if="!proektSloman(item.id)" icon="delete" @click="udalit(item.id)" :loading="getProjectLoader(item.id)">
                <q-tooltip>{{ $t('unit.spisok_proektov.buttons.delete') }}</q-tooltip>
              </q-btn>
             <q-btn size="sm" padding="5px 6px" square color="black" v-if="proektSloman(item.id)" icon="delete" @click="udalitSlomaniiProekt(item.id)" :loading="getProjectLoader(item.id)">
               <q-tooltip>{{ $t('unit.spisok_proektov.buttons.delete_manually') }}</q-tooltip>
             </q-btn>
             <q-btn size="sm" padding="5px 6px" square color="black" v-if="!proektSloman(item.id) && !item.isActive" icon="done" @click="aktivirovat(item.id)" :loading="getProjectLoader(item.id)">
               <q-tooltip>{{ $t('unit.spisok_proektov.buttons.activate') }}</q-tooltip>
             </q-btn>
             <q-btn size="sm" padding="5px 6px" square color="black" v-if="!proektSloman(item.id) && item.isActive" icon="remove_done" @click="deaktivirovat(item.id)" :loading="getProjectLoader(item.id)">
               <q-tooltip>{{ $t('unit.spisok_proektov.buttons.deactivate') }}</q-tooltip>
             </q-btn>
             <q-btn size="sm" padding="5px 6px" square color="black" v-if="!proektSloman(item.id)" icon="edit" @click="openEditForm(item)" :loading="getProjectLoader(item.id)">
               <q-tooltip>{{ $t('unit.spisok_proektov.buttons.edit') }}</q-tooltip>
             </q-btn>
             <q-btn size="sm" padding="5px 6px" square color="black" v-if="!proektSloman(item.id)" icon="settings" @click="openHookSettingsForm(item)" :loading="getProjectLoader(item.id)">
               <q-tooltip>{{ $t('unit.spisok_proektov.buttons.hook_settings') }}</q-tooltip>
             </q-btn>
             <q-btn size="sm" padding="5px 6px" square color="black" v-if="!proektSloman(item.id) && proektNeSobirali(item.id)" icon="build" @click="sobrat(item.id)" :loading="getProjectLoader(item.id)">
               <q-tooltip>{{ $t('unit.spisok_proektov.buttons.build') }}</q-tooltip>
             </q-btn>
             <q-btn size="sm" padding="5px 6px" square color="black" icon="list" v-if="!proektSloman(item.id)" @click="pokazatSpisokPeremenihProekta(item)">
               <q-tooltip>{{ $t('unit.spisok_proektov.buttons.variables') }}</q-tooltip>
             </q-btn>
            </q-card-actions>
          </q-card>
        </template>
      </template>

      <q-dialog v-model="enableAddForm" persistent transition-show="scale" transition-hide="scale">
        <AddForm @formaBilaOtpravlena="proektiStore.poluchitSpisokProektov"/>
      </q-dialog>
      <q-dialog v-model="enableEditForm" persistent transition-show="scale" transition-hide="scale">
        <EditForm @formaBilaOtpravlena="proektiStore.poluchitSpisokProektov"/>
      </q-dialog>
      <q-dialog v-model="enableHookSettingsForm" persistent transition-show="scale" transition-hide="scale">
        <FormaObnovleniyaNastroekHuka @formaBilaOtpravlena="proektiStore.poluchitSpisokProektov"/>
      </q-dialog>
      <q-dialog v-model="enableSpisokPolzovateleiProekta" persistent transition-show="scale" transition-hide="scale">
        <SpisokPolzovateleiProekta/>
      </q-dialog>
      <q-dialog v-model="enableSpisokPeremenih" persistent transition-show="scale" transition-hide="scale">
        <SpisokPeremenihProekta/>
      </q-dialog>
    </div>
  </div>

</template>

<style scoped>

</style>
