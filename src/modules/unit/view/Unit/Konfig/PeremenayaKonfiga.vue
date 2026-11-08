<script setup lang="ts">
import {computed, ref, watch} from "vue";
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

/**
 * Значение переменной в момент фиксации юнита.
 *
 * Нужно, чтобы отличить подстановку из помощника от ручной правки: при
 * ручной правке фиксация снимается, иначе на бэкенд ушла бы связь, не
 * соответствующая значению переменной.
 */
const znacheniePriFiksazii = ref<string>(props.peremenaya.value);

/** Подпись зафиксированного юнита: имя из помощника, иначе ид. */
const podpisSvyazi = computed<string>(() => {
  return props.peremenaya.targetUnitName || props.peremenaya.targetUnitId || "";
});

/**
 * Подставить ссылку и зафиксировать юнит, который её выдал.
 *
 * `targetUnitId` уходит на бэкенд в `ZnacheniePeremenoi.targetUnitId`:
 * по нему бэкенд строит связи юнитов в read-модели списка.
 */
function podstavitSsylku(ssylka: string, targetUnitId: string, targetUnitName: string) {
  props.peremenaya.value = ssylka;
  props.peremenaya.targetUnitId = targetUnitId;
  props.peremenaya.targetUnitName = targetUnitName;
  props.peremenaya.svyazIzmenena = true;
  znacheniePriFiksazii.value = ssylka;
}

/** Снять фиксацию юнита: связь будет удалена на бэкенде, значение останется. */
function ochistitSvyaz() {
  props.peremenaya.targetUnitId = null;
  props.peremenaya.targetUnitName = null;
  // Явное снятие — единственный способ удалить последнюю связь:
  // пустой `svyazi` на бэкенде читается как «не менять связи».
  props.peremenaya.svyazIzmenena = true;
  znacheniePriFiksazii.value = props.peremenaya.value;
}

watch(() => props.peremenaya.value, (znachenie: string) => {
  if (!props.peremenaya.targetUnitId || znachenie === znacheniePriFiksazii.value) {
    return;
  }

  ochistitSvyaz();
});
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

  <div class="q-mt-xs text-left" v-if="props.peremenaya.targetUnitId">
    <q-chip dense square color="primary" text-color="white" icon="link"
            :label="podpisSvyazi" removable @remove="ochistitSvyaz">
      <q-tooltip>
        {{ $t('unit.pomoschnik_ssylki.fiksaziya_hint', {id: props.peremenaya.targetUnitId}) }}
      </q-tooltip>
    </q-chip>
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
