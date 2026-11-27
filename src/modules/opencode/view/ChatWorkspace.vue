<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import i18n from "@/bootstrap/translator";
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
import { useStorChataWorkspace } from "@/modules/opencode/store/StorChataWorkspace";
import WorkspaceService from "@/modules/opencode/services/WorkspaceService";
import OknoProsmotraFajla from "@/modules/opencode/view/Workspace/OknoProsmotraFajla.vue";
import { formatSize } from "@/modules/opencode/utils/formatSize";
import type {
    WorkspaceAnswer,
    WorkspaceAttachment,
    WorkspaceTurn,
} from "@/modules/opencode/model/WorkspaceSession";

const props = defineProps<{ id: string }>();

const router = useRouter();
const stor = useStorChataWorkspace();
const {
    workspace,
    sostoyanie,
    hody,
    prompt,
    model,
    dostupnieModeli,
    loader,
    otpravka,
    oshibka,
    mozhnoOtpravlyat,
} = storeToRefs(stor);

const zagolovok = computed<string>(() => workspace.value?.name || props.id);
const proekty = computed(() => sostoyanie.value?.projects ?? workspace.value?.projects ?? []);

/** Каталог моделей всех реквизитов: workspace не отдаёт `credentialId`. */
const optsModelei = computed<GhSelectOption[]>(() =>
    dostupnieModeli.value.map((nazvanie) => ({ value: nazvanie, label: nazvanie })),
);

/** Смена модели действует только на последующие ходы. */
function izmenitModel(value: string | number | null): void {
    stor.ustanovitModel(value === null ? null : String(value));
}

/**
 * Бэкенд присылает машинный ключ ошибки (`opencode.turn.awaiting_answer`).
 * Известный ключ переводим, неизвестный показываем как есть.
 */
const tekstOshibki = computed<string>(() => {
    const klyuch = oshibka.value;

    if (klyuch === null) {
        return "";
    }

    return i18n.global.te(klyuch) ? i18n.global.t(klyuch) : klyuch;
});

const vibraniyHodId = ref<string | null>(null);
const vibranoeVlozhenie = ref<WorkspaceAttachment | null>(null);
const oshibkaSkachivaniya = ref(false);

const oknoProsmotraOtkrito = computed<boolean>(() => vibranoeVlozhenie.value !== null);

/** Вложения конкретного хода; у легаси-ходов список пуст. */
function vlozheniyaHoda(hod: WorkspaceTurn): WorkspaceAttachment[] {
    return hod.result?.Attachments ?? [];
}

function otkritProsmotr(hodId: string, attachment: WorkspaceAttachment): void {
    vibraniyHodId.value = hodId;
    vibranoeVlozhenie.value = attachment;
}

function zakritProsmotr(value: boolean): void {
    if (value) {
        return;
    }

    vibranoeVlozhenie.value = null;
    vibraniyHodId.value = null;
}

async function skachatFajl(hodId: string, attachment: WorkspaceAttachment): Promise<void> {
    oshibkaSkachivaniya.value = false;

    const response = await WorkspaceService.poluchitSsylkuFajla({
        turnId: hodId,
        fileId: attachment.FileId,
    });

    if (response.status === "success") {
        window.open(response.data.url, "_blank", "noopener,noreferrer");

        return;
    }

    oshibkaSkachivaniya.value = true;
}

/** Клик по имени: preview для текстовых форматов, иначе — скачивание. */
function nazhatieNaImya(hodId: string, attachment: WorkspaceAttachment): void {
    if (attachment.Previewable) {
        otkritProsmotr(hodId, attachment);

        return;
    }

    void skachatFajl(hodId, attachment);
}

function otvetit(hodId: string, questionId: string, optionId: string | null) {
    const answers: WorkspaceAnswer[] = [{
        // Внутренняя модель хранит PascalCase; в camelCase для легаси-эндпоинта
        // её переводит WorkspaceService.otvetit.
        QuestionId: String(questionId),
        OptionId: optionId === null ? null : String(optionId),
        Text: null,
    }];

    void stor.otvetit(answers, hodId);
}

function zakrit() {
    stor.zakrit();
    void router.push({ name: "opencode_workspaces" });
}

onMounted(() => {
    void stor.otkrit(props.id);
});

onUnmounted(() => {
    stor.zakrit();
});
</script>

<template>
  <div class="workspace-chat primer">
    <header class="workspace-chat__header">
      <GhButton
          variant="invisible"
          size="sm"
          icon="arrow-left"
          :label="$t('opencode.workspace.chat.back')"
          @click="zakrit"
      />
      <div class="workspace-chat__title-block">
        <span class="workspace-chat__title">{{ zagolovok }}</span>
        <span class="workspace-chat__subtitle">{{ sostoyanie?.status ?? workspace?.status ?? "" }}</span>
      </div>
      <GhLabel v-if="sostoyanie?.readOnly ?? workspace?.readOnly" variant="neutral">
        {{ $t('opencode.workspace.badges.read_only') }}
      </GhLabel>
      <div class="workspace-chat__model-select">
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
          v-if="workspace && !workspace.archived"
          variant="invisible"
          size="sm"
          icon="archive"
          :label="$t('opencode.workspace.buttons.archive')"
          @click="stor.arhivirovat()"
      />
    </header>

    <div class="workspace-chat__projects">
      <GhLabel
          v-for="project in proekty"
          :key="project.projectId"
          variant="neutral"
      >
        {{ project.projectName }} · {{ project.branch }}
      </GhLabel>
    </div>

    <GhBanner v-if="oshibka" variant="danger">
      {{ tekstOshibki }}
    </GhBanner>

    <div class="workspace-chat__body">
      <div
          v-if="loader"
          class="workspace-chat__loading"
          aria-busy="true"
          :aria-label="$t('opencode.workspace.chat.loading')"
      >
        <GhSkeleton
            v-for="n in 3"
            :key="'workspace-chat-skeleton-' + n"
            height="64px"
        />
      </div>

      <template v-else>
        <div
            v-for="hod in hody"
            :key="hod.id"
            class="workspace-chat__turn"
        >
          <div class="workspace-chat__user">{{ hod.requestText }}</div>

          <div
              v-if="hod.result?.Kind === 'ANSWER'"
              class="workspace-chat__assistant"
          >
            {{ hod.result.Answer }}
          </div>

          <div v-if="hod.model" class="workspace-chat__model-caption">
            {{ hod.model }}
          </div>

          <div
              v-else-if="hod.result?.Kind === 'ERROR'"
              class="workspace-chat__error"
          >
            {{ hod.result.ErrorKey || hod.result.ErrorMessage || $t('opencode.workspace.chat.error') }}
          </div>

          <div
              v-else-if="hod.status === 'AWAITING_INPUT'"
              class="workspace-chat__questions"
          >
            <template v-for="question in hod.result?.Questions ?? []" :key="question.Id">
              <div class="workspace-chat__question">{{ question.Text }}</div>
              <div class="workspace-chat__options">
                <GhButton
                    v-for="option in question.Options ?? []"
                    :key="option.Id"
                    size="sm"
                    :label="option.Label"
                    :disabled="otpravka"
                    @click="otvetit(hod.id, question.Id, option.Id)"
                />
              </div>
            </template>
          </div>

          <div
              v-else-if="hod.status === 'RUNNING'"
              class="workspace-chat__running"
              role="status"
              aria-live="polite"
          >
            <GhIcon name="sync" class="workspace-chat__spin" />
            <span>{{ $t('opencode.chat.status.RUNNING') }}</span>
          </div>

          <div
              v-if="vlozheniyaHoda(hod).length > 0"
              class="workspace-chat__attachments"
          >
            <GhLabel variant="neutral">{{ $t('opencode.workspace.chat.attachments') }}</GhLabel>
            <ul class="workspace-chat__attachment-list">
              <li
                  v-for="attachment in vlozheniyaHoda(hod)"
                  :key="attachment.FileId"
                  class="workspace-chat__attachment"
              >
                <GhIcon name="file" class="workspace-chat__attachment-icon" />
                <button
                    type="button"
                    class="workspace-chat__attachment-name"
                    :title="attachment.Previewable
                      ? $t('opencode.workspace.chat.preview')
                      : $t('opencode.workspace.chat.download')"
                    @click="nazhatieNaImya(hod.id, attachment)"
                >
                  {{ attachment.Name }}
                </button>
                <span class="workspace-chat__attachment-size">{{ formatSize(attachment.Size) }}</span>
                <GhButton
                    v-if="attachment.Previewable"
                    variant="invisible"
                    size="sm"
                    icon="eye"
                    :aria-label="$t('opencode.workspace.chat.preview')"
                    :title="$t('opencode.workspace.chat.preview')"
                    @click="otkritProsmotr(hod.id, attachment)"
                />
                <GhButton
                    variant="invisible"
                    size="sm"
                    icon="download"
                    :aria-label="$t('opencode.workspace.chat.download')"
                    :title="$t('opencode.workspace.chat.download')"
                    @click="skachatFajl(hod.id, attachment)"
                />
              </li>
            </ul>
          </div>
        </div>

        <div v-if="hody.length === 0" class="workspace-chat__muted">
          {{ $t('opencode.workspace.chat.empty') }}
        </div>
      </template>
    </div>

    <GhBanner
        v-if="oshibkaSkachivaniya"
        variant="danger"
        dismissible
        @dismiss="oshibkaSkachivaniya = false"
    >
      {{ $t('opencode.workspace.chat.download_error') }}
    </GhBanner>

    <footer class="workspace-chat__footer">
      <GhInput
          v-model="prompt"
          type="textarea"
          autogrow
          :placeholder="$t('opencode.workspace.chat.placeholder')"
          :disabled="!mozhnoOtpravlyat || otpravka"
          @keydown.enter.exact.prevent="stor.otpravit()"
      />
      <GhButton
          variant="primary"
          icon="paper-airplane"
          :label="$t('opencode.workspace.chat.send')"
          :loading="otpravka"
          :disabled="!mozhnoOtpravlyat || prompt.trim() === ''"
          @click="stor.otpravit()"
      />
    </footer>

    <OknoProsmotraFajla
        :model-value="oknoProsmotraOtkrito"
        :turn-id="vibraniyHodId ?? ''"
        :attachment="vibranoeVlozhenie"
        @update:model-value="zakritProsmotr"
    />
  </div>
</template>

<style scoped>
.workspace-chat {
  display: flex;
  flex-direction: column;
  gap: 12px;
  /* Фиксированная высота не даёт странице «дёргаться», когда содержимое
     тела подменяется лоадером или догружается история. */
  height: calc(100vh - 96px);
  padding: 16px;
}

.workspace-chat__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.workspace-chat__title-block {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
}

.workspace-chat__title {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-chat__subtitle {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.workspace-chat__model-select {
  flex: 0 0 200px;
  min-width: 140px;
}

.workspace-chat__model-caption {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.workspace-chat__projects {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.workspace-chat__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.workspace-chat__turn {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.workspace-chat__user,
.workspace-chat__assistant,
.workspace-chat__error {
  padding: 8px 12px;
  border-radius: var(--borderRadius-medium);
  white-space: pre-wrap;
}

.workspace-chat__user {
  align-self: flex-end;
  max-width: 80%;
  background-color: var(--bgColor-accent-muted);
}

.workspace-chat__assistant {
  max-width: 90%;
  border: 1px solid var(--borderColor-default);
  background-color: var(--bgColor-default);
}

.workspace-chat__error {
  border: 1px solid var(--borderColor-danger-muted);
  color: var(--fgColor-danger);
}

.workspace-chat__attachments {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-medium);
}

.workspace-chat__attachment-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.workspace-chat__attachment {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.workspace-chat__attachment-icon {
  flex: 0 0 auto;
  color: var(--fgColor-muted);
}

.workspace-chat__attachment-name {
  overflow: hidden;
  padding: 0;
  border: 0;
  background: none;
  color: var(--fgColor-accent);
  font: inherit;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.workspace-chat__attachment-name:hover {
  text-decoration: underline;
}

.workspace-chat__attachment-size {
  flex: 0 0 auto;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.workspace-chat__questions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-medium);
}

.workspace-chat__question {
  font-weight: 600;
}

.workspace-chat__options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.workspace-chat__loading {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.workspace-chat__muted {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.workspace-chat__running {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--fgColor-muted);
}

.workspace-chat__spin {
  color: var(--fgColor-accent);
  animation: workspace-chat-spin 1s linear infinite;
}

@keyframes workspace-chat-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.workspace-chat__footer {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}
</style>
