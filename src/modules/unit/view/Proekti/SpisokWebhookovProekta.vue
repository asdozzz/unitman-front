<script setup lang="ts">
import {SpisokWebhookovProektaStore} from "@/modules/unit/store/SpisokProektov/SpisokWebhookovProektaStore";
import {storeToRefs} from "pinia";
import {useRoute, useRouter} from "vue-router";
import {onMounted} from "vue";

const storeWebhookov = SpisokWebhookovProektaStore();
const { spisok, loaderDobavleniya, loaderIzmeneniya, form } = storeToRefs(storeWebhookov);

const route = useRoute();
const router = useRouter();

onMounted(async () => {
  storeWebhookov.pokazatSpisok(route.params.id as string)
  await storeWebhookov.poluchitSpisok();
})

</script>

<template>
  <q-card style="width: 500px; max-width: 80vw;">
    <q-card-section>
      <q-input standou square dense outlined v-model="form.url" label="Url" clearable/>
      <q-btn color="primary" class="q-mt-sm" label="add" @click="storeWebhookov.dobavit" :loading="loaderDobavleniya">
        <q-tooltip>add</q-tooltip>
      </q-btn>
    </q-card-section>
  </q-card>
  <q-card class="q-mt-sm" style="width: 500px" v-for="webhook in spisok" :key="webhook.id">
    <q-card-section>
      <q-btn padding="5px 6px" class="q-mr-sm" size="sm"  color="primary" icon="delete" @click="storeWebhookov.udalit(webhook.id)" :loading="loaderIzmeneniya">
        <q-tooltip>delete</q-tooltip>
      </q-btn>
      <q-btn padding="5px 6px" square size="sm" color="primary" v-if="webhook.isActive" icon="remove_done" @click="storeWebhookov.otkluchit(webhook.id)" :loading="loaderIzmeneniya">
        <q-tooltip>block</q-tooltip>
      </q-btn>
      <q-btn padding="5px 6px" square size="sm" color="primary" v-if="!webhook.isActive" icon="done_all" @click="storeWebhookov.vkluchit(webhook.id)" :loading="loaderIzmeneniya">
        <q-tooltip>unblock</q-tooltip>
      </q-btn>
      <span>
        <a
            :class="{'q-pl-sm text-negative': !webhook.isActive, 'q-pl-sm text-positive': webhook.isActive}"
            href="#"
            @click.prevent="router.push({ name: 'webhook_events', params: { id: route.params.id, webhookId: webhook.id }});">
          {{webhook.url}}
        </a>
      </span>
    </q-card-section>
  </q-card>
</template>

<style scoped>

</style>
