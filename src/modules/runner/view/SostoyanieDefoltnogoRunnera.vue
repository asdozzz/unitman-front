<script setup lang="ts">
import {storeSostoyaniyaDefoltnogoRunnera} from "@/modules/runner/store/StoreSostoyaniyaDefoltnogoRunnera";
import {storeToRefs} from "pinia";
import {onBeforeUnmount, onMounted} from "vue";

const store = storeSostoyaniyaDefoltnogoRunnera();
const { active, oshibkaBackenda} = storeToRefs(store);

onMounted(async () => {
  store.zapustitOprosStatusaRunnera();
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
