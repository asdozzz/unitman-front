<script setup lang="ts">
import {PeremenayaKonfiga} from "@/modules/unit/store/SpisokUnitov/model/Unit";

const props = defineProps<{
  peremenaya: PeremenayaKonfiga
}>();
</script>

<template>
  <template v-if="props.peremenaya.konfig.type === 'collection'">
    <q-select v-model="props.peremenaya.value" option-value="id" option-label="name"
              :options="props.peremenaya.konfig.options.options ?? []" :label="props.peremenaya.konfig.label" emit-value map-options/>
  </template>
  <template v-else>
    <q-input v-model="props.peremenaya.value" :label="props.peremenaya.konfig.label" />
  </template>
</template>

<style scoped>

</style>
