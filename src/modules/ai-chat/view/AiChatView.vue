<script setup lang="ts">
/**
 * Экран AI-чата с инструментами, сгенерированными из OpenAPI.
 *
 * Вся логика цикла живёт в `useAiAgentChat`; view отвечает только за:
 * 1. выбор реквизитов/модели из существующего стора аккаунта;
 * 2. отрисовку ленты, боковой панели инструментов и карточки подтверждения;
 * 3. автоскролл, который не мешает пользователю, читающему историю выше.
 */
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import {
  GhBanner,
  GhButton,
  GhEmptyState,
  GhIcon,
  GhPageHeader,
} from "@/components/ui";
import {
  MAX_STEPS,
  useAiAgentChat,
} from "@/modules/ai-chat/composables/useAiAgentChat";
import { useStorSpiskaRekvizitovOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/StorSpiskaRekvizitovOpenCode";
import SoobshenieChata from "@/modules/ai-chat/view/components/SoobshenieChata.vue";
import StrokaInstrumenta from "@/modules/ai-chat/view/components/StrokaInstrumenta.vue";
import KartaPodtverzhdeniya from "@/modules/ai-chat/view/components/KartaPodtverzhdeniya.vue";
import PanelInstrumentov from "@/modules/ai-chat/view/components/PanelInstrumentov.vue";
import KompozerChata from "@/modules/ai-chat/view/components/KompozerChata.vue";
import VyborRekvizitov from "@/modules/ai-chat/view/components/VyborRekvizitov.vue";

const { t } = useI18n();
const router = useRouter();

const chat = useAiAgentChat();
const {
  messages,
  isRunning,
  stepCount,
  activeTools,
  pendingConfirmation,
} = chat;

const storSpiska = useStorSpiskaRekvizitovOpenCode();
const { spisok, loaderSpiska, oshibkaZagruzki } = storeToRefs(storSpiska);

const vybranniyId = ref<string | null>(null);
const vybrannayaModel = ref<string | null>(null);
const spisokZagruzhen = ref<boolean>(false);

const lenta = ref<HTMLElement | null>(null);
const derzhatsyaNiza = ref<boolean>(true);

/* ------------------------------ Реквизиты ------------------------------- */

/**
 * Приводит выбранные реквизиты/модель к валидным значениям и сообщает их
 * композаблу. Вызывается при загрузке списка и любом изменении выбора.
 */
function sinhronizirovatVybor(): void {
  const rekvizity = spisok.value;

  if (rekvizity.length === 0) {
    vybranniyId.value = null;
    vybrannayaModel.value = null;
    chat.setCredentials({ credentialId: null, model: null });

    return;
  }

  const tekushie = rekvizity.find((rekvizityItem) => rekvizityItem.id === vybranniyId.value);

  if (tekushie === undefined) {
    const pervie = rekvizity[0];
    vybranniyId.value = pervie.id;
    vybrannayaModel.value = pervie.defaultModel || pervie.models[0] || null;
  } else if (
    vybrannayaModel.value === null ||
    !tekushie.models.includes(vybrannayaModel.value)
  ) {
    vybrannayaModel.value = tekushie.defaultModel || tekushie.models[0] || null;
  }

  chat.setCredentials({
    credentialId: vybranniyId.value,
    model: vybrannayaModel.value,
  });
}

watch(spisok, sinhronizirovatVybor, { immediate: true });

function izmenitRekvizity(id: string | null): void {
  vybranniyId.value = id;
  sinhronizirovatVybor();
}

function izmenitModel(model: string | null): void {
  vybrannayaModel.value = model;
  chat.setCredentials({ model });
}

/* ------------------------------- Скролл -------------------------------- */

function obrabotatProkrutku(): void {
  const element = lenta.value;

  if (element === null) {
    return;
  }

  derzhatsyaNiza.value =
    element.scrollHeight - element.scrollTop - element.clientHeight < 96;
}

function prokrutitVNiz(prinuditelno = false): void {
  const element = lenta.value;

  if (element !== null && (prinuditelno || derzhatsyaNiza.value)) {
    element.scrollTop = element.scrollHeight;
  }
}

watch(
  () => messages.value.length,
  () => {
    void nextTick(() => prokrutitVNiz());
  },
);

watch(isRunning, (vipolnyaetsya) => {
  if (vipolnyaetsya) {
    derzhatsyaNiza.value = true;
  }

  void nextTick(() => prokrutitVNiz(vipolnyaetsya));
});

watch(pendingConfirmation, (znachenie) => {
  if (znachenie !== null) {
    derzhatsyaNiza.value = true;
    void nextTick(() => prokrutitVNiz(true));
  }
});

onMounted(async () => {
  await storSpiska.poluchitSpisok();
  spisokZagruzhen.value = true;

  await nextTick();
  prokrutitVNiz(true);
});

/* ------------------------------ Состояние ------------------------------- */

const pustayaLenta = computed<boolean>(() => messages.value.length === 0);

const netRekvizitov = computed<boolean>(
  () =>
    spisokZagruzhen.value &&
    oshibkaZagruzki.value === null &&
    spisok.value.length === 0,
);

const ozhidaetPodtverzhdeniya = computed<boolean>(
  () => pendingConfirmation.value !== null,
);

const mozhnoOtpravit = computed<boolean>(
  () =>
    !isRunning.value &&
    !ozhidaetPodtverzhdeniya.value &&
    spisok.value.length > 0,
);

/* ------------------------------- Действия ------------------------------- */

function otpravit(tekst: string): void {
  if (!mozhnoOtpravit.value) {
    return;
  }

  derzhatsyaNiza.value = true;
  void chat.send(tekst);
}

function ostanovit(): void {
  chat.stop();
}

function noviyChat(): void {
  chat.reset();
  derzhatsyaNiza.value = true;
  void nextTick(() => prokrutitVNiz(true));
}

function podtverdit(): void {
  pendingConfirmation.value?.confirm();
}

function otmenit(): void {
  pendingConfirmation.value?.cancel();
}

function otkrytNastroyki(): void {
  void router.push("/account/settings");
}
</script>

<template>
  <div class="ai-chat">
    <GhPageHeader
      :title="t('aiChat.page.title')"
      :description="t('aiChat.page.subtitle')"
    >
      <template #actions>
        <VyborRekvizitov
          v-if="spisok.length > 0"
          :credentials="spisok"
          :selected-id="vybranniyId"
          :selected-model="vybrannayaModel"
          :loading="loaderSpiska"
          :disabled="isRunning"
          @update:selected-id="izmenitRekvizity"
          @update:selected-model="izmenitModel"
        />
        <GhButton
          variant="default"
          icon="plus"
          :label="t('aiChat.page.new_chat')"
          :disabled="isRunning"
          @click="noviyChat"
        />
      </template>
    </GhPageHeader>

    <GhBanner
      v-if="oshibkaZagruzki"
      variant="danger"
      :title="t('aiChat.credentials.load_error_title')"
      class="ai-chat__banner"
    >
      {{ oshibkaZagruzki }}
    </GhBanner>

    <GhBanner
      v-else-if="netRekvizitov"
      variant="attention"
      :title="t('aiChat.credentials.no_credentials_title')"
      class="ai-chat__banner"
    >
      {{ t("aiChat.credentials.no_credentials_description") }}
      <template #actions>
        <GhButton
          size="sm"
          icon="gear"
          :label="t('aiChat.credentials.open_settings')"
          @click="otkrytNastroyki"
        />
      </template>
    </GhBanner>

    <div class="ai-chat__layout">
      <section class="ai-chat__main">
        <div
          ref="lenta"
          class="ai-chat__transcript"
          @scroll="obrabotatProkrutku"
        >
          <GhEmptyState
            v-if="pustayaLenta"
            icon="comment-discussion"
            :title="t('aiChat.empty.title')"
            :description="t('aiChat.empty.description')"
          />

          <template v-else>
            <template v-for="entry in messages" :key="entry.id">
              <StrokaInstrumenta
                v-if="entry.kind === 'tool'"
                :entry="entry"
              />
              <SoobshenieChata v-else :entry="entry" />
            </template>
          </template>

          <div v-if="isRunning && !ozhidaetPodtverzhdeniya" class="ai-chat__thinking">
            <GhIcon name="sync" class="ai-chat__spin" />
            <span>{{ t("aiChat.thinking") }}</span>
          </div>
        </div>

        <KartaPodtverzhdeniya
          v-if="pendingConfirmation"
          :pending="pendingConfirmation"
          @confirm="podtverdit"
          @cancel="otmenit"
        />

        <KompozerChata
          :disabled="!mozhnoOtpravit"
          :running="isRunning"
          :paused="ozhidaetPodtverzhdeniya"
          @send="otpravit"
          @stop="ostanovit"
        />
      </section>

      <aside class="ai-chat__aside">
        <PanelInstrumentov
          :tools="activeTools"
          :step-count="stepCount"
          :max-steps="MAX_STEPS"
        />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.ai-chat {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
  min-height: 480px;
}

.ai-chat__banner {
  flex-shrink: 0;
  margin-bottom: 12px;
}

.ai-chat__layout {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 16px;
  min-height: 0;
}

.ai-chat__main {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-medium);
  background-color: var(--bgColor-default);
}

.ai-chat__transcript {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  padding: 16px;
  overflow-y: auto;
}

.ai-chat__thinking {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.ai-chat__spin {
  animation: ai-chat-spin 1s linear infinite;
}

.ai-chat__aside {
  min-height: 0;
  overflow-y: auto;
}

@keyframes ai-chat-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1000px) {
  .ai-chat {
    height: auto;
    min-height: 0;
  }

  .ai-chat__layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .ai-chat__main {
    min-height: 60vh;
  }

  .ai-chat__aside {
    max-height: 50vh;
  }
}
</style>
