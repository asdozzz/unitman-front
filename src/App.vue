<template>
  <div id="app">
    <q-layout view="hHh lpR fFf">
      <q-header class="bg-primary text-white">
        <q-toolbar>
          <q-toolbar-title>
            <a href="/" class="text-white">Unitman</a>
          </q-toolbar-title>
          <div class="q-gutter-sm text-white" v-if="!loaderIzmemeniyaYazika">
            <q-radio color="warning" dark left-label v-model="currentLocale" @update:model-value="changeLocal" val="ru" label="ru" />
            <q-radio color="warning" dark left-label v-model="currentLocale" @update:model-value="changeLocal" val="en" label="en" />
          </div>
          <div class="q-mr-sm" v-else>
            <q-spinner
                color="warning"
                size="2em"
            />
          </div>

          <div>{{ email }}</div>
          <q-btn v-if="isAuth" flat dense icon="logout" @click="logout"/>
        </q-toolbar>
        <q-tabs align="left" inline-label class="bg-primary text-white" v-if="isAuth">
          <q-route-tab to="/account/list" :label="$t('app.tabs.accounts')" v-if="isAdmin"/>
          <q-route-tab to="/unit/repositories" :label="$t('app.tabs.repos')" v-if="isAdmin"/>
          <q-route-tab to="/unit/projects" :label="$t('app.tabs.projects')" v-if="isAdmin"/>
          <q-route-tab to="/unit/list" :label="$t('app.tabs.units')"/>
        </q-tabs>
      </q-header>

      <q-page-container>
        <router-view />
      </q-page-container>

      <q-footer elevated class="bg-grey-8 text-white">
        <q-toolbar>
          <q-toolbar-title>
            <div>@unitman</div>
          </q-toolbar-title>
        </q-toolbar>
      </q-footer>
    </q-layout>
  </div>
</template>

<script setup lang="ts">
import {useAuthStore} from "@/modules/account/store/auth";
import {storeToRefs} from "pinia";
import { useRouter } from "vue-router";
import {onMounted, ref} from "vue";
const router = useRouter();

const authStore = useAuthStore();
const { isAuth, email, isAdmin, loaderIzmemeniyaYazika, getLocale } = storeToRefs(authStore);

let currentLocale = ref("");

onMounted(() => {
  currentLocale.value = getLocale.value;
})

async function changeLocal(newLocale: "en" | "ru") {
  authStore.izmeniyYazik(newLocale);
}

function logout() {
  authStore.logout();
  router.push('/login');
}
</script>

