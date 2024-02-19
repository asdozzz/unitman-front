<script setup lang="ts">
  import {useSpisokUnitovStore} from "@/modules/unit/store/SpisokUnitovStore";
  import {storeToRefs} from "pinia";
  import {onMounted} from "vue";

  const unitiStore = useSpisokUnitovStore();
  const { spisok, loaderSpiskaUnitov, oshibkaZagruzkiSpiska } = storeToRefs(unitiStore);

  onMounted(async () => {
    await unitiStore.poluchitSpisokUnitov();
  })
</script>

<template>

  <div class="full-width flex column">
    <q-spinner
        v-if="loaderSpiskaUnitov"
        color="primary"
        size="3em"
    />
<!--    <div class="row wrap items-start content-start">
      <q-card class="q-mb-md">
        <q-card-section>
          <q-btn size="md" color="primary" icon="add" @click="openAddForm">
            <q-tooltip>add</q-tooltip>
          </q-btn>
        </q-card-section>
      </q-card>
    </div>-->
    <div class="row wrap items-start content-start">
      <template v-if="oshibkaZagruzkiSpiska">
        <div v-html="oshibkaZagruzkiSpiska"></div>
      </template>
      <template v-else>

        <template v-for="item in spisok">
          <q-card class="q-mr-md" style="width: 300px">
            <q-card-section>
              <div class="text-h6 text-left">Unit Name: {{ item.name }}</div>
              <div class="text-subtitle2 text-left">Project Name: {{ item.projectName }}</div>
              <div class="text-subtitle2 text-left">Branch: {{ item.branch }}</div>
              <div class="text-subtitle2 text-left">Author Id: {{ item.authorId }}</div>
              <div class="text-subtitle2 text-left" style="word-break: break-word;">State: {{ item.state }}</div>
              <div class="text-subtitle2 text-left">Wait Result: {{ item.waitResultFromRunner }}</div>
            </q-card-section>

            <q-separator dark />

<!--            <q-card-actions>
              <q-btn size="md" color="black" icon="delete" @click="udalit(item.id)">
                <q-tooltip>delete</q-tooltip>
              </q-btn>
              <q-btn size="md" color="black" icon="edit" @click="openEditForm(item)">
                <q-tooltip>edit</q-tooltip>
              </q-btn>
              <q-btn size="md" color="black" icon="done" @click="confirm(item.id)" v-if="!item.confirmed">
                <q-tooltip>confirm</q-tooltip>
              </q-btn>
            </q-card-actions>-->
          </q-card>
        </template>
      </template>

<!--      <q-dialog v-model="enableEditForm" persistent transition-show="scale" transition-hide="scale">
        <EditForm @formaBilaOtpravlena="unitiStore.poluchitSpisokUnitov()"/>
      </q-dialog>
      <q-dialog v-model="enableAddForm" persistent transition-show="scale" transition-hide="scale">
        <AddForm @formaBilaOtpravlena="unitiStore.poluchitSpisokUnitov()"/>
      </q-dialog>-->
    </div>
  </div>

</template>

<style scoped>

</style>
