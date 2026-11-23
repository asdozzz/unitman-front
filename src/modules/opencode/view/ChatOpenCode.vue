<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useQuasar } from "quasar";
import { useRoute, useRouter } from "vue-router";
import i18n from "@/bootstrap/translator";
import {
    GhBanner,
    GhBox,
    GhButton,
    GhEmptyState,
    GhIcon,
    GhInput,
    GhLabel,
    GhSelect,
    GhSkeleton,
} from "@/components/ui";
import type { GhLabelVariant, GhSelectOption, OcticonName } from "@/components/ui";
import { useStorChataOpenCode } from "@/modules/opencode/store/StorChataOpenCode";
import { useStorSpiskaSessiyOpenCode } from "@/modules/opencode/store/StorSpiskaSessiyOpenCode";
import { useStorFormiPrivyazkiUnitaKSessii } from "@/modules/opencode/store/StorFormiPrivyazkiUnitaKSessii";
import FormaPrivyazkiUnitaKSessii from "@/modules/opencode/view/FormaPrivyazkiUnitaKSessii.vue";
import {
    normalizovatVoprosy,
    type ChernovikOtvetaOpenCode,
    type OtvetOpenCode,
} from "@/modules/opencode/model/ChatOpenCode";
import { statusTranzitniy, type Workspace } from "@/modules/opencode/model/Workspace";
import type { TipSessiiChata } from "@/modules/opencode/store/StorChataOpenCode";
import { useStorPomoschnikaSsylkiWorkspace } from "@/modules/opencode/store/StorPomoschnikaSsylkiWorkspace";
import { useStorSpiskaRekvizitovOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/StorSpiskaRekvizitovOpenCode";
import {
    modeliRekvizitov,
    modelIzObekta,
    modelPoUmolchaniyu as modelPoUmolchaniyuRekvizitov,
} from "@/modules/opencode/model/ModeliOpenCode";
import PanelShagovHoda from "@/modules/opencode/view/PanelShagovHoda.vue";
import WorkspaceStatusBadge from "@/modules/opencode/view/Workspace/WorkspaceStatusBadge.vue";
import OknoSsylkiWorkspace from "@/modules/opencode/view/Workspace/OknoSsylkiWorkspace.vue";
import { convertDate } from "@/utils/dates";
import type { Schema } from "@/api/types";

const props = defineProps<{ id: string }>();

const router = useRouter();
const route = useRoute();
const $q = useQuasar();
const stor = useStorChataOpenCode();
const storSessiy = useStorSpiskaSessiyOpenCode();
const storRekvizitov = useStorSpiskaRekvizitovOpenCode();
const formaPrivyazki = useStorFormiPrivyazkiUnitaKSessii();
const storPomoschnika = useStorPomoschnikaSsylkiWorkspace();

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
    estWorkspace,
    mozhnoOtpravlyat,
    workspace,
    oshibkaSostoyaniyaWorkspace,
    model,
} = storeToRefs(stor);

const sessiya = computed(() => storSessiy.spisok.find((element) => element.id === props.id) ?? null);

/** Реквизиты открытой сессии: из них берётся каталог моделей. */
const rekvizitySessii = computed(() => {
    const credentialId = sessiya.value?.credentialId ?? "";

    return credentialId === "" ? null : storRekvizitov.rekvizityPoId(credentialId);
});

/** Модель сессии из read-модели (поле появилось раньше OpenAPI-схемы). */
const modelSessii = computed<string | null>(() => modelIzObekta(sessiya.value));

/** Дефолтная модель реквизитов — последний шаг цепочки выбора. */
const modelRekvizitov = computed<string | null>(() =>
    modelPoUmolchaniyuRekvizitov(rekvizitySessii.value) || null,
);

/** Опции моделей реквизитов сессии. */
const optsModelei = computed<GhSelectOption[]>(() =>
    modeliRekvizitov(rekvizitySessii.value).map((nazvanie) => ({ value: nazvanie, label: nazvanie })),
);

/** Смена модели действует только на последующие ходы. */
function izmenitModel(value: string | number | null): void {
    stor.ustanovitModel(value === null ? null : String(value));
}

/**
 * Тип сессии из query.
 *
 * Список и уведомления передают его, чтобы чат не делал лишний probe-запрос.
 * Отсутствие параметра означает «тип неизвестен» — тогда тип определяется
 * запросом состояния workspace.
 */
const tipIzQuery = computed<TipSessiiChata | null>(() => {
    if (route.query.type === "workspace") {
        return "workspace";
    }

    if (route.query.type === "unit") {
        return "unit";
    }

    return null;
});

/** Привязанные к сессии юниты: в сессии хранятся только их идентификаторы. */
const privyazannieUniti = computed(() => sessiya.value?.units ?? []);

/** Проекты workspace: для workspace вместо юнитов показываются они. */
const proektyWorkspace = computed(() => workspace.value?.projects ?? []);

/** Кнопка помощника ссылки доступна только у работающего workspace. */
const mozhnoOtkritPomoschnik = computed(() => estWorkspace.value && statusWorkspace.value === "RUNNING");

/** Подпись проекта: ветка проекта либо общая ветка workspace (старые данные). */
function podpisProekta(project: Workspace["projects"][number]): string {
    const vetka = project.branch || workspace.value?.branch || "";

    return `${project.projectName} · ${vetka}`;
}

function otkritPomoschnik(): void {
    if (workspace.value !== null) {
        storPomoschnika.otkrit(workspace.value);
    }
}

const zagolovok = computed(() => workspace.value?.name ?? sessiya.value?.title ?? props.id);

const statusWorkspace = computed(() => workspace.value?.status ?? null);

const workspaceTranzitniy = computed(() => {
    return statusWorkspace.value !== null && statusTranzitniy(statusWorkspace.value);
});

/**
 * Сессия в архиве: бэкенд запрещает для неё новые ходы, поэтому ввод
 * блокируется ещё на клиенте, чтобы не получать отказ на каждый промпт.
 * История при этом остаётся доступной только для чтения.
 */
const arhivirovana = computed(() => {
    if (estWorkspace.value) {
        return workspace.value?.archived === true || workspace.value?.status === "ARCHIVED";
    }

    return sessiya.value?.archived === true;
});

/** Ввод недоступен: архив, workspace не в RUNNING или ход ещё идёт. */
const vvodZablokirovan = computed(() => arhivirovana.value || !mozhnoOtpravlyat.value || voprosy.value.length > 0);

/** Текст промпта, который пользователь набирает. */
const prompt = ref("");

/** Черновики ответов на вопросы текущего хода, по id вопроса. */
const chernoviki = ref<Record<string, ChernovikOtvetaOpenCode>>({});

const oblast = ref<HTMLElement | null>(null);

/** Показатель канала прогресса; иконки и варианты — из Primer. */
type IndikatorProgressa = {
    variant: GhLabelVariant;
    ikonka: OcticonName;
    klyuch: string;
};

const indikatorProgressa = computed<IndikatorProgressa>(() => {
    switch (rezhimProgressa.value) {
        case "live":
            return { variant: "success", ikonka: "broadcast", klyuch: "opencode.chat.progress.live" };
        case "polling":
            return { variant: "accent", ikonka: "sync", klyuch: "opencode.chat.progress.polling" };
        default:
            return { variant: "neutral", ikonka: "clock", klyuch: "opencode.chat.progress.reconnecting" };
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

    if (tekst === "" || otpravka.value || !mozhnoOtpravlyat.value) {
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
    void router.push({ name: estWorkspace.value ? "opencode_workspaces" : "opencode_sessions" });
}

/** Открыть диалог привязки юнитов, исключив уже привязанные. */
function privyazatUniti() {
    formaPrivyazki.otkrit(
        props.id,
        privyazannieUniti.value.map((unit) => unit.unitId),
    );
}

function vosstanovitWorkspace() {
    void stor.vosstanovitWorkspace();
}

/** Удаление необратимо: после запуска возвращаемся к списку workspace. */
function udalitWorkspace() {
    $q.dialog({
        title: i18n.global.t("opencode.workspace.delete.caption"),
        message: i18n.global.t("opencode.workspace.delete.message", { name: zagolovok.value }),
        persistent: true,
        ok: {
            label: i18n.global.t("common.buttons.delete"),
            color: "negative",
            unelevated: true,
        },
        cancel: { label: i18n.global.t("common.buttons.cancel"), flat: true },
    }).onOk(async () => {
        if (await stor.udalitWorkspace()) {
            void router.push({ name: "opencode_workspaces" });
        }
    });
}

onMounted(async () => {
    if (storSessiy.spisok.length === 0) {
        await storSessiy.poluchitSpisok();
    }

    await stor.otkritSessiyu(
        props.id,
        tipIzQuery.value,
        modelSessii.value,
        modelRekvizitov.value,
    );
});

onUnmounted(() => {
    // Таймеры и подписка не должны переживать экран: иначе опрос продолжится
    // в фоне и будет писать в стор уже другой сессии.
    stor.ostanovitNablyudenie();
    stor.ostanovitOprosSostoyaniyaWorkspace();
});

// Переход между сессиями без размонтирования (например, из списка в чат)
// не должен оставлять наблюдение за прежним ходом.
watch(() => props.id, (noviyId) => {
    void stor.otkritSessiyu(
        noviyId,
        tipIzQuery.value,
        modelSessii.value,
        modelRekvizitov.value,
    );
});
</script>

<template>
  <div class="opencode-chat primer column">
    <header class="opencode-chat__header">
      <GhButton
          variant="invisible"
          icon="arrow-left"
          :aria-label="$t('opencode.chat.buttons.back')"
          :title="$t('opencode.chat.buttons.back')"
          @click="vernutsyaKSpisku()"
      />

      <div class="opencode-chat__heading">
        <div class="opencode-chat__title-row">
          <span class="opencode-chat__title" :title="zagolovok">
            {{ zagolovok }}
            <q-tooltip>{{ zagolovok }}</q-tooltip>
          </span>

          <WorkspaceStatusBadge
              v-if="estWorkspace && statusWorkspace"
              :status="statusWorkspace"
          />

          <GhLabel
              v-if="arhivirovana"
              variant="neutral"
              icon="archive"
              :label="$t('opencode.sessions.archive.badge')"
          />

          <span v-if="sessiya" class="opencode-chat__meta">
            {{ $t('opencode.chat.turn.seq', { seq: hody.length }) }} ·
            {{ $t('opencode.sessions.fields.updated_at') }}: {{ convertDate(sessiya.updatedAt) }}
          </span>
        </div>
      </div>

      <span class="opencode-chat__spacer" />

      <div class="opencode-chat__model-select">
        <GhSelect
            :model-value="model"
            :options="optsModelei"
            size="sm"
            use-input
            hide-selected
            fill-input
            :disabled="arhivirovana"
            :placeholder="$t('opencode.rekvizity.fields.default_model')"
            @update:model-value="izmenitModel"
        />
      </div>

      <GhLabel
          :variant="indikatorProgressa.variant"
          :icon="indikatorProgressa.ikonka"
          role="status"
          :label="$t(indikatorProgressa.klyuch)"
      />

      <a
          v-if="estWorkspace && workspace?.ideLink"
          class="opencode-chat__icon-link"
          :href="workspace.ideLink"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="$t('opencode.workspace.buttons.open_ide')"
          :title="$t('opencode.workspace.buttons.open_ide')"
      >
        <GhIcon name="link-external" />
      </a>

      <GhButton
          v-if="mozhnoOtkritPomoschnik"
          variant="invisible"
          size="sm"
          icon="link"
          :aria-label="$t('opencode.workspace.helper.open_button')"
          :title="$t('opencode.workspace.helper.open_button')"
          @click="otkritPomoschnik()"
      />

      <GhButton
          v-if="!arhivirovana && !estWorkspace"
          variant="invisible"
          size="sm"
          icon="link"
          :aria-label="$t('opencode.chat.buttons.attach_unit')"
          :title="$t('opencode.chat.buttons.attach_unit')"
          @click="privyazatUniti()"
      />

      <GhButton
          variant="invisible"
          size="sm"
          icon="sync"
          :aria-label="$t('opencode.chat.buttons.refresh')"
          :title="$t('opencode.chat.buttons.refresh')"
          :loading="loaderIstorii"
          @click="stor.perezagruzitSessiyu()"
      />
    </header>

    <div v-if="estWorkspace" class="opencode-chat__chips">
      <span class="opencode-chat__chips-label">{{ $t('opencode.sessions.fields.projects') }}:</span>
      <GhLabel
          v-for="project in proektyWorkspace"
          :key="'chat_project_' + project.projectId"
          variant="neutral"
          icon="project"
          :title="podpisProekta(project)"
      >
        {{ podpisProekta(project) }}
        <GhIcon
            v-if="!project.canPush"
            name="lock"
            :size="12"
            :title="$t('opencode.workspace.badges.no_push_project')"
        />
      </GhLabel>
    </div>

    <div v-else-if="privyazannieUniti.length > 0" class="opencode-chat__chips">
      <span class="opencode-chat__chips-label">{{ $t('opencode.chat.units') }}:</span>
      <GhLabel
          v-for="unit in privyazannieUniti"
          :key="'chat_unit_' + unit.unitId"
          variant="neutral"
          icon="project"
          :label="storSessiy.nazvanieUnitaPoId(unit.unitId)"
          :title="storSessiy.nazvanieUnitaPoId(unit.unitId)"
      />
    </div>

    <!-- Workspace: контейнер ещё разворачивается, архивируется или удаляется. -->
    <GhBanner
        v-if="estWorkspace && workspaceTranzitniy"
        variant="accent"
        icon="sync"
        class="opencode-chat__banner"
    >
      {{ $t(`opencode.workspace.chat.transient.${statusWorkspace}`) }}
    </GhBanner>

    <!-- Workspace: операция завершилась ошибкой; можно восстановить или удалить. -->
    <GhBanner
        v-if="estWorkspace && statusWorkspace === 'ERROR'"
        variant="danger"
        class="opencode-chat__banner"
    >
      {{ perevodKlyucha(oshibkaSostoyaniyaWorkspace) ?? perevodKlyucha(workspace?.errorKey) ?? $t('opencode.workspace.errors.operation_failed') }}

      <template #actions>
        <GhButton
            size="sm"
            :label="$t('opencode.workspace.buttons.restore')"
            @click="vosstanovitWorkspace()"
        />
        <GhButton
            size="sm"
            variant="danger"
            :label="$t('opencode.workspace.buttons.delete')"
            @click="udalitWorkspace()"
        />
      </template>
    </GhBanner>

    <GhBanner
        v-if="arhivirovana"
        variant="accent"
        icon="archive"
        class="opencode-chat__banner"
    >
      {{ $t('opencode.chat.archived_hint') }}

      <template v-if="estWorkspace" #actions>
        <GhButton
            size="sm"
            :label="$t('opencode.workspace.buttons.restore')"
            @click="vosstanovitWorkspace()"
        />
      </template>
    </GhBanner>

    <div ref="oblast" class="opencode-chat__scroll">
      <GhBanner v-if="oshibkaIstorii" variant="danger" class="opencode-chat__banner">
        {{ $t('opencode.chat.errors.load_history') }}: {{ oshibkaIstorii }}
        <template #actions>
          <GhButton
              size="sm"
              :label="$t('common.buttons.retry')"
              @click="stor.perezagruzitSessiyu()"
          />
        </template>
      </GhBanner>

      <div v-if="loaderIstorii && hody.length === 0" class="opencode-chat__loading">
        <GhSkeleton v-for="n in 3" :key="'chat-skeleton-' + n" height="64px" />
      </div>

      <GhEmptyState
          v-else-if="hody.length === 0 && !oshibkaIstorii"
          icon="comment-discussion"
          :title="$t('opencode.chat.empty')"
          :description="$t('opencode.chat.placeholder')"
      />

      <div v-for="hod in hody" :key="hod.id" class="opencode-chat__turn">
        <!-- Реплика пользователя: промпт либо сводка ответов. -->
        <div class="opencode-chat__message opencode-chat__message--user">
          <div class="opencode-chat__bubble opencode-chat__bubble--user">
            <div class="opencode-chat__bubble-meta">
              {{ $t('opencode.chat.roles.user') }} · {{ $t('opencode.chat.turn.seq', { seq: hod.seq }) }} · {{ convertDate(hod.createdAt) }}
            </div>
            <div class="pre-wrap">{{ hod.requestText }}</div>
          </div>
        </div>

        <!-- Реплика ассистента: ответ, вопросы или ошибка хода. -->
        <div class="opencode-chat__message opencode-chat__message--assistant">
          <div class="opencode-chat__bubble opencode-chat__bubble--assistant">
            <div class="opencode-chat__bubble-meta">
              {{ $t('opencode.chat.roles.assistant') }} ·
              <span
                  class="opencode-chat__turn-status"
                  :class="hod.status === 'FAILED' ? 'opencode-chat__turn-status--fail' : 'opencode-chat__turn-status--ok'"
              >{{ $t(podpisStatusa(hod.status)) }}</span>
              <template v-if="hod.result"> · {{ $t(podpisVida(hod.result.Kind)) }}</template>
              <template v-if="modelIzObekta(hod)"> · {{ modelIzObekta(hod) }}</template>
            </div>

            <div v-if="hod.result?.Kind === 'ANSWER'" class="pre-wrap">
              {{ hod.result.Answer }}
            </div>

            <div v-else-if="hod.result?.Kind === 'QUESTION'">
              <div v-for="vopros in normalizovatVoprosy(hod.result.Questions)" :key="vopros.id" class="opencode-chat__question">
                <div class="opencode-chat__question-title">{{ vopros.text }}</div>
                <div class="opencode-chat__question-answer">
                  {{ otvetNaVopros(hod, vopros.id) }}
                </div>
              </div>
            </div>

            <div v-else-if="hod.result?.Kind === 'ERROR'" class="opencode-chat__error">
              <div>
                {{ perevodKlyucha(hod.result.ErrorKey) ?? perevodKlyucha(hod.errorKey) ?? $t('opencode.turn.failed') }}
              </div>
              <div v-if="hod.result.ErrorMessage" class="pre-wrap opencode-chat__error-detail">
                {{ hod.result.ErrorMessage }}
              </div>
            </div>

            <div v-else-if="hod.status === 'RUNNING'" class="opencode-chat__running">
              <GhIcon name="sync" class="opencode-chat__spin" />
              <span>{{ $t('opencode.chat.status.RUNNING') }}</span>
            </div>

            <!--
              Ошибка без результата: ход упал до того, как бэкенд собрал
              RezultatHodaOpenCode. Ветка стоит последней в цепочке, поэтому
              ход с result.Kind = ERROR уже показал текст выше и не задвоится.
            -->
            <div v-else-if="hod.errorKey" class="opencode-chat__error">
              {{ perevodKlyucha(hod.errorKey) ?? $t('opencode.turn.failed') }}
            </div>

            <!--
              Ход упал, но ни результата, ни ключа ошибки нет (например, старые
              записи или нарушение контракта раннера). Без этой ветки карточка
              ассистента оставалась бы пустой и пользователь не увидел бы даже
              общего текста ошибки.
            -->
            <div v-else-if="hod.status === 'FAILED'" class="opencode-chat__error">
              {{ $t('opencode.turn.failed') }}
            </div>

            <div v-else-if="hod.status === 'AWAITING_INPUT'" class="opencode-chat__muted">
              {{ $t('opencode.chat.status.AWAITING_INPUT') }}
            </div>

            <PanelShagovHoda
                :turn-id="hod.id"
                :progress="posledniyHod !== null && posledniyHod.id === hod.id ? progress : null"
                :deyatelniy="posledniyHod !== null && posledniyHod.id === hod.id && hodVipolnyaetsya"
            />
          </div>
        </div>
      </div>

      <!--
        Вопросы, на которые бэкенд ждёт ответа: это новый ход, а не правка старого.
        В архиве новые ходы запрещены, поэтому карточка не показывается даже если
        ответы остались неотправленными.
      -->
      <GhBox
          v-if="voprosy.length > 0 && !arhivirovana"
          padding="md"
          class="opencode-chat__questions"
      >
        <template #header>
          <span>{{ $t('opencode.chat.questions.caption') }}</span>
        </template>

        <div v-for="vopros in voprosy" :key="vopros.id" class="opencode-chat__question">
          <div class="opencode-chat__question-title">{{ vopros.text }}</div>

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

          <GhInput
              v-if="vopros.allowFreeText"
              :model-value="tekstOtveta(vopros.id)"
              :placeholder="$t('opencode.chat.questions.free_text')"
              class="opencode-chat__free-text"
              @update:model-value="zapisatTekstOtveta(vopros.id, String($event))"
          />

          <div
              v-if="vopros.options.length === 0 && !vopros.allowFreeText"
              class="opencode-chat__muted"
          >
            {{ $t('opencode.chat.questions.select_option') }}
          </div>
        </div>

        <template #footer>
          <GhButton
              variant="primary"
              :label="$t('opencode.chat.questions.submit')"
              :loading="otpravka"
              :disabled="!mozhnoOtvetit"
              @click="otvetit()"
          />
        </template>
      </GhBox>
    </div>

    <footer class="opencode-chat__composer">
      <GhBanner v-if="oshibkaOtpravki" variant="danger" class="opencode-chat__send-error">
        {{ oshibkaOtpravki }}
      </GhBanner>

      <div class="opencode-chat__composer-row">
        <div class="opencode-chat__composer-input">
          <GhInput
              v-model="prompt"
              size="md"
              :placeholder="arhivirovana
                ? $t('opencode.chat.archived_placeholder')
                : (!mozhnoOtpravlyat ? $t('opencode.workspace.chat.waiting') : $t('opencode.chat.placeholder'))"
              :disabled="vvodZablokirovan"
              @keydown.enter.exact.prevent="otpravitPrompt()"
          />
        </div>

        <GhButton
            variant="primary"
            size="md"
            icon="arrow-up"
            :aria-label="$t('opencode.chat.buttons.send')"
            :title="$t('opencode.chat.buttons.send')"
            :loading="otpravka"
            :disabled="vvodZablokirovan || prompt.trim() === ''"
            @click="otpravitPrompt()"
        />
      </div>

      <div v-if="voprosy.length > 0 && !arhivirovana" class="opencode-chat__hint">
        {{ $t('opencode.chat.questions.caption') }}
      </div>
    </footer>
  </div>

  <FormaPrivyazkiUnitaKSessii />
  <OknoSsylkiWorkspace />
</template>

<style scoped>
.opencode-chat {
  height: calc(100vh - 96px);
  overflow: hidden;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-large);
  background-color: var(--bgColor-default);
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
}

.opencode-chat__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--borderColor-default);
  background-color: var(--bgColor-muted);
}

.opencode-chat__heading {
  min-width: 0;
  flex: 1 1 200px;
}

.opencode-chat__title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.opencode-chat__title {
  min-width: 0;
  overflow: hidden;
  color: var(--fgColor-default);
  font-size: var(--fontSize-title);
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.opencode-chat__meta {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  white-space: nowrap;
}

.opencode-chat__spacer {
  flex: 1 1 auto;
}

.opencode-chat__model-select {
  flex: 0 0 200px;
  min-width: 140px;
}

.opencode-chat__icon-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--borderRadius-medium);
  color: var(--fgColor-default);
}

.opencode-chat__icon-link:hover {
  background-color: var(--bgColor-neutral-muted);
}

.opencode-chat__chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--borderColor-default);
}

.opencode-chat__chips-label {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.opencode-chat__banner {
  margin: 8px 12px 0;
}

.opencode-chat__scroll {
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 12px;
}

.opencode-chat__loading {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.opencode-chat__turn {
  margin-bottom: 12px;
}

.opencode-chat__message {
  display: flex;
}

.opencode-chat__message--user {
  justify-content: flex-end;
}

.opencode-chat__message--assistant {
  justify-content: flex-start;
  margin-top: 6px;
}

.opencode-chat__bubble {
  max-width: 80%;
  padding: 8px 12px;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-large);
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-normal);
  word-break: break-word;
}

.opencode-chat__bubble--user {
  background-color: var(--bgColor-accent-muted);
  border-color: var(--borderColor-accent-muted);
}

.opencode-chat__bubble--assistant {
  background-color: var(--bgColor-muted);
}

.opencode-chat__bubble-meta {
  margin-bottom: 2px;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.opencode-chat__turn-status {
  font-weight: var(--fontWeight-semibold);
}

.opencode-chat__turn-status--ok {
  color: var(--fgColor-accent);
}

.opencode-chat__turn-status--fail {
  color: var(--fgColor-danger);
}

.opencode-chat__muted {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.opencode-chat__error {
  color: var(--fgColor-danger);
}

.opencode-chat__error-detail {
  margin-top: 4px;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.opencode-chat__running {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--fgColor-muted);
}

.opencode-chat__spin {
  color: var(--fgColor-accent);
  animation: opencode-spin 1s linear infinite;
}

.opencode-chat__question {
  margin-bottom: 8px;
}

.opencode-chat__question-title {
  font-weight: var(--fontWeight-semibold);
}

.opencode-chat__question-answer {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.opencode-chat__questions {
  margin-top: 8px;
}

.opencode-chat__free-text {
  margin-top: 8px;
}

.opencode-chat__composer {
  padding: 8px 12px;
  border-top: 1px solid var(--borderColor-default);
  background-color: var(--bgColor-muted);
}

.opencode-chat__send-error {
  margin-bottom: 8px;
}

.opencode-chat__composer-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.opencode-chat__composer-input {
  min-width: 0;
  flex: 1 1 auto;
}

.opencode-chat__hint {
  margin-top: 4px;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.pre-wrap {
  white-space: pre-wrap;
  word-break: break-word;
}

@keyframes opencode-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .opencode-chat {
    height: calc(100vh - 80px);
    border-radius: var(--borderRadius-medium);
  }

  .opencode-chat__bubble {
    max-width: 100%;
  }

  .opencode-chat__scroll {
    padding: 12px;
  }
}
</style>
