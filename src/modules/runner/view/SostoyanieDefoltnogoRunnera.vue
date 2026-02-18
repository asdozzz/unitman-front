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
  <template v-if="oshibkaBackenda">
    <div>{{oshibkaBackenda}}</div>
  </template>
  <template v-else>
    <span v-if="!active" class="text-negative">{{ $t('runner.non_active')}}</span>
  </template>
</div>
</template>
