<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { GhBanner, GhButton, GhDialog, GhSkeleton } from "@/components/ui";
import WorkspaceService from "@/modules/opencode/services/WorkspaceService";
import type { WorkspaceAttachment } from "@/modules/opencode/model/WorkspaceSession";

const props = defineProps<{
    modelValue: boolean;
    turnId: string;
    attachment: WorkspaceAttachment | null;
}>();

const emit = defineEmits<{
    "update:modelValue": [value: boolean];
}>();

const { t } = useI18n();

type Sostoyanie = "loading" | "ready" | "error";

const sostoyanie = ref<Sostoyanie>("loading");
const soderzhanie = ref("");
const klyuchOshibki = ref("opencode.workspace.chat.preview_error");
const oshibkaSkachivaniya = ref(false);
const skachivanie = ref(false);

/** Расширение без точки в нижнем регистре; пустая строка, если его нет. */
function rasshirenie(name: string): string {
    const tochka = name.lastIndexOf(".");

    return tochka === -1 ? "" : name.slice(tochka + 1).toLowerCase();
}

const etoMarkdown = computed<boolean>(() => {
    const name = props.attachment?.Name ?? "";
    const contentType = props.attachment?.ContentType ?? "";
    const ext = rasshirenie(name);

    return ext === "md" || ext === "markdown" || contentType.includes("markdown");
});

const tekstOshibki = computed<string>(() => t(klyuchOshibki.value));

/**
 * Разметка рендерится только после санитизации. Запрещаем активные теги,
 * обработчики событий и встроенные стили; внешние ссылки открываются в новой
 * вкладке без доступа к opener.
 */
const html = computed<string>(() => {
    const raw = marked.parse(soderzhanie.value, {
        gfm: true,
        breaks: false,
        async: false,
    }) as string;

    return DOMPurify.sanitize(raw, {
        FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "img", "video", "audio", "link", "meta"],
        FORBID_ATTR: ["onerror", "onclick", "onload", "onmouseover", "onfocus", "onstart", "style"],
        ALLOW_DATA_ATTR: false,
        FORBID_CONTENTS: ["script", "style"],
    }).replace(/<a\s/gi, '<a target="_blank" rel="noopener noreferrer" ');
});

/**
 * Ошибки бэкенда приходят строкой-ключом. `content_invalid`, сетевые и
 * неизвестные сбои показываем общим сообщением.
 */
function klyuchPoSoobsheniyu(message: string): string {
    if (message === "opencode.artifact.preview_unsupported" || message.endsWith("preview_unsupported")) {
        return "opencode.workspace.chat.preview_unsupported";
    }

    if (message === "preview_too_large" || message.endsWith("preview_too_large")) {
        return "opencode.workspace.chat.preview_too_large";
    }

    return "opencode.workspace.chat.preview_error";
}

function sbrosit(): void {
    sostoyanie.value = "loading";
    soderzhanie.value = "";
    klyuchOshibki.value = "opencode.workspace.chat.preview_error";
    oshibkaSkachivaniya.value = false;
    skachivanie.value = false;
}

async function zagruzit(): Promise<void> {
    const attachment = props.attachment;

    if (attachment === null) {
        return;
    }

    sbrosit();

    const response = await WorkspaceService.poluchitTekstFajla({
        turnId: props.turnId,
        fileId: attachment.FileId,
    });

    // Диалог могли закрыть или переключить на другой файл, пока шёл запрос.
    if (!props.modelValue || props.attachment?.FileId !== attachment.FileId) {
        return;
    }

    if (response.status === "success") {
        soderzhanie.value = response.data.content;
        sostoyanie.value = "ready";

        return;
    }

    klyuchOshibki.value = klyuchPoSoobsheniyu(
        response.status === "fail" ? response.data.message : response.message,
    );
    sostoyanie.value = "error";
}

async function skachat(): Promise<void> {
    const attachment = props.attachment;

    if (attachment === null || skachivanie.value) {
        return;
    }

    skachivanie.value = true;
    oshibkaSkachivaniya.value = false;

    try {
        const response = await WorkspaceService.poluchitSsylkuFajla({
            turnId: props.turnId,
            fileId: attachment.FileId,
        });

        if (response.status === "success") {
            window.open(response.data.url, "_blank", "noopener,noreferrer");

            return;
        }

        oshibkaSkachivaniya.value = true;
    } finally {
        skachivanie.value = false;
    }
}

function zakrit(): void {
    emit("update:modelValue", false);
}

watch(
    () => [props.modelValue, props.attachment?.FileId ?? ""],
    ([otkrito]) => {
        if (otkrito) {
            void zagruzit();

            return;
        }

        sbrosit();
    },
    { immediate: true },
);
</script>

<template>
  <GhDialog
      :model-value="modelValue"
      :title="attachment?.Name || t('opencode.workspace.chat.preview')"
      width="760px"
      @update:model-value="zakrit()"
  >
    <div class="okno-prosmotra">
      <div
          v-if="sostoyanie === 'loading'"
          class="okno-prosmotra__loading"
          aria-busy="true"
          :aria-label="t('opencode.workspace.chat.preview_loading')"
      >
        <GhSkeleton v-for="n in 4" :key="'preview-skeleton-' + n" height="20px" />
      </div>

      <GhBanner
          v-else-if="sostoyanie === 'error'"
          variant="danger"
          class="okno-prosmotra__banner"
      >
        {{ tekstOshibki }}
      </GhBanner>

      <div
          v-else-if="etoMarkdown"
          class="okno-prosmotra__markdown"
          v-html="html"
      />

      <pre v-else class="okno-prosmotra__text">{{ soderzhanie }}</pre>

      <GhBanner
          v-if="oshibkaSkachivaniya"
          variant="danger"
          class="okno-prosmotra__banner"
      >
        {{ t('opencode.workspace.chat.download_error') }}
      </GhBanner>
    </div>

    <template #footer>
      <GhButton
          icon="download"
          :label="t('opencode.workspace.chat.download')"
          :aria-label="t('opencode.workspace.chat.download')"
          :loading="skachivanie"
          @click="skachat()"
      />
    </template>
  </GhDialog>
</template>

<style scoped>
.okno-prosmotra {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 60vh;
  overflow-y: auto;
}

.okno-prosmotra__loading {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.okno-prosmotra__banner {
  position: sticky;
  top: 0;
}

.okno-prosmotra__markdown {
  font-size: var(--fontSize-body);
  line-height: var(--lineHeight-normal);
  overflow-wrap: anywhere;
}

.okno-prosmotra__markdown :deep(h1),
.okno-prosmotra__markdown :deep(h2),
.okno-prosmotra__markdown :deep(h3) {
  margin: 16px 0 8px;
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
}

.okno-prosmotra__markdown :deep(h1) {
  font-size: var(--fontSize-title);
}

.okno-prosmotra__markdown :deep(p),
.okno-prosmotra__markdown :deep(ul),
.okno-prosmotra__markdown :deep(ol),
.okno-prosmotra__markdown :deep(blockquote) {
  margin: 0 0 8px;
}

.okno-prosmotra__markdown :deep(ul),
.okno-prosmotra__markdown :deep(ol) {
  padding-left: 24px;
}

.okno-prosmotra__markdown :deep(code) {
  padding: 0 4px;
  border-radius: var(--borderRadius-small);
  background-color: var(--bgColor-neutral-muted);
  font-family: var(--fontStack-monospace);
  font-size: 0.9em;
}

.okno-prosmotra__markdown :deep(pre) {
  padding: 12px;
  border-radius: var(--borderRadius-medium);
  background-color: var(--bgColor-muted);
  overflow-x: auto;
}

.okno-prosmotra__markdown :deep(pre code) {
  padding: 0;
  background: none;
}

.okno-prosmotra__markdown :deep(a) {
  color: var(--fgColor-accent);
  text-decoration: none;
}

.okno-prosmotra__markdown :deep(blockquote) {
  padding-left: 12px;
  border-left: 3px solid var(--borderColor-default);
  color: var(--fgColor-muted);
}

.okno-prosmotra__text {
  margin: 0;
  padding: 12px;
  border-radius: var(--borderRadius-medium);
  background-color: var(--bgColor-muted);
  font-family: var(--fontStack-monospace);
  font-size: var(--fontSize-caption);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
