<script setup lang="ts">
import {computed, ref} from 'vue'
import Unit from "@/modules/unit/store/SpisokUnitov/model/Unit";
import UnitActions from "@/modules/unit/view/Unit/SpisokUnitov/UnitActions.vue";
import {useAuthStore} from "@/modules/account/store/auth";
import {storeToRefs} from "pinia";
import {useSpisokUnitovStore} from "@/modules/unit/store/SpisokUnitovStore";
import {convertDate} from "@/utils/dates";


const expanded = ref(false);
const props = defineProps<{
  item: Unit,
}>();

const authStore = useAuthStore();
const { isAdmin } = storeToRefs(authStore);

const unitiStore = useSpisokUnitovStore();
const {getUnitLoader, showForceRemove, esliJdemRunner, esliZapushen, nazvanieTekusheiZadachi} = storeToRefs(unitiStore);

const itemHeaderClass = computed(() => {
  let headerColor = 'bg-primary';
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
    classHeader = 'bg-negative text-white';
  } else {
    classHeader = `text-white ${headerColor}`;
  }

  return classHeader;
});

const isShowRemoveBtn = computed(() => {
  if (showForceRemove) {
    return true;
  }

  return isAdmin;
});


async function udalit() {
  await unitiStore.udalit(props.item);
  prompt.value = false;
}

/*async function udalitSlomanii() {
  await unitiStore.udalitSlomaniiUnit(props.item.id);
  prompt.value = false;
}*/

async function rebuildModel() {
  await unitiStore.rebuildModel(props.item.id);
}

const prompt =  ref(false);

function showRemovePrompt() {
  prompt.value = true;
}

</script>

<template>
  <q-dialog v-model="prompt" persistent>
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Вы уверены, что хотите этого?</div>
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat label="Нет" v-close-popup />
        <q-btn flat label="Да" :loading="getUnitLoader(props.item.id)" @click="udalit()" />
      </q-card-actions>
    </q-card>
  </q-dialog>
  <q-card square class="q-mr-md q-mb-md" style="width: 335px">
    <q-card-section class="q-py-xs q-px-sm" :class="itemHeaderClass">
      <div class="row">
        <div class="col" >
          <div class="unit-card-name">
            {{ item.name }}
          </div>
        </div>
        <div class="col-auto">
<!--          <q-btn size="sm" padding="4px 5px" flat round icon="delete_forever" v-if="isAdmin" @click="udalitSlomanii" :loading="getUnitLoader(props.item.id)"/>-->
          <q-btn size="sm" padding="4px 5px" flat round icon="restore_from_trash" v-if="isAdmin" @click="rebuildModel" :loading="getUnitLoader(props.item.id)">
          </q-btn>
          <q-btn size="sm" padding="4px 5px" flat round icon="close" v-if="isShowRemoveBtn" @click="showRemovePrompt" :loading="getUnitLoader(props.item.id)">
            <q-tooltip>{{$t('unit.spisok_unitov.card.buttons.delete')}}</q-tooltip>
          </q-btn>
        </div>
      </div>
      <div class="row">
        <div class="col">
          <div class="unit-card-author">
            {{$t('unit.spisok_unitov.card.header.by')}} {{ item.authorName }}, {{$t('unit.spisok_unitov.card.header.updated_at')}} {{ convertDate(item.unixtimePoslednegoObnovleniyaUnita) }}
          </div>
        </div>
      </div>
    </q-card-section>
    <q-card-section class="q-pa-sm">
      <div class="text-left" v-if="item.links.length > 0">
        <template v-for="link in item.links">
          <template v-if="link.protocol === 'http' && esliZapushen(item)">
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
      <div class="text-left fs-12"><strong>{{$t('unit.spisok_unitov.card.fields.projectName')}}:</strong> {{ item.projectName }}</div>
      <div class="text-left fs-12" style="white-space: pre-line;word-break: break-all">
        <strong>{{$t('unit.spisok_unitov.card.fields.branch')}}:</strong> {{ item.branch }}
      </div>
      <div class="text-left fs-12"  v-if="item.statistikaKonteinera">
        <div class="row">
          <div class="col-3"><strong>cpu: {{item.statistikaKonteinera.cpuPercent}}</strong></div>
          <div class="col"><strong>mem: {{item.statistikaKonteinera.memoryUsage}} ( {{item.statistikaKonteinera.memoryPercent}} )</strong></div>
        </div>
      </div>
      <q-inner-loading :showing="esliJdemRunner(item)">
        <q-spinner-gears size="30px" color="primary" />
        <p class="text-primary">{{$t('unit.tipi_zadach.'+nazvanieTekusheiZadachi(item))}}</p>
      </q-inner-loading>
    </q-card-section>
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
.unit-card-name {
  font-size: 1.25rem;
  font-weight: 500;
}

.unit-card-author {
  font-size: 12px;
  font-weight: 500;
}
</style>
