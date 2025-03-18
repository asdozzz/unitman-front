<script setup lang="ts">
import {onMounted} from "vue";
import {storeDashborda} from "@/modules/app/store/DashboardStore";
import {storeToRefs} from "pinia";

const store = storeDashborda();
const { statistikaPoProektam, loaderStatistikiPoProektam, oshibkaStatistikiPoProektam, obshayaStata } = storeToRefs(store);

onMounted(() => {
  store.poluchitStatistikuPoProektam();
});

</script>

<template>
  <div class="full-width flex column">
    <div class="row wrap items-start content-start">
      <q-spinner
          v-if="loaderStatistikiPoProektam"
          color="primary"
          size="3em"
      />
      <template v-if="oshibkaStatistikiPoProektam">
        <div v-html="oshibkaStatistikiPoProektam"></div>
      </template>
      <template v-else>
        <q-card square class="q-ma-md" style="min-width: 350px">
          <q-card-section class="bg-primary text-white q-py-sm">
            <div class="text-h6">All projects</div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <div class="text-subtitle2">
              Total
              <q-badge align="middle">{{ obshayaStata.total }}</q-badge>
            </div>
            <div class="text-subtitle2">
              Active
              <q-badge align="middle">{{ obshayaStata.active }}</q-badge>
            </div>
            <div class="text-subtitle2">
              Deleted
              <q-badge align="middle">{{ obshayaStata.deleted }}</q-badge>
            </div>
          </q-card-section>
        </q-card>
        <template v-for="item in statistikaPoProektam">
          <q-card square class="q-ma-md" style="min-width: 350px">
            <q-card-section class="bg-primary text-white q-py-sm">
              <div class="text-h6">{{ item.projectName }}</div>
            </q-card-section>

            <q-card-section class="q-pt-none">
              <div class="text-subtitle2">
                Total
                <q-badge align="middle">{{ item.total }}</q-badge>
              </div>
              <div class="text-subtitle2">
                Active
                <q-badge align="middle">{{ item.active }}</q-badge>
              </div>
              <div class="text-subtitle2">
                Deleted
                <q-badge align="middle">{{ item.deleted }}</q-badge>
              </div>
            </q-card-section>
          </q-card>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>

</style>
