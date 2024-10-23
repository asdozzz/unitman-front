<template>
  <div id="app">
    <q-layout view="hHh Lpr lff">
      <q-header elevated class="bg-primary text-white">
        <q-toolbar>
          <q-btn dense flat round icon="menu" @click="toggleLeftDrawer" v-if="showedMenu.length > 0"/>
          <q-toolbar-title>
            Unitman
          </q-toolbar-title>
          <div class="q-gutter-sm text-white" v-if="!loaderIzmemeniyaYazika">
            <q-radio color="warning" dark left-label :model-value="getLocale" @update:model-value="changeLocal" val="ru" label="ru" />
            <q-radio color="warning" dark left-label :model-value="getLocale" @update:model-value="changeLocal" val="en" label="en" />
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

        </q-tabs>
      </q-header>

      <q-drawer
          elevated
          v-if="showedMenu.length > 0"
          :mini="miniState"
          @mouseenter="miniState = false"
          @mouseleave="miniState = true"
          show-if-above
          v-model="leftDrawerOpen"
          side="left"
          :width="200"
          :breakpoint="500"
          >
        <q-scroll-area class="fit">
          <q-list padding class="menu-list">
            <template v-for="menuItem in showedMenu">
              <q-item clickable v-ripple :href="menuItem.href" :active="menuItem.href === path">
                <q-item-section avatar>
                  <q-icon :name="menuItem.icon" />
                </q-item-section>

                <q-item-section>
                  <q-item-label>{{ $t(menuItem.label) }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-list>
        </q-scroll-area>
      </q-drawer>

      <q-page-container>
        <q-page>
          <router-view />
          <q-page-scroller position="bottom-right" :scroll-offset="150" :offset="[18, 18]">
            <q-btn fab icon="keyboard_arrow_up" color="accent" />
          </q-page-scroller>
        </q-page>

      </q-page-container>

<!--      <q-footer elevated class="bg-grey-8 text-white">
        <q-toolbar>
          <q-toolbar-title>
            <div>@unitman</div>
          </q-toolbar-title>
        </q-toolbar>
      </q-footer>-->
    </q-layout>
  </div>
</template>

<script setup lang="ts">
import {useAuthStore} from "@/modules/account/store/auth";
import {storeToRefs} from "pinia";
import { useRouter, useRoute } from "vue-router";
import {computed, onMounted, reactive, ref} from "vue";
const router = useRouter();
const route=useRoute();
const path = computed(() =>route.path)

const authStore = useAuthStore();
const { isAuth, email, isAdmin, loaderIzmemeniyaYazika, getLocale } = storeToRefs(authStore);

let currentLocale = ref("");
const leftDrawerOpen = ref(false);
const miniState = ref(false);

onMounted(() => {
  currentLocale.value = getLocale.value;
  authStore.updateLocale(getLocale.value);
})

/*
          <q-route-tab to="/unit/repositories" :label="$t('app.tabs.repos')" v-if="isAdmin"/>
          <q-route-tab to="/unit/projects" :label="$t('app.tabs.projects')" v-if="isAdmin"/>
          <q-route-tab to="/unit/list" :label="$t('app.tabs.units')"/>
* */

const menu = reactive([
  {icon: 'home', href:"/", label: 'app.tabs.home', show: isAuth },
  {icon: 'groups', href:"/account/list", label: 'app.tabs.accounts', show: isAdmin },
  {icon: 'inbox', href:"/unit/repositories", label: 'app.tabs.repos', show: isAdmin },
  {icon: 'list', href:"/unit/projects", label: 'app.tabs.projects', show: isAdmin },
  {icon: 'star', href:"/unit/list", label: 'app.tabs.units', show: isAuth },
]);

const showedMenu = computed(() => {
  return menu.filter((item) => item.show);
})

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

async function changeLocal(newLocale: "en" | "ru") {
  authStore.izmeniyYazik(newLocale);
}

function logout() {
  authStore.logout();
  router.push('/login');
}
</script>

