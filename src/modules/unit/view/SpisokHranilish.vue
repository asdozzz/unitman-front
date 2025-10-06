<script setup lang="ts">
  import EditForm from "@/modules/unit/view/Hranilisha/EditForm.vue";
  import AddForm from "@/modules/unit/view/Hranilisha/AddForm.vue";
  import {useSpisokHranilishStore} from "@/modules/unit/store/SpisokHranilishStore";
  import {storeToRefs} from "pinia";
  import {onMounted} from "vue";
  import {useEditFormStore} from "@/modules/unit/store/SpisokHranilish/EditFormStore";
  import {useAddFormStore} from "@/modules/unit/store/SpisokHranilish/AddFormStore";
  import Hranilishe from "@/modules/unit/store/SpisokHranilish/model/Hranilishe";
  import { EditForm as EditFormModel } from '@/modules/unit/store/SpisokHranilish/EditFormStore';

  const hranilishaStore = useSpisokHranilishStore();
  const { spisok, loaderSpiskaHranilish, oshibkaZagruzkiSpiska } = storeToRefs(hranilishaStore);

  const editFormStore = useEditFormStore();
  const { enable: enableEditForm } = storeToRefs(editFormStore);

  const addFormStore = useAddFormStore();
  const { enable: enableAddForm } = storeToRefs(addFormStore);

  onMounted(async () => {
    await hranilishaStore.poluchitSpisokHranilish();
  })

  function confirm(repoId: string) {
    hranilishaStore.activirovatHranilishe(repoId);
  }

  function udalit(repoId: string) {
    hranilishaStore.udalitHranilishe(repoId);
  }

  function openEditForm(item: Hranilishe) {
    editFormStore.otkritFormu(new EditFormModel(item.id, item.token));
  }

  function openAddForm() {
    addFormStore.otkritFormu();
  }
</script>

<template>

  <div class="full-width flex column">

    <div class="row">
      <div class="col q-pb-sm">
        <q-btn padding="5px 6px" square size="sm" color="primary" icon="add" @click="openAddForm">
          <q-tooltip>{{ $t('unit.spisok_rep.buttons.add') }}</q-tooltip>
        </q-btn>
      </div>
    </div>
    <div class="row wrap items-start content-start">
      <q-spinner-cube
          v-if="loaderSpiskaHranilish"
          color="primary"
          size="2em"
      />
      <template v-else-if="oshibkaZagruzkiSpiska">
        <div v-html="oshibkaZagruzkiSpiska"></div>
      </template>
      <template v-else>

        <template v-for="item in spisok">
          <q-card square class="q-mr-md q-mb-md" style="width: 350px">
            <q-card-section class="bg-primary text-white q-py-sm q-pl-sm">
              <div class="text-subtitle2 text-left"> {{ item.name }}</div>
            </q-card-section>
            <q-card-section class="q-py-sm q-pl-sm">
              <div class="fs-12 text-left">{{ item.type }}</div>
              <div class="fs-12 text-left" v-if="item.type === 'GITLAB'">{{ item.repoUrl }}</div>
            </q-card-section>

            <q-separator />

            <q-card-actions>
              <q-btn padding="5px 6px" square size="sm" color="primary" icon="delete" @click="udalit(item.id)">
                <q-tooltip>{{ $t('unit.spisok_rep.buttons.delete')}}</q-tooltip>
              </q-btn>
              <q-btn padding="5px 6px" square size="sm" color="primary" icon="edit" @click="openEditForm(item)">
                <q-tooltip>{{ $t('unit.spisok_rep.buttons.edit')}}</q-tooltip>
              </q-btn>
              <q-btn padding="5px 6px" square size="sm" color="primary" icon="done" @click="confirm(item.id)" v-if="!item.confirmed">
                <q-tooltip>{{ $t('unit.spisok_rep.buttons.confirm')}}</q-tooltip>
              </q-btn>
            </q-card-actions>
          </q-card>
        </template>
      </template>

      <q-dialog v-model="enableEditForm" persistent transition-show="scale" transition-hide="scale">
        <EditForm @formaBilaOtpravlena="hranilishaStore.poluchitSpisokHranilish()"/>
      </q-dialog>
      <q-dialog v-model="enableAddForm" persistent transition-show="scale" transition-hide="scale">
        <AddForm @formaBilaOtpravlena="hranilishaStore.poluchitSpisokHranilish()"/>
      </q-dialog>
    </div>
  </div>

</template>

<style scoped>

</style>
