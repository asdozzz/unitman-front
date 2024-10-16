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
import FormaIzmeneniyaParolya
  from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaIzmeneniyaParolya.vue";
import FormaIzmeneniyaEmail
  from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaIzmeneniyaEmail.vue";
import {
  useFormaIzmeneniyaParolya
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaIzmeneniyaParolyaStore";
import {
  useFormaIzmeneniyaEmail
} from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaIzmeneniyaEmailStore";
import PolzovatelDlyAdmininstrirovaniya
  from "@/modules/account/store/SpisokPolzovateleiDlyAdmininstrirovaniya/model/PolzovatelDlyAdmininstrirovaniya";
import {useAuthStore} from "@/modules/account/store/auth";

const authStore = useAuthStore();
const { getLocale } = storeToRefs(authStore);

const spisokPolzovateleStore = useSpisokPolzovateleiDlyAdmininstrirovaniyaStore();
const { spisok, loaderSpiska, oshibkaPolucheniyaSpiska, loaderObnovleniya } = storeToRefs(spisokPolzovateleStore);

const formaRegistrazii = useFormaRegistraziiPolzovatelya();
const { enable: enableAddForm } = storeToRefs(formaRegistrazii);

const formaIzmeneniyaParolya = useFormaIzmeneniyaParolya();
const { enable: enableNewPasswordForm } = storeToRefs(formaIzmeneniyaParolya);

const formaIzmeneniyaEmail = useFormaIzmeneniyaEmail();
const { enable: enableNewEmailForm } = storeToRefs(formaIzmeneniyaEmail);

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

function openNewPasswordForm(item: PolzovatelDlyAdmininstrirovaniya) {
  formaIzmeneniyaParolya.otkritFormu(item.id);
}

function openNewEmailForm(item: PolzovatelDlyAdmininstrirovaniya) {
  formaIzmeneniyaEmail.otkritFormu(item.id, item.email);
}
</script>

<template>

  <div class="full-width flex column">
    <q-spinner
        v-if="loaderSpiska"
        color="primary"
        size="3em"
    />
    <div class="row wrap items-start content-start">
      <q-card class="q-mb-md">
        <q-card-section>
          <q-btn size="md" color="primary" icon="add" @click="openAddForm">
            <q-tooltip>{{$t('account.spisok.buttons.add')}}</q-tooltip>
          </q-btn>
        </q-card-section>
      </q-card>
    </div>
    <div class="row wrap items-start content-start">
      <template v-if="oshibkaPolucheniyaSpiska">
        <div v-html="oshibkaPolucheniyaSpiska"></div>
      </template>
      <template v-else>

        <template v-for="item in spisok">
          <q-card class="q-mr-md" style="width: 250px">
            <q-card-section>
              <div class="text-h6 text-left">{{$t('account.spisok.card.labels.email')}}: {{ item.email }}</div>
              <div class="text-subtitle2 text-left">{{$t('account.spisok.card.labels.id')}} : {{ item.id }}</div>
              <div class="text-subtitle2 text-left">{{$t('account.spisok.card.labels.role')}} : {{ item.roles }}</div>
              <div class="text-subtitle2 text-left">{{$t('account.spisok.card.labels.blocked')}} : {{ item.isBlocked }}</div>
            </q-card-section>

            <q-separator dark />

            <q-card-actions>
              <q-btn size="md" color="black" v-if="!item.isBlocked" icon="visibility_off" @click="blokirovka(item.id)" :loading="loaderObnovleniya">
                <q-tooltip>{{$t('account.spisok.buttons.block')}}</q-tooltip>
              </q-btn>
              <q-btn size="md" color="black" v-if="item.isBlocked" icon="visibility" @click="razblokirovka(item.id)" :loading="loaderObnovleniya">
                <q-tooltip>{{$t('account.spisok.buttons.unblock')}}</q-tooltip>
              </q-btn>
              <q-btn size="md" color="black" icon="password" @click="openNewPasswordForm(item)">
                <q-tooltip>{{$t('account.spisok.buttons.change_password')}}</q-tooltip>
              </q-btn>
              <q-btn size="md" color="black" icon="alternate_email" @click="openNewEmailForm(item)">
                <q-tooltip>{{$t('account.spisok.buttons.change_email')}}</q-tooltip>
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

  <q-dialog v-model="enableNewPasswordForm" persistent transition-show="scale" transition-hide="scale">
    <FormaIzmeneniyaParolya @formaBilaOtpravlena="spisokPolzovateleStore.poluchitPolzovateleiDlyAdmininstrirovaniya()"/>
  </q-dialog>

  <q-dialog v-model="enableNewEmailForm" persistent transition-show="scale" transition-hide="scale">
    <FormaIzmeneniyaEmail @formaBilaOtpravlena="spisokPolzovateleStore.poluchitPolzovateleiDlyAdmininstrirovaniya()"/>
  </q-dialog>

</template>

<style scoped>

</style>
