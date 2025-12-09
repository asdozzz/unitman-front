<script setup lang="ts">
import {useRoute} from "vue-router";
import {SobitiyaWebhookaStore} from "@/modules/unit/store/SpisokProektov/SobitiyaWebhookaStore";
import {storeToRefs} from "pinia";
import {onMounted} from "vue";
import {format, fromUnixTime} from "date-fns";

const storeWebhookov = SobitiyaWebhookaStore();
const { form, loaderIzmeneniya, sobitiya } = storeToRefs(storeWebhookov);

const route = useRoute();

onMounted(async () => {
  storeWebhookov.initStore(route.params.webhookId as string)
})

function changePage(newPage: number) {
  storeWebhookov.newPage(newPage);
}

function convertDate(unixtime: number): string {
  const s = format(fromUnixTime(unixtime), 'dd.MM.yyy H:mm:ss');
  return s;
}
</script>

<template>
  <div class="row">
    <div class="col-12 q-pl-none q-pb-sm q-ml-none">
      <q-breadcrumbs>
        <q-breadcrumbs-el :label="$t('app.tabs.home')" to="/"/>
        <q-breadcrumbs-el :label="$t('app.tabs.projects')" :to="{name:'project_list'}"/>
        <q-breadcrumbs-el :label="route.params.id as string" :to="'/unit/projects/'+route.params.id+'/home'"/>
        <q-breadcrumbs-el :label="$t('unit.proekt.tabs.webhooks')" :to="'/unit/projects/'+route.params.id+'/webhooks'"/>
        <q-breadcrumbs-el :label="route.params.webhookId as string"/>
      </q-breadcrumbs>
    </div>
  </div>
  <div class="row">
    <div class="col-auto">
      <q-card style="width: 500px; max-width: 80vw;" v-if="form.id">
        <q-card-section>
          <q-input standou square dense outlined v-model="form.newUrl" label="Url" clearable/>
          <q-btn color="primary" class="q-mt-sm" label="save" @click="storeWebhookov.obnovit" :loading="loaderIzmeneniya">
            <q-tooltip>save</q-tooltip>
          </q-btn>
        </q-card-section>
      </q-card>
      <q-spinner-cube
          v-if="sobitiya.loaderSpiska"
          color="primary"
          size="2em"
      />
      <div v-else-if="sobitiya.spisok.length > 0" style="width: 500px; max-width: 80vw;" class="q-mt-sm shadow-3">
        <q-list dense bordered padding class="rounded-borders">
          <q-item v-for="item in sobitiya.spisok"
            clickable
            v-ripple
            :active="item.id === sobitiya.select?.id"
            @click="storeWebhookov.select(item)">
            <q-item-section>
              <div class="row">
                <div class="col">{{item.type}}</div>
                <div class="col-auto" style="font-size: 12px">{{convertDate(item.unixtime)}}</div>
              </div>
            </q-item-section>
          </q-item>
        </q-list>
        <div class="q-pa-sm">
          <q-pagination
              :model-value="sobitiya.pagination.page"
              :max="sobitiya.pagination.totalPages"
              @update:model-value="changePage($event)"
              direction-links
              boundary-links
          />
        </div>
      </div>
    </div>
    <div class="col q-pl-sm" v-if="sobitiya.select">
      <q-card>
        <q-card-section>
          <pre class="bash-output">{{sobitiya.select.payload}}</pre>
        </q-card-section>
      </q-card>
      <q-card class="q-mt-sm">
        <q-card-section v-if="!sobitiya.select.sent">
          Not sent
        </q-card-section>
        <q-card-section v-else>
          <pre class="bash-output">{{sobitiya.select.response}}</pre>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<style>
.bash-output {
  margin: 0;
  word-break: break-all;
  white-space: pre-wrap;
}
</style>
