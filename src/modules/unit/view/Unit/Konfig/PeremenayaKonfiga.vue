<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { PeremenayaKonfiga } from "@/modules/unit/store/SpisokUnitov/model/Unit";
import { pomoschnikZapolnen } from "@/modules/unit/store/SpisokUnitov/StorPomoschnikaSsylki";
import OknoViboraUnitaDlyaSsylki from "@/modules/unit/view/Unit/Konfig/OknoViboraUnitaDlyaSsylki.vue";
import { GhButton, GhIcon, GhInput, GhLabel, GhSelect } from "@/components/ui";

const props = defineProps<{
  peremenaya: PeremenayaKonfiga;
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

/** Опции селекта приводятся к контракту GhSelect (`value`/`label`). */
const optiony = computed<{ value: string; label: string }[]>(() => {
  const istochnik = (props.peremenaya.konfig.options?.options ?? []) as Array<
    Record<string, unknown>
  >;

  return istochnik.map((option) => ({
    value: String(option.id ?? option.value ?? ""),
    label: String(option.name ?? option.label ?? ""),
  }));
});

function izmenitZnachenie(znachenie: string | number | null): void {
  props.peremenaya.value = znachenie === null ? "" : String(znachenie);
}

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

watch(
  () => props.peremenaya.value,
  (znachenie: string) => {
    if (!props.peremenaya.targetUnitId || znachenie === znacheniePriFiksazii.value) {
      return;
    }

    ochistitSvyaz();
  },
);
</script>

<template>
  <div class="config-var">
    <div class="config-var__field">
      <GhSelect
        v-if="peremenaya.konfig.type === 'collection'"
        :model-value="peremenaya.value"
        :options="optiony"
        :placeholder="peremenaya.konfig.label"
        :label="peremenaya.konfig.label"
        @update:model-value="izmenitZnachenie"
      />

      <GhInput
        v-else
        :model-value="peremenaya.value"
        :label="peremenaya.konfig.label"
        @update:model-value="izmenitZnachenie"
      />
    </div>

    <GhButton
      v-if="estPomoschnik"
      variant="default"
      icon="link"
      :aria-label="$t('unit.pomoschnik_ssylki.hints.insert_link')"
      @click="oknoViboraOtkrito = true"
    >
      <q-tooltip>{{ $t("unit.pomoschnik_ssylki.hints.insert_link") }}</q-tooltip>
    </GhButton>
  </div>

  <div v-if="peremenaya.targetUnitId" class="config-var__link">
    <GhLabel variant="accent" icon="link">{{ podpisSvyazi }}</GhLabel>

    <GhButton
      variant="invisible"
      size="sm"
      :aria-label="$t('unit.pomoschnik_ssylki.fiksaziya_hint', { id: peremenaya.targetUnitId })"
      @click="ochistitSvyaz"
    >
      <GhIcon name="x" :size="12" />
      <q-tooltip>
        {{ $t("unit.pomoschnik_ssylki.fiksaziya_hint", { id: peremenaya.targetUnitId }) }}
      </q-tooltip>
    </GhButton>
  </div>

  <OknoViboraUnitaDlyaSsylki
    v-if="estPomoschnik"
    v-model="oknoViboraOtkrito"
    :helper="peremenaya.konfig.helper"
    @ssylkaPoluchena="podstavitSsylku"
  />
</template>

<style scoped>
.config-var {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.config-var__field {
  flex: 1 1 auto;
  min-width: 0;
}

.config-var__link {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
}
</style>
