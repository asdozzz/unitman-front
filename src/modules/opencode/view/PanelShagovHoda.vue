<script setup lang="ts">
import { computed, ref } from "vue";
import OpenCodeService from "@/modules/opencode/services/OpenCodeService";
import { pohozheNaProgress, type ProgressHodaOpenCode } from "@/modules/opencode/model/ChatOpenCode";
import i18n from "@/bootstrap/translator";
import { convertTime } from "@/utils/dates";

/**
 * Панель шагов одного хода.
 *
 * Для выполняющегося хода снапшот приходит из стора (websocket или опрос), а
 * для завершённого — дозагружается здесь через `/poluchitProgressHoda`: канал
 * такого хода уже не публикует события, но снапшот остаётся доступным.
 */
const props = defineProps<{
    turnId: string;
    /** Живой снимок из стора; `null` — ещё не пришёл. */
    progress: ProgressHodaOpenCode | null;
    /** Ход ещё выполняется: обновления в сторе продолжаются. */
    deyatelniy: boolean;
}>();

type ShagRunnera = Record<string, unknown>;

const raskrit = ref(false);
const zagruzhaem = ref(false);
const lokalniySnimok = ref<ProgressHodaOpenCode | null>(null);
const oshibka = ref<string | null>(null);

/** Живой снимок важнее локально догруженного. */
const snimok = computed(() => props.progress ?? lokalniySnimok.value);
const shagi = computed<ShagRunnera[]>(() => snimok.value?.steps ?? []);

/**
 * Готовые скаляры для шаблона.
 *
 * Сужение типа через `v-if` в разметке ненадёжно для computed-значений,
 * поэтому все проверки на `null` сделаны один раз здесь.
 */
const estSnimok = computed(() => snimok.value !== null);
const zavershen = computed(() => snimok.value?.finished ?? false);
const uspeshno = computed(() => snimok.value?.success ?? false);
const vremyaObnovleniya = computed(() => snimok.value === null ? "" : convertTime(snimok.value.updatedAt));

const podpisSostoyaniya = computed(() => {
    if (!zavershen.value) {
        return props.deyatelniy
            ? i18n.global.t('opencode.chat.steps.in_progress')
            : i18n.global.t('opencode.chat.steps.empty');
    }

    return i18n.global.t('opencode.chat.steps.finished');
});

function poleShaga(shag: ShagRunnera, klyuch: string): string {
    const znachenie = shag[klyuch];

    if (znachenie === null || znachenie === undefined) {
        return "";
    }

    return typeof znachenie === "string" ? znachenie : JSON.stringify(znachenie);
}

function uspehShaga(shag: ShagRunnera): boolean | null {
    const znachenie = shag["Success"];

    return typeof znachenie === "boolean" ? znachenie : null;
}

function vremyaShaga(shag: ShagRunnera): string {
    const znachenie = shag["Unixtime"];

    return typeof znachenie === "number" ? convertTime(znachenie) : "";
}

/**
 * Дозагрузить снапшот при раскрытии.
 *
 * Ошибка загрузки не должна выглядеть как ошибка хода: она относится только
 * к отображению шагов и показывается внутри панели.
 */
async function raskritIPodgruzit() {
    raskrit.value = !raskrit.value;

    if (!raskrit.value || snimok.value !== null || zagruzhaem.value) {
        return;
    }

    zagruzhaem.value = true;
    oshibka.value = null;

    const response = await OpenCodeService.poluchitProgressHoda({turnId: props.turnId});

    zagruzhaem.value = false;

    if (response.status === "success") {
        lokalniySnimok.value = pohozheNaProgress(response.data) ? response.data : null;

        return;
    }

    oshibka.value = response.status === "fail" ? response.data.message : response.message;
}
</script>

<template>
  <div class="q-mt-sm">
    <q-btn
        dense
        flat
        size="sm"
        color="primary"
        :icon="raskrit ? 'expand_less' : 'expand_more'"
        :label="$t('opencode.chat.steps.caption')"
        :loading="zagruzhaem"
        @click="raskritIPodgruzit()"
    />

    <q-badge
        v-if="estSnimok"
        :color="zavershen ? (uspeshno ? 'positive' : 'negative') : 'primary'"
        class="q-ml-sm"
        :label="podpisSostoyaniya"
    />

    <div v-if="raskrit" class="q-mt-sm">
      <div v-if="oshibka" class="text-negative q-mb-xs">{{ oshibka }}</div>

      <div v-if="shagi.length === 0" class="text-grey-7 text-caption">
        {{ $t('opencode.chat.steps.empty') }}
      </div>

      <q-list v-else bordered separator dense class="rounded-borders">
        <q-item v-for="(shag, indeks) in shagi" :key="indeks">
          <q-item-section avatar>
            <q-icon
                :name="uspehShaga(shag) === false ? 'error' : (uspehShaga(shag) ? 'check_circle' : 'hourglass_empty')"
                :color="uspehShaga(shag) === false ? 'negative' : (uspehShaga(shag) ? 'positive' : 'grey')"
                size="18px"
            />
          </q-item-section>

          <q-item-section>
            <q-item-label class="text-caption text-weight-medium">
              {{ vremyaShaga(shag) }} · {{ poleShaga(shag, 'Command') }}
            </q-item-label>
            <q-item-label caption class="pre-wrap">{{ poleShaga(shag, 'Response') }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>

      <div v-if="estSnimok" class="text-caption text-grey-7 q-mt-xs">
        {{ $t('opencode.chat.steps.updated_at', { time: vremyaObnovleniya }) }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.pre-wrap {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
