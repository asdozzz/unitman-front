<script setup lang="ts">
import {storeSostoyaniyaDefoltnogoRunnera} from "@/modules/runner/store/StoreSostoyaniyaDefoltnogoRunnera";
import {storeToRefs} from "pinia";
import {onBeforeUnmount, onMounted} from "vue";

const store = storeSostoyaniyaDefoltnogoRunnera();
const { active, oshibkaBackenda, init} = storeToRefs(store);

onMounted(async () => {
  if (!init.value) {
    store.zapustitOprosStatusaRunnera();
  } else {
    store.vostanovitOprosStatus();
  }
})

onBeforeUnmount(() => {
  store.ostanovitOprosStatusaRunnera();
})

</script>

<template>
<div>
  <span >
    <div v-if="oshibkaBackenda">{{oshibkaBackenda}}</div>
    <template v-else>
      <span v-if="!active" class="text-red">the runner is non active, please notify the administrator </span>
    </template>
  </span>
</div>
</template>
