<script setup lang="ts">
import {computed, ref, watch} from "vue";
import {storeToRefs} from "pinia";
import type {PomoschnikSsylki, Unit} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import {
  normalizovatSuffiks,
  pomoschnikZapolnen,
  useStorPomoschnikaSsylki,
} from "@/modules/unit/store/SpisokUnitov/StorPomoschnikaSsylki";

const props = defineProps<{
  modelValue: boolean;
  helper: PomoschnikSsylki | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  /**
   * Ссылка вместе с юнитом, который её дал.
   *
   * `targetUnitId` уходит на бэкенд в `ZnacheniePeremenoi.targetUnitId`:
   * бэкенд строит по нему связи юнитов в read-модели списка.
   */
  ssylkaPoluchena: [link: string, targetUnitId: string, targetUnitName: string];
}>();

const storPomoschnika = useStorPomoschnikaSsylki();
const {spisok, loaderSpiska, loaderSsylki, oshibka} = storeToRefs(storPomoschnika);

const zapros = ref<string>("");
const vibraliUnitId = ref<string | null>(null);

/** Суффикс из помощника; `null`, если он не задан или пуст. */
const suffiks = computed<string | null>(() => normalizovatSuffiks(props.helper?.suffix));

const spisokSFiltrom = computed<Unit[]>(() => {
  const zaprosNizhniy = zapros.value.trim().toLowerCase();

  if (!zaprosNizhniy) {
    return spisok.value;
  }

  return spisok.value.filter((unit: Unit) => {
    return unit.name.toLowerCase().includes(zaprosNizhniy)
        || unit.branch.toLowerCase().includes(zaprosNizhniy);
  });
});

watch(() => props.modelValue, async (otkrito: boolean) => {
  if (!otkrito) {
    return;
  }

  zapros.value = "";
  vibraliUnitId.value = null;
  storPomoschnika.ochistitOshibku();

  if (pomoschnikZapolnen(props.helper)) {
    await storPomoschnika.poluchitSpisokUnitovProekta(props.helper.projectId);
  }
}, {immediate: true});

function zakrit() {
  emit("update:modelValue", false);
}

function obnovitSpisok() {
  if (pomoschnikZapolnen(props.helper)) {
    storPomoschnika.obnovitSpisokUnitovProekta(props.helper.projectId);
  }
}

async function vibratUnit(unit: Unit) {
  if (!props.helper) {
    return;
  }

  vibraliUnitId.value = unit.id;

  const ssylka = await storPomoschnika.poluchitSsylku(props.helper, unit.id);

  vibraliUnitId.value = null;

  if (ssylka) {
    // Юнит запоминается вместе со ссылкой: форма отправит его на бэкенд
    // как `targetUnitId`, чтобы связать переменную с этим юнитом.
    emit("ssylkaPoluchena", ssylka, unit.id, unit.name);
    zakrit();
  }
}
</script>

<template>
  <q-dialog :model-value="props.modelValue" persistent transition-show="scale" transition-hide="scale"
            @update:model-value="emit('update:modelValue', $event)">
    <q-card style="width: 700px; max-width: 80vw;">
      <q-card-section>
        <div class="text-h6">{{ $t('unit.pomoschnik_ssylki.title') }}</div>
        <div class="text-caption text-grey-8">
          {{
            $t('unit.pomoschnik_ssylki.podskazka', {
              service: props.helper?.service ?? '-',
              port: props.helper?.port ?? '-',
            })
          }}
        </div>
        <div class="text-caption text-grey-8" v-if="suffiks">
          {{ $t('unit.pomoschnik_ssylki.podskazka_suffiks', {suffix: suffiks}) }}
        </div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-input v-model="zapros" dense outlined clearable debounce="200"
                 :label="$t('unit.pomoschnik_ssylki.poisk')"/>

        <div class="q-mt-md">
          <div class="flex flex-center" v-if="loaderSpiska">
            <q-spinner color="primary" size="3em"/>
          </div>

          <div v-else-if="spisokSFiltrom.length === 0" class="text-grey-8">
            {{ $t('unit.pomoschnik_ssylki.empty_result') }}
          </div>

          <q-list v-else bordered separator>
            <q-item
                v-for="unit in spisokSFiltrom"
                :key="unit.id"
                clickable
                :disable="loaderSsylki"
                @click="vibratUnit(unit)"
            >
              <q-item-section>
                <q-item-label>{{ unit.name }}</q-item-label>
                <q-item-label caption>
                  {{ unit.branch }} · {{ unit.projectName }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-spinner v-if="loaderSsylki && vibraliUnitId === unit.id" color="primary" size="1.5em"/>
                <q-icon v-else name="link"/>
              </q-item-section>
            </q-item>
          </q-list>
        </div>

        <div class="text-negative q-mt-md" v-if="oshibka" v-html="oshibka"></div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat color="primary" icon="refresh" :loading="loaderSpiska"
               :disable="loaderSsylki" @click="obnovitSpisok">
          <q-tooltip>{{ $t('unit.pomoschnik_ssylki.buttons.refresh') }}</q-tooltip>
        </q-btn>
        <q-btn :label="$t('unit.pomoschnik_ssylki.buttons.close')" color="dark" @click="zakrit"
               :disable="loaderSsylki"/>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped>

</style>
