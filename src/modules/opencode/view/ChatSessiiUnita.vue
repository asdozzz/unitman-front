<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import {
    GhBanner,
    GhButton,
    GhIcon,
    GhInput,
    GhLabel,
    GhSelect,
    GhSkeleton,
} from "@/components/ui";
import type { GhSelectOption } from "@/components/ui";
import { useStorChataSessiiUnita } from "@/modules/opencode/store/StorChataSessiiUnita";
import type { UnitSessionAnswer } from "@/modules/opencode/model/UnitSession";

const props = defineProps<{ id: string }>();

const router = useRouter();
const stor = useStorChataSessiiUnita();
const {
    session,
    sostoyanie,
    hody,
    prompt,
    model,
    dostupnieModeli,
    loader,
    otpravka,
    oshibka,
    mozhnoOtpravlyat,
    readOnly,
    prichinaReadOnly,
} = storeToRefs(stor);

/** Опции моделей реквизитов сессии. */
const optsModelei = computed<GhSelectOption[]>(() =>
    dostupnieModeli.value.map((nazvanie) => ({ value: nazvanie, label: nazvanie })),
);

/** Смена модели действует только на последующие ходы. */
function izmenitModel(value: string | number | null): void {
    stor.ustanovitModel(value === null ? null : String(value));
}

const zagolovok = computed<string>(() => {
    return session.value?.title || sostoyanie.value?.unitId || props.id;
});

const prichinaTekst = computed<string>(() => {
    const prichiny: Record<string, string> = {
        edit_disabled: "opencode.unit_sessions.read_only.edit_disabled",
        protected_branch: "opencode.unit_sessions.read_only.protected_branch",
        no_token: "opencode.unit_sessions.read_only.no_token",
        not_editor: "opencode.unit_sessions.read_only.not_editor",
    };

    return prichiny[prichinaReadOnly.value ?? "edit_disabled"] ?? "opencode.unit_sessions.read_only.edit_disabled";
});

function otvetit(hodId: string, questionId: string, optionId: string | null, text: string | null) {
    const answers: UnitSessionAnswer[] = [{
        // Бэкенд нового unit-сессионного агрегата ждёт PascalCase-ключи
        // (`QuestionId`/`OptionId`/`Text`).
        QuestionId: String(questionId),
        OptionId: optionId === null ? null : String(optionId),
        Text: text,
    }];

    void stor.otvetit(answers, hodId);
}

function zakrit() {
    stor.zakrit();
    void router.push({ name: "opencode_unit_sessions" });
}

onMounted(() => {
    void stor.otkrit(props.id);
});

onUnmounted(() => {
    stor.zakrit();
});
</script>

<template>
  <div class="unit-session-chat primer">
    <header class="unit-session-chat__header">
      <GhButton
          variant="invisible"
          size="sm"
          icon="arrow-left"
          :label="$t('opencode.unit_sessions.chat.back')"
          @click="zakrit"
      />
      <div class="unit-session-chat__title-block">
        <span class="unit-session-chat__title">{{ zagolovok }}</span>
        <span class="unit-session-chat__subtitle">
          {{ sostoyanie?.unitId ?? session?.unitId ?? "" }}
        </span>
      </div>
      <GhLabel v-if="readOnly" variant="neutral">
        {{ $t('opencode.unit_sessions.badges.read_only') }}
      </GhLabel>
      <div class="unit-session-chat__model-select">
        <GhSelect
            :model-value="model"
            :options="optsModelei"
            size="sm"
            use-input
            hide-selected
            fill-input
            :placeholder="$t('opencode.rekvizity.fields.default_model')"
            @update:model-value="izmenitModel"
        />
      </div>
      <GhButton
          v-if="session && !session.archived"
          variant="invisible"
          size="sm"
          icon="archive"
          :label="$t('opencode.unit_sessions.buttons.archive')"
          @click="stor.arhivirovat()"
      />
    </header>

    <GhBanner v-if="readOnly" variant="attention">
      {{ $t('opencode.unit_sessions.read_only.banner') }}: {{ $t(prichinaTekst) }}
    </GhBanner>

    <GhBanner v-if="oshibka" variant="danger">
      {{ oshibka }}
    </GhBanner>

    <div class="unit-session-chat__body">
      <div
          v-if="loader"
          class="unit-session-chat__loading"
          aria-busy="true"
          :aria-label="$t('opencode.unit_sessions.chat.loading')"
      >
        <GhSkeleton
            v-for="n in 3"
            :key="'unit-session-chat-skeleton-' + n"
            height="64px"
        />
      </div>

      <template v-else>
        <div
            v-for="hod in hody"
            :key="hod.id"
            class="unit-session-chat__turn"
        >
          <div class="unit-session-chat__user">{{ hod.requestText }}</div>

          <div
              v-if="hod.result?.Kind === 'ANSWER'"
              class="unit-session-chat__assistant"
          >
            {{ hod.result.Answer }}
          </div>

          <div v-if="hod.model" class="unit-session-chat__model-caption">
            {{ hod.model }}
          </div>

          <div
              v-else-if="hod.result?.Kind === 'ERROR'"
              class="unit-session-chat__error"
          >
            {{ hod.result.ErrorKey || hod.result.ErrorMessage || $t('opencode.unit_sessions.chat.error') }}
          </div>

          <div
              v-else-if="hod.status === 'AWAITING_INPUT'"
              class="unit-session-chat__questions"
          >
            <template v-for="question in hod.result?.Questions ?? []" :key="question.Id">
              <div class="unit-session-chat__question">{{ question.Text }}</div>
              <div class="unit-session-chat__options">
                <GhButton
                    v-for="option in question.Options ?? []"
                    :key="option.Id"
                    size="sm"
                    :label="option.Label"
                    :disabled="otpravka"
                    @click="otvetit(hod.id, question.Id, option.Id, null)"
                />
              </div>
            </template>
          </div>

          <div
              v-else-if="hod.status === 'RUNNING'"
              class="unit-session-chat__running"
              role="status"
              aria-live="polite"
          >
            <GhIcon name="sync" class="unit-session-chat__spin" />
            <span>{{ $t('opencode.unit_sessions.chat.waiting') }}</span>
          </div>
        </div>

        <div v-if="hody.length === 0" class="unit-session-chat__muted">
          {{ $t('opencode.unit_sessions.chat.empty') }}
        </div>
      </template>
    </div>

    <footer class="unit-session-chat__footer">
      <GhInput
          v-model="prompt"
          type="textarea"
          autogrow
          :placeholder="$t('opencode.unit_sessions.chat.placeholder')"
          :disabled="!mozhnoOtpravlyat || otpravka"
          @keydown.enter.exact.prevent="stor.otpravit()"
      />
      <GhButton
          variant="primary"
          icon="paper-airplane"
          :label="$t('opencode.unit_sessions.chat.send')"
          :loading="otpravka"
          :disabled="!mozhnoOtpravlyat || prompt.trim() === ''"
          @click="stor.otpravit()"
      />
    </footer>
  </div>
</template>

<style scoped>
.unit-session-chat {
  display: flex;
  flex-direction: column;
  gap: 12px;
  /* Фиксированная высота не даёт странице «дёргаться», когда содержимое
     тела подменяется лоадером или догружается история. */
  height: calc(100vh - 96px);
  padding: 16px;
}

.unit-session-chat__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.unit-session-chat__title-block {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
}

.unit-session-chat__title {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unit-session-chat__subtitle {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.unit-session-chat__model-select {
  flex: 0 0 200px;
  min-width: 140px;
}

.unit-session-chat__model-caption {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.unit-session-chat__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.unit-session-chat__turn {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.unit-session-chat__user,
.unit-session-chat__assistant,
.unit-session-chat__error {
  padding: 8px 12px;
  border-radius: var(--borderRadius-medium);
  white-space: pre-wrap;
}

.unit-session-chat__user {
  align-self: flex-end;
  max-width: 80%;
  background-color: var(--bgColor-accent-muted);
}

.unit-session-chat__assistant {
  max-width: 90%;
  border: 1px solid var(--borderColor-default);
  background-color: var(--bgColor-default);
}

.unit-session-chat__error {
  border: 1px solid var(--borderColor-danger-muted);
  color: var(--fgColor-danger);
}

.unit-session-chat__questions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-medium);
}

.unit-session-chat__question {
  font-weight: 600;
}

.unit-session-chat__options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.unit-session-chat__loading {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.unit-session-chat__muted {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.unit-session-chat__running {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--fgColor-muted);
}

.unit-session-chat__spin {
  color: var(--fgColor-accent);
  animation: unit-session-spin 1s linear infinite;
}

@keyframes unit-session-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.unit-session-chat__footer {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}
</style>
