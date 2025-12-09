<script setup lang="ts">
import {storeToRefs} from "pinia";
import {onMounted} from "vue";

import {
  useSpisokPolzovateleiDlyAdmininstrirovaniyaStore
} from "@/modules/account/store/SpisokVsehPolzovateleiDlyAdmininstrirovaniyaStore";
import {
  useFormaRegistraziiPolzovatelya
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaRegistraziiPolzovatelyaStore";
import FormaRegistraziiPolzovatelya
  from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaRegistraziiPolzovatelya.vue";
import {useAuthStore} from "@/modules/account/store/auth";
import {useRouter} from "vue-router";
const router = useRouter();
const authStore = useAuthStore();
const { getLocale } = storeToRefs(authStore);

const spisokPolzovateleStore = useSpisokPolzovateleiDlyAdmininstrirovaniyaStore();
const { spisok, loaderSpiska, oshibkaPolucheniyaSpiska, loaderObnovleniya } = storeToRefs(spisokPolzovateleStore);

const formaRegistrazii = useFormaRegistraziiPolzovatelya();
const { enable: enableAddForm } = storeToRefs(formaRegistrazii);

onMounted(async () => {
  await spisokPolzovateleStore.poluchitPolzovateleiDlyAdmininstrirovaniya();
})

function blokirovka(id: string) {
  spisokPolzovateleStore.blokirovatPolzovatelya(id);
}

function razblokirovka(id: string) {
  spisokPolzovateleStore.razblokirovatPolzovatelya(id);
}

function openAddForm() {
  formaRegistrazii.otkritFormu(getLocale.value);
}
</script>

<template>

  <div class="full-width flex column">

    <div class="row">
      <div class="col q-pb-sm">
        <q-btn padding="5px 6px" square size="sm" color="primary" icon="add" @click="openAddForm">
          <q-tooltip>{{$t('account.spisok.buttons.add')}}</q-tooltip>
        </q-btn>
      </div>
    </div>
    <div class="row wrap items-start content-start">
      <q-spinner-cube
          v-if="loaderSpiska"
          color="primary"
          size="2em"
      />
      <template v-else-if="oshibkaPolucheniyaSpiska">
        <div v-html="oshibkaPolucheniyaSpiska"></div>
      </template>
      <template v-else>

        <template v-for="item in spisok">
          <q-card square class="q-mr-md q-mb-md" style="width: 350px">
            <q-card-section class="bg-primary text-white q-py-sm q-pl-sm">
              <div class="text-subtitle2 text-left"> {{ item.email }}</div>
            </q-card-section>
            <q-card-section class="q-pa-sm">
              <div class="text-left fs-12">{{$t('account.spisok.card.labels.id')}} : {{ item.id }}</div>
              <div class="text-left fs-12">{{$t('account.spisok.card.labels.role')}} : {{ item.roles }}</div>
              <div class="text-left fs-12">{{$t('account.spisok.card.labels.blocked')}} : {{ item.isBlocked }}</div>
              <div class="text-left fs-12">{{$t('account.spisok.card.labels.nickname')}} : {{ item.nickname }}</div>
            </q-card-section>

            <q-separator />

            <q-card-actions>
              <q-btn padding="5px 6px" square size="sm" color="primary" v-if="!item.isBlocked" icon="visibility_off" @click="blokirovka(item.id)" :loading="loaderObnovleniya">
                <q-tooltip>{{$t('account.spisok.buttons.block')}}</q-tooltip>
              </q-btn>
              <q-btn padding="5px 6px" square size="sm" color="primary" v-if="item.isBlocked" icon="visibility" @click="razblokirovka(item.id)" :loading="loaderObnovleniya">
                <q-tooltip>{{$t('account.spisok.buttons.unblock')}}</q-tooltip>
              </q-btn>
              <q-btn padding="5px 6px" square size="sm" color="primary" icon="edit" @click="router.push({ name: 'account_edit', params: { id: item.id } })">
                <q-tooltip>{{$t('account.spisok.buttons.edit')}}</q-tooltip>
              </q-btn>
            </q-card-actions>
          </q-card>
        </template>
      </template>
    </div>
  </div>

  <q-dialog v-model="enableAddForm" persistent transition-show="scale" transition-hide="scale">
    <FormaRegistraziiPolzovatelya @formaBilaOtpravlena="spisokPolzovateleStore.poluchitPolzovateleiDlyAdmininstrirovaniya()"/>
  </q-dialog>

</template>

<style scoped>

</style>
