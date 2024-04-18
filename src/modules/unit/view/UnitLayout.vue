<template>
  <div class="q-pa-md">
    <SostoyanieDefoltnogoRunnera></SostoyanieDefoltnogoRunnera>
    <router-view />
  </div>

</template>

<script setup lang="ts">
import { ref } from 'vue'
import SostoyanieDefoltnogoRunnera from "@/modules/runner/view/SostoyanieDefoltnogoRunnera.vue";

const leftDrawerOpen = ref(false)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}
</script>
