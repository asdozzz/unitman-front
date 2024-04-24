<template>
  <div class="q-pa-md">
    <router-view />
  </div>
</template>

<script lang="ts">
import { ref } from 'vue'

export default {
  setup () {
    const leftDrawerOpen = ref(false)

    return {
      leftDrawerOpen,
    }
  }
}
</script>
