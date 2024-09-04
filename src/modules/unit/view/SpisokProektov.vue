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

const proektiStore = useSpisokProektovStore();
const { spisok, loaderSpiskaProektov, oshibkaZagruzkiSpiska, getProjectLoader, proektSloman, proektNeSobirali } = storeToRefs(proektiStore);

const addFormStore = useAddProjectFormStore();
const { enable: enableAddForm } = storeToRefs(addFormStore);

const editFormStore = useEditProjectFormStore();
const { enable: enableEditForm } = storeToRefs(editFormStore);

const spisokPolzovateleiProektaStore = useSpisokPolzovateleiProektaStore();
const { enable: enableSpisokPolzovateleiProekta } = storeToRefs(spisokPolzovateleiProektaStore);

const spisokPeremenihProektaStore = useSpisokPeremenihProektaStore();
const { enable: enableSpisokPeremenih} = storeToRefs(spisokPeremenihProektaStore);

onMounted(async () => {
  await proektiStore.poluchitSpisokProektov();
})
function openAddForm() {
  addFormStore.otkritFormu();
}

function openEditForm(proekt: Proekt) {
  editFormStore.otkritFormu(new EditProjectForm(proekt.id, proekt.name, proekt.proxyHost))
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

</script>

<template>

  <div class="full-width flex column">
    <q-spinner
        v-if="loaderSpiskaProektov"
        color="primary"
        size="3em"
    />
    <div class="row wrap items-start content-start">
      <q-card class="q-mb-md">
        <q-card-section>
          <q-btn size="md" color="primary" icon="add" @click="openAddForm">
            <q-tooltip>add project</q-tooltip>
          </q-btn>
        </q-card-section>
      </q-card>
    </div>
    <div class="row wrap items-start content-start">
      <template v-if="oshibkaZagruzkiSpiska">
        <div v-html="oshibkaZagruzkiSpiska"></div>
      </template>
      <template v-else>
        <template v-for="item in spisok">
          <q-card class="q-mr-md">
            <q-card-section>
              <div class="text-h6 text-left">Project name: {{ item.name }}</div>

              <div class="text-subtitle2 text-left">Project id: {{ item.id }}</div>
              <div class="text-subtitle2 text-left">Repo id: {{ item.repoId }}</div>
              <div class="text-subtitle2 text-left">Project code: {{ item.code }}</div>
              <div class="text-subtitle2 text-left">Main branch: {{ item.mainBranch }}</div>
              <div class="text-subtitle2 text-left">State: {{ item.state }}</div>
<!--              <div class="text-subtitle2 text-left">Build Info: {{ item.buildInfo }}</div>
              <div class="text-subtitle2 text-left">Remove Info: {{ item.removeInfo }}</div>-->
            </q-card-section>

            <q-separator dark />

           <q-card-actions>
             <q-btn size="md" color="black" v-if="!proektSloman(item.id)" icon="manage_accounts" @click="pokazatSpisokPolzovatelei(item.id)">
               <q-tooltip>manage_accounts</q-tooltip>
             </q-btn>
              <q-btn size="md" color="black" v-if="!proektSloman(item.id)" icon="delete" @click="udalit(item.id)" :loading="getProjectLoader(item.id)">
                <q-tooltip>delete</q-tooltip>
              </q-btn>
             <q-btn size="md" color="black" v-if="proektSloman(item.id)" icon="delete" @click="udalitSlomaniiProekt(item.id)" :loading="getProjectLoader(item.id)">
               <q-tooltip>delete manually</q-tooltip>
             </q-btn>
             <q-btn size="md" color="black" v-if="!proektSloman(item.id) && !item.isActive" icon="done" @click="aktivirovat(item.id)" :loading="getProjectLoader(item.id)">
               <q-tooltip>activate</q-tooltip>
             </q-btn>
             <q-btn size="md" color="black" v-if="!proektSloman(item.id) && item.isActive" icon="remove_done" @click="deaktivirovat(item.id)" :loading="getProjectLoader(item.id)">
               <q-tooltip>deactivate</q-tooltip>
             </q-btn>
             <q-btn size="md" color="black" v-if="!proektSloman(item.id)" icon="edit" @click="openEditForm(item)" :loading="getProjectLoader(item.id)">
               <q-tooltip>edit</q-tooltip>
             </q-btn>
             <q-btn size="md" color="black" v-if="!proektSloman(item.id) && proektNeSobirali(item.id)" icon="build" @click="sobrat(item.id)" :loading="getProjectLoader(item.id)">
               <q-tooltip>build</q-tooltip>
             </q-btn>
             <q-btn size="md" color="black" icon="list" v-if="!proektSloman(item.id)" @click="pokazatSpisokPeremenihProekta(item)">
               <q-tooltip>variables</q-tooltip>
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
