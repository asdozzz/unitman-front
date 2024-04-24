<template>
  <div class="q-pa-md">
    <SostoyanieDefoltnogoRunnera></SostoyanieDefoltnogoRunnera>
    <router-view />
  </div>

</template>

<script setup lang="ts">
import SostoyanieDefoltnogoRunnera from "@/modules/runner/view/SostoyanieDefoltnogoRunnera.vue";
</script>
