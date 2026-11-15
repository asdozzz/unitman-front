<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import i18n from "@/bootstrap/translator";
import { useStorChataOpenCode } from "@/modules/opencode/store/StorChataOpenCode";
import { useStorSpiskaSessiyOpenCode } from "@/modules/opencode/store/StorSpiskaSessiyOpenCode";
import { useStorFormiPrivyazkiUnitaKSessii } from "@/modules/opencode/store/StorFormiPrivyazkiUnitaKSessii";
import FormaPrivyazkiUnitaKSessii from "@/modules/opencode/view/FormaPrivyazkiUnitaKSessii.vue";
import {
    normalizovatVoprosy,
    type ChernovikOtvetaOpenCode,
    type OtvetOpenCode,
} from "@/modules/opencode/model/ChatOpenCode";
import PanelShagovHoda from "@/modules/opencode/view/PanelShagovHoda.vue";
import { convertDate } from "@/utils/dates";
import type { Schema } from "@/api/types";

const props = defineProps<{ id: string }>();

const router = useRouter();
const stor = useStorChataOpenCode();
const storSessiy = useStorSpiskaSessiyOpenCode();
const formaPrivyazki = useStorFormiPrivyazkiUnitaKSessii();

const {
    hody,
    progress,
    rezhimProgressa,
    loaderIstorii,
    oshibkaIstorii,
    otpravka,
    oshibkaOtpravki,
    posledniyHod,
    voprosy,
    hodVipolnyaetsya,
} = storeToRefs(stor);

const sessiya = computed(() => storSessiy.spisok.find((element) => element.id === props.id) ?? null);

/** Привязанные к сессии юниты: в сессии хранятся только их идентификаторы. */
const privyazannieUniti = computed(() => sessiya.value?.units ?? []);

const zagolovok = computed(() => sessiya.value?.title ?? props.id);

/**
 * Сессия в архиве: бэкенд запрещает для неё новые ходы, поэтому ввод
 * блокируется ещё на клиенте, чтобы не получать отказ на каждый промпт.
 * История при этом остаётся доступной только для чтения.
 */
const arhivirovana = computed(() => sessiya.value?.archived === true);

/** Текст промпта, который пользователь набирает. */
const prompt = ref("");

/** Черновики ответов на вопросы текущего хода, по id вопроса. */
const chernoviki = ref<Record<string, ChernovikOtvetaOpenCode>>({});

const oblast = ref<HTMLElement | null>(null);

const indikatorProgressa = computed(() => {
    switch (rezhimProgressa.value) {
        case "live":
            return { cvet: "positive", ikonka: "wifi", klyuch: "opencode.chat.progress.live" };
        case "polling":
            return { cvet: "primary", ikonka: "sync", klyuch: "opencode.chat.progress.polling" };
        default:
            return { cvet: "grey", ikonka: "wifi_off", klyuch: "opencode.chat.progress.reconnecting" };
    }
});

/** Ключ перевода ошибки приходит с бэкенда; неизвестный ключ показываем как есть. */
function perevodKlyucha(klyuch: string | null | undefined): string | null {
    if (!klyuch) {
        return null;
    }

    return i18n.global.te(klyuch) ? i18n.global.t(klyuch) : klyuch;
}

function podpisStatusa(status: Schema<"OpenCodeTurn">["status"]): string {
    return `opencode.chat.status.${status}`;
}

function podpisVida(kind: NonNullable<Schema<"OpenCodeTurnResult">>["Kind"]): string {
    return `opencode.chat.kind.${kind}`;
}

/**
 * Текст ответа на вопрос из истории.
 *
 * В истории лежат уже нормализованные ответы (`questionId`, `optionId`, `text`),
 * а подписи вариантов — в `result.Questions` того же хода.
 */
function otvetNaVopros(hod: Schema<"OpenCodeTurn">, questionId: string): string {
    const otvet = hod.answers.find((element) => element.questionId === questionId);

    if (!otvet) {
        return "";
    }

    if (otvet.optionId) {
        const variant = normalizovatVoprosy(hod.result?.Questions)
            .find((vopros) => vopros.id === questionId)
            ?.options.find((option) => option.id === otvet.optionId);

        return variant?.label ?? otvet.optionId;
    }

    return otvet.text ?? "";
}

/** Ответ можно отправить, когда на каждый вопрос дан вариант или текст. */
const mozhnoOtvetit = computed(() => {
    if (voprosy.value.length === 0 || otpravka.value) {
        return false;
    }

    return voprosy.value.every((vopros) => {
        const chernovik = chernoviki.value[vopros.id];

        if (!chernovik) {
            return false;
        }

        return chernovik.optionId !== null || chernovik.text.trim() !== "";
    });
});

// Черновики пересобираются при смене набора вопросов, но уже введённое
// сохраняется: ход может обновить текст вопроса, не сбрасывая выбор.
watch(voprosy, (spisokVoprosov) => {
    const novie: Record<string, ChernovikOtvetaOpenCode> = {};

    for (const vopros of spisokVoprosov) {
        const stariy = chernoviki.value[vopros.id];

        novie[vopros.id] = {
            optionId: stariy?.optionId ?? null,
            text: stariy?.text ?? "",
        };
    }

    chernoviki.value = novie;
}, { immediate: true });

// Прокрутка вниз при появлении новой реплики: диалог читается сверху вниз.
watch(() => hody.value.length, async () => {
    await nextTick();

    if (oblast.value !== null) {
        oblast.value.scrollTop = oblast.value.scrollHeight;
    }
});

async function otpravitPrompt() {
    const tekst = prompt.value.trim();

    if (tekst === "" || otpravka.value || hodVipolnyaetsya.value) {
        return;
    }

    await stor.otpravitPrompt(tekst);

    // Очищаем только при успехе: при ошибке текст остаётся, чтобы не набирать заново.
    if (oshibkaOtpravki.value === null) {
        prompt.value = "";
    }
}

async function otvetit() {
    if (!mozhnoOtvetit.value) {
        return;
    }

    const otvety: OtvetOpenCode[] = voprosy.value.map((vopros) => {
        const chernovik = chernoviki.value[vopros.id];

        if (chernovik.optionId !== null) {
            return { questionId: vopros.id, optionId: chernovik.optionId, text: null };
        }

        return { questionId: vopros.id, optionId: null, text: chernovik.text.trim() };
    });

    await stor.otvetit(otvety);

    if (oshibkaOtpravki.value === null) {
        chernoviki.value = {};
    }
}

function vibratVariant(questionId: string, optionId: string) {
    const chernovik = chernoviki.value[questionId];

    if (!chernovik) {
        return;
    }

    // Выбор варианта исключает свободный текст: бэкенд принимает что-то одно.
    chernovik.optionId = optionId;
    chernovik.text = "";
}

/**
 * Значение поля свободного ответа.
 *
 * Обращение к `chernoviki[id].text` из шаблона упало бы, если ход обновил
 * вопросы между рендерами: черновик для нового id ещё не заведён. Геттер
 * подставляет пустую строку вместо несуществующего черновика.
 */
function tekstOtveta(questionId: string): string {
    return chernoviki.value[questionId]?.text ?? "";
}

/** Запись свободного ответа: черновик заводится при необходимости. */
function zapisatTekstOtveta(questionId: string, tekst: string) {
    chernoviki.value[questionId] = { optionId: null, text: tekst };
}

function vernutsyaKSpisku() {
    router.push({ name: "opencode_sessions" });
}

/** Открыть диалог привязки юнитов, исключив уже привязанные. */
function privyazatUniti() {
    formaPrivyazki.otkrit(
        props.id,
        privyazannieUniti.value.map((unit) => unit.unitId),
    );
}

onMounted(async () => {
    if (storSessiy.spisok.length === 0) {
        await storSessiy.poluchitSpisok();
    }

    await stor.otkritSessiyu(props.id);
});

onUnmounted(() => {
    // Таймеры и подписка не должны переживать экран: иначе опрос продолжится
    // в фоне и будет писать в стор уже другой сессии.
    stor.ostanovitNablyudenie();
});

// Переход между сессиями без размонтирования (например, из списка в чат)
// не должен оставлять наблюдение за прежним ходом.
watch(() => props.id, (noviyId) => {
    stor.otkritSessiyu(noviyId);
});
</script>

<template>
  <q-card class="column" style="height: calc(100vh - 90px)">
    <q-card-section class="bg-primary text-white row items-center q-gutter-x-sm">
      <q-btn dense flat icon="arrow_back" color="white" @click="vernutsyaKSpisku()">
        <q-tooltip>{{ $t('opencode.chat.buttons.back') }}</q-tooltip>
      </q-btn>

      <div class="col">
        <div class="text-subtitle2 ellipsis">
          {{ zagolovok }}
          <q-badge v-if="arhivirovana" color="grey-6" class="q-ml-sm">
            {{ $t('opencode.sessions.archive.badge') }}
          </q-badge>
        </div>
        <div v-if="sessiya" class="text-caption">
          {{ $t('opencode.chat.turn.seq', { seq: hody.length }) }} ·
          {{ $t('opencode.sessions.fields.updated_at') }}: {{ convertDate(sessiya.updatedAt) }}
        </div>
      </div>

      <q-badge :color="indikatorProgressa.cvet" class="q-mr-sm">
        <q-icon :name="indikatorProgressa.ikonka" size="12px" class="q-mr-xs" />
        {{ $t(indikatorProgressa.klyuch) }}
      </q-badge>

      <q-btn
          v-if="!arhivirovana"
          dense
          flat
          icon="create_new_folder"
          color="white"
          @click="privyazatUniti()"
      >
        <q-tooltip>{{ $t('opencode.chat.buttons.attach_unit') }}</q-tooltip>
      </q-btn>

      <q-btn
          dense
          flat
          icon="refresh"
          color="white"
          :loading="loaderIstorii"
          @click="stor.perezagruzitSessiyu()"
      >
        <q-tooltip>{{ $t('opencode.chat.buttons.refresh') }}</q-tooltip>
      </q-btn>
    </q-card-section>

    <q-card-section v-if="privyazannieUniti.length > 0" class="q-py-xs row items-center q-gutter-xs">
      <span class="text-caption text-grey-8">{{ $t('opencode.chat.units') }}:</span>
      <q-chip
          v-for="unit in privyazannieUniti"
          :key="'chat_unit_' + unit.unitId"
          dense
          square
          color="primary"
          text-color="white"
          icon="folder"
          :label="storSessiy.nazvanieUnitaPoId(unit.unitId)"
      />
    </q-card-section>

    <q-banner v-if="arhivirovana" dense class="bg-grey-3 text-grey-9">
      {{ $t('opencode.chat.archived_hint') }}
    </q-banner>

    <div ref="oblast" class="col q-pa-md" style="overflow-y: auto">
      <div v-if="oshibkaIstorii" class="text-negative q-mb-sm">
        {{ $t('opencode.chat.errors.load_history') }}: {{ oshibkaIstorii }}
      </div>

      <div v-if="loaderIstorii && hody.length === 0" class="row justify-center q-pa-lg">
        <q-spinner color="primary" size="2em" />
      </div>

      <div v-else-if="hody.length === 0 && !oshibkaIstorii" class="text-grey-7">
        {{ $t('opencode.chat.empty') }}
      </div>

      <div v-for="hod in hody" :key="hod.id" class="q-mb-lg">
        <div class="row items-center q-gutter-xs q-mb-xs">
          <q-badge color="grey-7" :label="$t('opencode.chat.turn.seq', { seq: hod.seq })" />
          <q-badge :color="hod.status === 'FAILED' ? 'negative' : 'primary'" outline :label="$t(podpisStatusa(hod.status))" />
          <q-badge v-if="hod.result" color="secondary" outline :label="$t(podpisVida(hod.result.Kind))" />
        </div>

        <!-- Реплика пользователя: промпт либо сводка ответов. -->
        <div class="row justify-end">
          <q-card flat bordered class="col-auto" style="max-width: 80%">
            <q-card-section class="text-caption text-grey-7 q-pb-none">
              {{ $t('opencode.chat.roles.user') }} · {{ convertDate(hod.createdAt) }}
            </q-card-section>
            <q-card-section class="pre-wrap">{{ hod.requestText }}</q-card-section>
          </q-card>
        </div>

        <!-- Реплика ассистента: ответ, вопросы или ошибка хода. -->
        <div class="row q-mt-sm">
          <q-card flat bordered class="col-auto bg-grey-1" style="max-width: 80%">
            <q-card-section class="text-caption text-grey-7 q-pb-none">
              {{ $t('opencode.chat.roles.assistant') }}
            </q-card-section>

            <q-card-section v-if="hod.result?.Kind === 'ANSWER'" class="pre-wrap">
              {{ hod.result.Answer }}
            </q-card-section>

            <q-card-section v-else-if="hod.result?.Kind === 'QUESTION'">
              <div v-for="vopros in normalizovatVoprosy(hod.result.Questions)" :key="vopros.id" class="q-mb-xs">
                <div class="text-weight-medium">{{ vopros.text }}</div>
                <div class="text-caption text-grey-8">
                  {{ otvetNaVopros(hod, vopros.id) }}
                </div>
              </div>
            </q-card-section>

            <q-card-section v-else-if="hod.result?.Kind === 'ERROR'" class="text-negative">
              {{ perevodKlyucha(hod.result.ErrorKey) ?? perevodKlyucha(hod.errorKey) }}
            </q-card-section>

            <q-card-section v-else-if="hod.status === 'RUNNING'" class="row items-center q-gutter-sm">
              <q-spinner color="primary" size="1.5em" />
              <span class="text-grey-8">{{ $t('opencode.chat.status.RUNNING') }}</span>
            </q-card-section>

            <!--
              Ошибка без результата: ход упал до того, как бэкенд собрал
              RezultatHodaOpenCode. Ветка стоит последней в цепочке, поэтому
              ход с result.Kind = ERROR уже показал текст выше и не задвоится.
            -->
            <q-card-section v-else-if="hod.errorKey" class="text-negative">
              {{ perevodKlyucha(hod.errorKey) }}
            </q-card-section>

            <q-card-section v-else-if="hod.status === 'AWAITING_INPUT'" class="text-grey-8">
              {{ $t('opencode.chat.status.AWAITING_INPUT') }}
            </q-card-section>

            <q-card-section class="q-pt-none">
              <PanelShagovHoda
                  :turn-id="hod.id"
                  :progress="posledniyHod !== null && posledniyHod.id === hod.id ? progress : null"
                  :deyatelniy="posledniyHod !== null && posledniyHod.id === hod.id && hodVipolnyaetsya"
              />
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!--
        Вопросы, на которые бэкенд ждёт ответа: это новый ход, а не правка старого.
        В архиве новые ходы запрещены, поэтому карточка не показывается даже если
        ответы остались неотправленными.
      -->
      <q-card v-if="voprosy.length > 0 && !arhivirovana" flat bordered class="bg-amber-1">
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">{{ $t('opencode.chat.questions.caption') }}</div>

          <div v-for="vopros in voprosy" :key="vopros.id" class="q-mb-md">
            <div class="text-weight-medium q-mb-xs">{{ vopros.text }}</div>

            <q-option-group
                :model-value="chernoviki[vopros.id]?.optionId ?? null"
                :options="vopros.options.map((option) => ({
                    value: option.id,
                    label: option.description ? `${option.label} — ${option.description}` : option.label,
                }))"
                type="radio"
                color="primary"
                dense
                @update:model-value="vibratVariant(vopros.id, String($event))"
            />

            <q-input
                v-if="vopros.allowFreeText"
                :model-value="tekstOtveta(vopros.id)"
                :label="$t('opencode.chat.questions.free_text')"
                filled
                dense
                class="q-mt-xs"
                @update:model-value="zapisatTekstOtveta(vopros.id, String($event))"
            />

            <div v-if="vopros.options.length === 0 && !vopros.allowFreeText" class="text-caption text-grey-8">
              {{ $t('opencode.chat.questions.select_option') }}
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
              color="primary"
              :label="$t('opencode.chat.questions.submit')"
              :loading="otpravka"
              :disable="!mozhnoOtvetit"
              @click="otvetit()"
          />
        </q-card-actions>
      </q-card>
    </div>

    <q-separator />

    <q-card-section class="q-py-sm">
      <div v-if="oshibkaOtpravki" class="text-negative q-mb-xs">{{ oshibkaOtpravki }}</div>

      <div class="row items-end q-gutter-sm">
        <q-input
            v-model="prompt"
            class="col"
            type="textarea"
            autogrow
            filled
            dense
            :placeholder="arhivirovana ? $t('opencode.chat.archived_placeholder') : $t('opencode.chat.placeholder')"
            :disable="arhivirovana || hodVipolnyaetsya || voprosy.length > 0"
            @keydown.enter.exact.prevent="otpravitPrompt()"
        />
        <q-btn
            color="primary"
            icon="send"
            :label="$t('opencode.chat.buttons.send')"
            :loading="otpravka"
            :disable="arhivirovana || prompt.trim() === '' || hodVipolnyaetsya || voprosy.length > 0"
            @click="otpravitPrompt()"
        />
      </div>

      <div v-if="voprosy.length > 0 && !arhivirovana" class="text-caption text-grey-7 q-mt-xs">
        {{ $t('opencode.chat.questions.caption') }}
      </div>
    </q-card-section>
  </q-card>

  <FormaPrivyazkiUnitaKSessii />
</template>

<style scoped>
.pre-wrap {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
