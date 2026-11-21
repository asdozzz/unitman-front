<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useStorFormiLichnogoTokena } from "@/modules/account/store/StorFormiLichnogoTokena";
import { useStorLichnihTokenov } from "@/modules/account/store/StorLichnihTokenov";

const formaStore = useStorFormiLichnogoTokena();
const storSpiska = useStorLichnihTokenov();
const {
    otkryta,
    repoId,
    token,
    nazvanie,
    loader,
    oshibkaOtBackenda,
    spisokRepo,
    loaderRepo,
    oshibkaRepo,
    mozhnoDobavit,
} = storeToRefs(formaStore);

/** Добавление идёт через стор списка: он запоминает результат и перезапрашивает список. */
function dobavit() {
    storSpiska.dobavitToken();
}
</script>

<template>
  <q-dialog :model-value="otkryta" persistent @update:model-value="formaStore.zakryt()">
    <q-card style="min-width: 480px">
      <q-card-section class="bg-primary text-white">
        <div class="text-subtitle2">{{ $t('account.lichniy_tokeni.form.caption') }}</div>
      </q-card-section>

      <q-card-section class="q-gutter-sm">
        <q-select
            v-model="repoId"
            :options="spisokRepo"
            option-value="id"
            option-label="name"
            emit-value
            map-options
            :label="$t('account.lichniy_tokeni.fields.repo')"
            :loading="loaderRepo"
            filled
            dense
        />
        <div v-if="oshibkaRepo" class="text-negative">{{ oshibkaRepo }}</div>

        <q-input
            v-model="nazvanie"
            :label="$t('account.lichniy_tokeni.fields.nazvanie')"
            filled
            dense
            autofocus
        />
        <q-input
            v-model="token"
            :label="$t('account.lichniy_tokeni.fields.token')"
            type="password"
            filled
            dense
        />

        <div v-if="oshibkaOtBackenda" class="text-negative">{{ oshibkaOtBackenda }}</div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
            flat
            :label="$t('account.lichniy_tokeni.form.buttons.close')"
            :disable="loader"
            @click="formaStore.zakryt()"
        />
        <q-btn
            color="primary"
            :label="$t('account.lichniy_tokeni.form.buttons.ok')"
            :loading="loader"
            :disable="!mozhnoDobavit"
            @click="dobavit()"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
