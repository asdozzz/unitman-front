<script setup lang="ts">
import {useSpisokProektovStore} from "@/modules/unit/store/SpisokProekotovStore";
import {useAddProjectFormStore} from "@/modules/unit/store/SpisokProektov/AddProjectFormStore";
import {storeToRefs} from "pinia";
import {onMounted} from "vue";
import AddForm from "@/modules/unit/view/Proekti/AddProjectForm.vue";
import {useRouter} from "vue-router";
import {storeHelper} from "@/modules/app/store/HelperStore";
import {copyToClipboard} from "quasar";

const helperStore = storeHelper();
const { baseUrl } = storeToRefs(helperStore);

const proektiStore = useSpisokProektovStore();
const { spisok, loaderSpiskaProektov, oshibkaZagruzkiSpiska, getProjectLoader, proektSloman, proektNeSobirali } = storeToRefs(proektiStore);

const addFormStore = useAddProjectFormStore();
const { enable: enableAddForm } = storeToRefs(addFormStore);

const router = useRouter();

onMounted(async () => {
  await proektiStore.poluchitSpisokProektov();
})
function openAddForm() {
  addFormStore.otkritFormu();
}

function openEditForm(id: string) {
  router.push({ name: 'project_edit', params: { id }});
}
function openJobs(id: string) {
  router.push({ name: 'project_jobs', params: { id }});
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

async function ochistit(id: string) {
  await proektiStore.ochistit(id);
}

</script>

<template>

  <div class="full-width full-height flex column">

    <div class="row">
      <div class="col q-pb-sm">
        <q-btn square padding="5px 6px" size="sm" color="primary" icon="add" @click="openAddForm">
          <q-tooltip>{{ $t('unit.spisok_proektov.buttons.add') }}</q-tooltip>
        </q-btn>
      </div>
    </div>
    <div class="row wrap items-start content-start">
      <q-spinner-cube
          v-if="loaderSpiskaProektov"
          color="primary"
          size="2em"
      />
      <template v-if="oshibkaZagruzkiSpiska">
        <div v-html="oshibkaZagruzkiSpiska"></div>
      </template>
      <template v-else>
        <template v-for="item in spisok">
          <q-card square class="q-mr-md q-mb-md" style="width: 350px">
            <q-card-section class="bg-primary text-white q-py-sm q-pl-sm">
              <div class="text-subtitle2 text-left"> {{ $t('unit.spisok_proektov.card_fields.project_name') }}: {{ item.name }}</div>
            </q-card-section>
            <q-card-section class="q-py-sm q-pl-sm">
              <div class="fs-12 text-left">{{ $t('unit.spisok_proektov.card_fields.project_id') }}: {{ item.id }}</div>
              <div class="fs-12 text-left">{{ $t('unit.spisok_proektov.card_fields.repo_id') }}: {{ item.repoId }}</div>
              <div class="fs-12 text-left">{{ $t('unit.spisok_proektov.card_fields.project_code') }}: {{ item.code }}</div>
              <div class="fs-12 text-left">{{ $t('unit.spisok_proektov.card_fields.main_branch') }}: {{ item.mainBranch }}</div>
              <div class="fs-12 text-left">{{ $t('unit.spisok_proektov.card_fields.state') }}: {{ item.state }}</div>
              <div class="fs-12 text-left">{{ $t('unit.spisok_proektov.card_fields.proxy_host') }}: {{ item.proxyHost }}</div>
              <div class="fs-12">
                <q-chip class="q-ml-none" dark square  color="primary" label="repository event handler" icon="content_copy" clickable @click="copyToClipboard(baseUrl+'/project/'+item.id+'/hook')">
                </q-chip>
              </div>
<!--              <div class="text-subtitle2 text-left">Build Info: {{ item.buildInfo }}</div>
              <div class="text-subtitle2 text-left">Remove Info: {{ item.removeInfo }}</div>-->
            </q-card-section>

            <q-inner-loading :showing="item.waitResultRunner || item.state === 'BUILD_PENDING'">
              <q-spinner-gears size="50px" color="primary" />
            </q-inner-loading>

            <q-separator />

           <q-card-actions>
             <q-btn size="sm" padding="5px 6px" square color="primary" v-if="!proektSloman(item.id)" icon="info" @click="openJobs(item.id)" :loading="getProjectLoader(item.id)">
               <q-tooltip>{{ $t('unit.spisok_proektov.buttons.jobs') }}</q-tooltip>
             </q-btn>
             <q-btn size="sm" padding="5px 6px" square color="primary" icon="layers_clear" @click="ochistit(item.id)">
               <q-tooltip>{{$t('unit.spisok_proektov.buttons.layers_clear')}}</q-tooltip>
             </q-btn>
              <q-btn size="sm" padding="5px 6px" square color="primary" v-if="!proektSloman(item.id)" icon="delete" @click="udalit(item.id)" :loading="getProjectLoader(item.id)">
                <q-tooltip>{{ $t('unit.spisok_proektov.buttons.delete') }}</q-tooltip>
              </q-btn>
             <q-btn size="sm" padding="5px 6px" square color="primary" v-if="proektSloman(item.id)" icon="delete" @click="udalitSlomaniiProekt(item.id)" :loading="getProjectLoader(item.id)">
               <q-tooltip>{{ $t('unit.spisok_proektov.buttons.delete_manually') }}</q-tooltip>
             </q-btn>
             <q-btn size="sm" padding="5px 6px" square color="primary" v-if="!proektSloman(item.id) && !item.isActive" icon="done" @click="aktivirovat(item.id)" :loading="getProjectLoader(item.id)">
               <q-tooltip>{{ $t('unit.spisok_proektov.buttons.activate') }}</q-tooltip>
             </q-btn>
             <q-btn size="sm" padding="5px 6px" square color="primary" v-if="!proektSloman(item.id) && item.isActive" icon="remove_done" @click="deaktivirovat(item.id)" :loading="getProjectLoader(item.id)">
               <q-tooltip>{{ $t('unit.spisok_proektov.buttons.deactivate') }}</q-tooltip>
             </q-btn>
             <q-btn size="sm" padding="5px 6px" square color="primary" v-if="!proektSloman(item.id)" icon="edit" @click="openEditForm(item.id)" :loading="getProjectLoader(item.id)">
               <q-tooltip>{{ $t('unit.spisok_proektov.buttons.edit') }}</q-tooltip>
             </q-btn>
             <q-btn size="sm" padding="5px 6px" square color="primary" v-if="!proektSloman(item.id) && proektNeSobirali(item.id)" icon="build" @click="sobrat(item.id)" :loading="getProjectLoader(item.id)">
               <q-tooltip>{{ $t('unit.spisok_proektov.buttons.build') }}</q-tooltip>
             </q-btn>
            </q-card-actions>
          </q-card>
        </template>
      </template>

      <q-dialog v-model="enableAddForm" persistent transition-show="scale" transition-hide="scale">
        <AddForm @formaBilaOtpravlena="proektiStore.poluchitSpisokProektov"/>
      </q-dialog>
    </div>
  </div>

</template>

<style scoped>

</style>
