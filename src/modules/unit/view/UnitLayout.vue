<template>

  <div class="q-pa-md">
    <router-view />
  </div>

</template>

<script setup lang="ts">
import { ref } from 'vue'

const leftDrawerOpen = ref(false)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}
</script>
