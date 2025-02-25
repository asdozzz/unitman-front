<script setup lang="ts">
import {computed, ref} from 'vue'
import { fromUnixTime } from "date-fns";
import Unit from "@/modules/unit/store/SpisokUnitov/model/Unit";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const expanded = ref(false);
const props = defineProps<{
  item: Unit,
}>();

function convertDate(unixtime: number | null): string {
  if (!unixtime) return '';
  return dayjs(fromUnixTime(unixtime)).fromNow();
}

const itemHeaderClass = computed(() => {
  let headerColor = 'bg-blue-8';
  const timestamp = Math.floor(Date.now() / 1000);
  const week = 60*60*24*7;
  const week2 = 60*60*24*7*2;
  const month = 60*60*24*7*4;
  if (props.item.unixtimePoslednegoObnovleniyaUnita) {
    if (timestamp - props.item.unixtimePoslednegoObnovleniyaUnita > week) {
      headerColor = 'bg-indigo-8';
    }
    if (timestamp - props.item.unixtimePoslednegoObnovleniyaUnita > week2) {
      headerColor = 'bg-blue-grey-8';
    }
    if (timestamp - props.item.unixtimePoslednegoObnovleniyaUnita > month) {
      headerColor = 'bg-grey-8';
    }
  }

  let classHeader = '';

  if (props.item.error) {
    classHeader = 'bg-red text-white';
  } else {
    classHeader = `text-white ${headerColor}`;
  }

  return classHeader;
});

import UnitActions from "@/modules/unit/view/Unit/SpisokUnitov/UnitActions.vue";
</script>

<template>
  <q-card class="q-mr-md q-mb-md" style="width: 335px">
    <q-card-section class="q-py-xs q-px-sm" :class="itemHeaderClass">
      <div class="text-h6">
        {{ item.name }}.{{ item.projectName }}
      </div>
      <div class="text-subtitle2 fs-12">
        {{$t('unit.spisok_unitov.card.header.by')}} {{ item.authorName }}, {{$t('unit.spisok_unitov.card.header.updated_at')}} {{ convertDate(item.unixtimePoslednegoObnovleniyaUnita) }}
      </div>
    </q-card-section>
    <q-card-section class="q-pa-sm">
      <div class="text-left" v-if="item.links.length > 0">
        <template v-for="link in item.links">
          <template v-if="link.protocol === 'http' && item.state === 'USPESHNO_ZAPUSHEN'">
            <div class="text-italic fs-12">
              <a :href="link.path" target="_blank">{{ link.protocol }}://{{link.service}}:{{link.port}}{{link.startUri}}</a>
            </div>
          </template>
          <template v-else>
            <div class="text-italic fs-12">
              {{ link.protocol }}://{{link.service}}:{{link.port}}{{link.startUri}}
            </div>
          </template>
        </template>
      </div>
      <div class="text-left fs-12"><strong>{{$t('unit.spisok_unitov.card.fields.id')}}:</strong> {{ item.id }}</div>
      <div class="text-left fs-12"><strong>{{$t('unit.spisok_unitov.card.fields.branch')}}:</strong> {{ item.branch }}</div>
<!--      <div class="text-left fs-12"  v-if="item.statistikaKonteinera">
        <div class="row">
          <div class="col-3"><strong>cpu: {{item.statistikaKonteinera.cpuPercent}}</strong></div>
          <div class="col"><strong>mem: {{item.statistikaKonteinera.memoryUsage}} ( {{item.statistikaKonteinera.memoryPercent}} )</strong></div>
        </div>
      </div>-->
    </q-card-section>

    <q-inner-loading :showing="item.waitResultFromRunner || item.jdemObnovlenieKodaPosleZapuska || item.jdemUdaleniyaPosleZapuska || item.jdemAvtosborki">
      <q-spinner-gears size="50px" color="primary" />
    </q-inner-loading>

    <q-separator dark />
    <q-card-actions>
      <UnitActions :item="item"/>
      <q-space />
      <q-btn
          color="grey"
          round
          flat
          dense
          :icon="expanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'"
          @click="expanded = !expanded"
      >
        <q-tooltip>config variables</q-tooltip>
      </q-btn>
    </q-card-actions>
    <q-slide-transition>
      <div v-show="expanded">
        <q-separator />
        <q-card-section class="text-subtitle2">
          <template v-for="peremenaya in item.peremenie" :key="peremenaya.id">
            <div class="text-left" >{{ peremenaya.id }}: {{ peremenaya.value }}</div>
          </template>
        </q-card-section>
      </div>
    </q-slide-transition>
  </q-card>
</template>

<style scoped>
.fs-12 {
  font-size: 12px;
}
</style>
