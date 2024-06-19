<template>
  <div id="app">
    <q-layout view="hHh lpR fFf">
      <q-header class="bg-primary text-white">
        <q-toolbar>
          <q-toolbar-title>
            Unitman
          </q-toolbar-title>
          <div>{{ email }}</div>
          <q-btn v-if="isAuth" flat dense icon="logout" @click="logout"/>
        </q-toolbar>
        <q-tabs align="left" inline-label class="bg-primary text-white" v-if="isAuth">
          <q-route-tab to="/account/list" label="Accounts" v-if="isAdmin"/>
          <q-route-tab to="/unit/repositories" label="Repositories" v-if="isAdmin"/>
          <q-route-tab to="/unit/projects" label="Projects" v-if="isAdmin"/>
          <q-route-tab to="/unit/list" label="Units"/>
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
const router = useRouter();

const authStore = useAuthStore();
const { isAuth, email, isAdmin } = storeToRefs(authStore);

function logout() {
  authStore.logout();
  router.push('/login');
}
</script>

