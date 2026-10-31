<script setup lang="ts">
import {computed, ref} from "vue";
import {PeremenayaKonfiga} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import {pomoschnikZapolnen} from "@/modules/unit/store/SpisokUnitov/StorPomoschnikaSsylki";
import OknoViboraUnitaDlyaSsylki from "@/modules/unit/view/Unit/Konfig/OknoViboraUnitaDlyaSsylki.vue";

const props = defineProps<{
  peremenaya: PeremenayaKonfiga
}>();

/**
 * Кнопка подстановки ссылки показывается только если у переменной задан
 * помощник с полным набором полей (projectId, service, port).
 */
const estPomoschnik = computed<boolean>(() => pomoschnikZapolnen(props.peremenaya.konfig.helper));

const oknoViboraOtkrito = ref<boolean>(false);

function podstavitSsylku(ssylka: string) {
  props.peremenaya.value = ssylka;
}
</script>

<template>
  <div class="row no-wrap items-start q-col-gutter-sm">
    <div class="col">
      <template v-if="props.peremenaya.konfig.type === 'collection'">
        <q-select v-model="props.peremenaya.value" option-value="id" option-label="name"
                  :options="props.peremenaya.konfig.options?.options ?? []" :label="props.peremenaya.konfig.label" emit-value map-options/>
      </template>
      <template v-else>
        <q-input v-model="props.peremenaya.value" :label="props.peremenaya.konfig.label" />
      </template>
    </div>

    <div class="col-auto" v-if="estPomoschnik">
      <q-btn square color="primary" icon="link" padding="10px" @click="oknoViboraOtkrito = true">
        <q-tooltip>{{ $t('unit.pomoschnik_ssylki.hints.insert_link') }}</q-tooltip>
      </q-btn>
    </div>
  </div>

  <OknoViboraUnitaDlyaSsylki
      v-if="estPomoschnik"
      v-model="oknoViboraOtkrito"
      :helper="props.peremenaya.konfig.helper"
      @ssylkaPoluchena="podstavitSsylku"
  />
</template>

<style scoped>

</style>
