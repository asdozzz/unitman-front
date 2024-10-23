<script setup lang="ts">
import { ref } from 'vue'
import { format, fromUnixTime } from "date-fns";
import Unit from "@/modules/unit/store/SpisokUnitov/model/Unit";

function convertDate(unixtime: number | null): string {
  if (!unixtime) return '';
  return format(fromUnixTime(unixtime), 'dd.MM.yyy H:mm:ss');
}

const expanded = ref(false);
defineProps<{
  item: Unit,
}>();
import UnitActions from "@/modules/unit/view/Unit/SpisokUnitov/UnitActions.vue";
</script>

<template>
  <q-card class="q-mr-md q-mb-md" style="min-width: 350px">
    <q-card-section class="bg-primary text-white q-py-xs q-px-sm" :class="{'bg-red text-white':item.error, 'bg-primary text-white':!item.error}">
      <div class="text-h6">
        {{ item.name }}.{{ item.projectName }}
      </div>
      <div class="text-subtitle2 fs-12">
        {{$t('unit.spisok_unitov.card.header.by')}} {{ item.authorName }}, {{$t('unit.spisok_unitov.card.header.updated_at')}} {{ convertDate(item.unixtimePoslednegoObnovleniyaUnita) }}
      </div>
    </q-card-section>
    <q-card-section class="q-pa-sm">
      <div class="text-left" v-if="item.state === 'USPESHNO_ZAPUSHEN' && item.links.length > 0">
        <template v-for="link in item.links">
          <template v-if="link.indexOf('http') > -1">
            <div class="text-italic fs-12">
              <a :href="link" target="_blank">{{ link }}</a>
            </div>
          </template>
          <template v-else>
            <div class="text-italic">
              {{ link }}
            </div>
          </template>
        </template>
      </div>
      <div class="text-left fs-12"><strong>{{$t('unit.spisok_unitov.card.fields.id')}}:</strong> {{ item.id }}</div>
      <div class="text-left fs-12"><strong>{{$t('unit.spisok_unitov.card.fields.branch')}}:</strong> {{ item.branch }}</div>
      <div class="text-left fs-12"  v-if="item.statistikaKonteinera">
        <div class="row">
          <div class="col-3"><strong>cpu: {{item.statistikaKonteinera.cpuPercent}}</strong></div>
          <div class="col"><strong>mem: {{item.statistikaKonteinera.memoryUsage}} ( {{item.statistikaKonteinera.memoryPercent}} )</strong></div>
        </div>
      </div>
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
