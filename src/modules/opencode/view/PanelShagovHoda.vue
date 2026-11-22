<script setup lang="ts">
import { computed, ref } from "vue";
import { GhBanner, GhButton, GhIcon, GhLabel } from "@/components/ui";
import type { GhLabelVariant, OcticonName } from "@/components/ui";
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

const variantSostoyaniya = computed<GhLabelVariant>(() => {
    if (!zavershen.value) {
        return "accent";
    }

    return uspeshno.value ? "success" : "danger";
});

const ikonkaSostoyaniya = computed<OcticonName>(() => {
    if (!zavershen.value) {
        return "sync";
    }

    return uspeshno.value ? "check-circle" : "x-circle";
});

/**
 * Значение шага по списку возможных имён полей.
 *
 * Задачи Unitman приходят в PascalCase (`Command`, `Response`, `Success`,
 * `Unixtime`), а прогресс хода OpenCode — в camelCase (`command`, `response`,
 * `success`, `unixtime`). Панель должна читать оба варианта, иначе у ходов
 * OpenCode не отображается ни команда, ни вывод с текстом ошибки.
 */
function znachenieShaga(shag: ShagRunnera, klyuchi: readonly string[]): unknown {
    for (const klyuch of klyuchi) {
        if (shag[klyuch] !== null && shag[klyuch] !== undefined) {
            return shag[klyuch];
        }
    }

    return undefined;
}

function poleShaga(shag: ShagRunnera, ...klyuchi: string[]): string {
    const znachenie = znachenieShaga(shag, klyuchi);

    if (znachenie === null || znachenie === undefined) {
        return "";
    }

    return typeof znachenie === "string" ? znachenie : JSON.stringify(znachenie);
}

function uspehShaga(shag: ShagRunnera): boolean | null {
    const znachenie = znachenieShaga(shag, ["success", "Success"]);

    return typeof znachenie === "boolean" ? znachenie : null;
}

function vremyaShaga(shag: ShagRunnera): string {
    const znachenie = znachenieShaga(shag, ["unixtime", "Unixtime"]);

    return typeof znachenie === "number" ? convertTime(znachenie) : "";
}

/** Иконка статуса шага по паттерну P5. */
function ikonkaShaga(shag: ShagRunnera): OcticonName {
    const uspeh = uspehShaga(shag);

    if (uspeh === null) {
        return "clock";
    }

    return uspeh ? "check-circle" : "x-circle";
}

/** CSS-класс цвета иконки статуса шага. */
function klassShaga(shag: ShagRunnera): string {
    const uspeh = uspehShaga(shag);

    if (uspeh === null) {
        return "panel-shagov__step-icon--pending";
    }

    return uspeh
        ? "panel-shagov__step-icon--ok"
        : "panel-shagov__step-icon--fail";
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
  <div class="panel-shagov primer">
    <div class="panel-shagov__header">
      <GhButton
          variant="invisible"
          size="sm"
          :icon="raskrit ? 'chevron-up' : 'chevron-down'"
          :label="$t('opencode.chat.steps.caption')"
          :loading="zagruzhaem"
          @click="raskritIPodgruzit()"
      />

      <GhLabel
          v-if="estSnimok"
          :variant="variantSostoyaniya"
          :icon="ikonkaSostoyaniya"
          role="status"
          :label="podpisSostoyaniya"
      />
    </div>

    <div v-if="raskrit" class="panel-shagov__body">
      <GhBanner v-if="oshibka" variant="danger">{{ oshibka }}</GhBanner>

      <p v-if="shagi.length === 0" class="panel-shagov__empty">
        {{ $t('opencode.chat.steps.empty') }}
      </p>

      <ol v-else class="panel-shagov__list">
        <li v-for="(shag, indeks) in shagi" :key="indeks" class="panel-shagov__step">
          <GhIcon
              :name="ikonkaShaga(shag)"
              class="panel-shagov__step-icon"
              :class="klassShaga(shag)"
              :size="14"
          />

          <div class="panel-shagov__step-body">
            <div class="panel-shagov__step-head">
              <span class="gh-mono panel-shagov__time">{{ vremyaShaga(shag) }}</span>
              <code class="gh-mono panel-shagov__command">{{ poleShaga(shag, 'Command', 'command') }}</code>
            </div>

            <pre class="gh-mono panel-shagov__response">{{ poleShaga(shag, 'Response', 'response') }}</pre>
          </div>
        </li>
      </ol>

      <p v-if="estSnimok" class="panel-shagov__updated">
        {{ $t('opencode.chat.steps.updated_at', { time: vremyaObnovleniya }) }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.panel-shagov {
  margin-top: 6px;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.panel-shagov__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.panel-shagov__body {
  margin-top: 8px;
}

.panel-shagov__empty {
  margin: 4px 0 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.panel-shagov__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.panel-shagov__step {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-medium);
  background-color: var(--bgColor-muted);
}

.panel-shagov__step-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.panel-shagov__step-icon--ok {
  color: var(--fgColor-success);
}

.panel-shagov__step-icon--fail {
  color: var(--fgColor-danger);
}

.panel-shagov__step-icon--pending {
  color: var(--fgColor-muted);
}

.panel-shagov__step-body {
  min-width: 0;
  flex: 1 1 auto;
}

.panel-shagov__step-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.panel-shagov__time {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.panel-shagov__command {
  color: var(--fgColor-default);
  font-size: var(--fontSize-caption);
  font-weight: var(--fontWeight-semibold);
}

.panel-shagov__response {
  margin: 4px 0 0;
  max-height: 220px;
  overflow: auto;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-normal);
  white-space: pre-wrap;
  word-break: break-word;
}

.panel-shagov__updated {
  margin: 8px 0 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}
</style>
