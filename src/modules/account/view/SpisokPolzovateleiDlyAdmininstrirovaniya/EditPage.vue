<script setup lang="ts">
import FormaIzmeneniyaNika
  from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaIzmeneniyaNika.vue";
import FormaIzmeneniyaRoli
  from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaIzmeneniyaRoli.vue";
import FormaIzmeneniyaEmail
  from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaIzmeneniyaEmail.vue";
import FormaIzmeneniyaParolya
  from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaIzmeneniyaParolya.vue";
import {useRoute} from "vue-router";
import FormaProektovPolzovatelya
  from "@/modules/account/view/SpisokPolzovateleiDlyAdmininstrirovaniya/FormaProektovPolzovatelya.vue";

const route = useRoute();
</script>

<template>
  <div class="row">
    <div class="col-12 q-pa-sm">
      <q-breadcrumbs>
        <q-breadcrumbs-el label="Главная" to="/"/>
        <q-breadcrumbs-el label="Учетные записи" to="/account/list"/>
        <q-breadcrumbs-el :label="route.params.id as string" />
      </q-breadcrumbs>
    </div>
  </div>
  <div class="row">
    <div class="col-3 q-pa-sm">
      <FormaIzmeneniyaParolya :id="route.params.id as string"/>
    </div>
    <div class="col-3 q-pa-sm">
      <FormaIzmeneniyaEmail :id="route.params.id as string"/>
    </div>
    <div class="col-3 q-pa-sm">
      <FormaIzmeneniyaNika :id="route.params.id as string"/>
    </div>
    <div class="col-3 q-pa-sm">
      <FormaIzmeneniyaRoli :id="route.params.id as string"/>
    </div>
  </div>
  <div class="row">
    <div class="col q-pa-sm">
      <FormaProektovPolzovatelya :id="route.params.id as string"/>
    </div>
  </div>
</template>

