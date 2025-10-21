<script setup lang="ts">
import {useRoute} from "vue-router";

const route = useRoute();
</script>

<template>
  <div class="row">
    <div class="col-12 q-pl-none q-pb-sm q-ml-none">
      <q-breadcrumbs>
        <q-breadcrumbs-el :label="$t('app.tabs.home')" to="/"/>
        <q-breadcrumbs-el :label="$t('app.tabs.projects')" :to="{name:'project_list'}"/>
        <q-breadcrumbs-el :label="route.params.id as string" />
      </q-breadcrumbs>
    </div>
  </div>
  <q-tabs
      dense
      no-caps
      inline-label
      align="left"
      indicator-color="primary"
  >
    <q-route-tab
        :label="$t('unit.proekt.tabs.project_data')"
        :to="{name:'project_edit', params: {id:route.params.id}}"
        exact
    />
    <q-route-tab
        :label="$t('unit.proekt.tabs.jobs')"
        :to="{name:'project_jobs', params: {id:route.params.id}}"
        exact
    />
    <q-route-tab
        :label="$t('unit.proekt.tabs.users')"
        :to="{name:'project_users', params: {id:route.params.id}}"
        exact
    />
    <q-route-tab
        :label="$t('unit.proekt.tabs.variables')"
        :to="{name:'project_variables', params: {id:route.params.id}}"
        exact
    />
    <q-route-tab
        :label="$t('unit.proekt.tabs.repo_event_handler')"
        :to="{name:'project_repo_event_handler', params: {id:route.params.id}}"
        exact
    />
  </q-tabs>
  <div class="q-pt-xs">
    <router-view></router-view>
  </div>
</template>

<style scoped>

</style>
