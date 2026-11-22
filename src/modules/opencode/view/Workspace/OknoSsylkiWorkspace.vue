<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { storeToRefs } from "pinia";
import { copyToClipboard } from "quasar";
import {
    GhBanner,
    GhButton,
    GhDialog,
    GhFormField,
    GhIcon,
    GhInput,
} from "@/components/ui";
import {
    portKorrektniy,
    useStorPomoschnikaSsylkiWorkspace,
} from "@/modules/opencode/store/StorPomoschnikaSsylkiWorkspace";

/**
 * Диалог формирования ссылки на произвольный порт workspace.
 *
 * Порт обязателен и проверяется диапазоном 1–65535; суффикс необязателен.
 * Готовую ссылку можно скопировать или открыть в новой вкладке.
 */
const store = useStorPomoschnikaSsylkiWorkspace();
const { otkrita, workspaceId, port, suffix, loader, oshibka, ssylka } = storeToRefs(store);

/** Порт введён, но не проходит валидацию — подсвечиваем поле ошибкой. */
const portNekorrektniy = computed(() => port.value !== null && !portKorrektniy(port.value));

/** Кнопка доступна при выбранном workspace и корректном порте. */
const mozhnoSformirovat = computed(
    () => workspaceId.value !== null && portKorrektniy(port.value) && !loader.value,
);

/** Идёт локальный фидбек копирования вместо глобального Notify-тоста. */
const skopirovano = ref(false);
let tajmer: ReturnType<typeof setTimeout> | null = null;

/** Приводит значение поля порта к числу или `null` для пустого поля. */
function obnovitPort(value: string | number | null): void {
    if (value === null || value === "") {
        port.value = null;

        return;
    }

    const chislo = Number(value);
    port.value = Number.isFinite(chislo) ? chislo : null;
}

function zakrit(): void {
    store.zakrit();
}

async function sformirovat(): Promise<void> {
    await store.sformirovat();
}

async function skopirovat(): Promise<void> {
    if (ssylka.value === null) {
        return;
    }

    await copyToClipboard(ssylka.value);
    skopirovano.value = true;

    if (tajmer !== null) {
        clearTimeout(tajmer);
    }

    tajmer = setTimeout(() => {
        skopirovano.value = false;
        tajmer = null;
    }, 1200);
}

function otkryt(): void {
    if (ssylka.value !== null) {
        window.open(ssylka.value, "_blank", "noopener,noreferrer");
    }
}

onBeforeUnmount(() => {
    if (tajmer !== null) {
        clearTimeout(tajmer);
        tajmer = null;
    }
});
</script>

<template>
  <GhDialog
      :model-value="otkrita"
      :title="$t('opencode.workspace.helper.caption')"
      width="560px"
      persistent
      @update:model-value="zakrit()"
  >
    <div class="opencode-form">
      <GhFormField
          :label="$t('opencode.workspace.helper.fields.port')"
          :caption="$t('opencode.workspace.helper.hint_port')"
          :error="portNekorrektniy ? $t('opencode.workspace.helper.errors.invalid_port') : ''"
      >
        <GhInput
            :model-value="port"
            type="number"
            @update:model-value="obnovitPort"
        />
      </GhFormField>

      <GhFormField
          :label="$t('opencode.workspace.helper.fields.suffix')"
          :caption="$t('opencode.workspace.helper.hint_suffix')"
      >
        <GhInput v-model="suffix" />
      </GhFormField>

      <GhBanner v-if="oshibka" variant="danger">{{ oshibka }}</GhBanner>

      <GhFormField
          v-if="ssylka !== null"
          :label="$t('opencode.workspace.helper.result_link')"
      >
        <GhInput :model-value="ssylka" readonly>
          <template #append>
            <GhButton
                variant="invisible"
                size="sm"
                :aria-label="$t('opencode.workspace.helper.buttons.copy')"
                @click="skopirovat()"
            >
              <GhIcon
                  :name="skopirovano ? 'check' : 'copy'"
                  :class="{ 'okno-ssylki__copied': skopirovano }"
              />
            </GhButton>

            <GhButton
                variant="invisible"
                size="sm"
                icon="link-external"
                :aria-label="$t('opencode.workspace.helper.buttons.open')"
                @click="otkryt()"
            />
          </template>
        </GhInput>
      </GhFormField>
    </div>

    <template #footer>
      <GhButton
          :label="$t('common.buttons.cancel')"
          :disabled="loader"
          @click="zakrit()"
      />
      <GhButton
          variant="primary"
          :label="$t('opencode.workspace.helper.buttons.ok')"
          :loading="loader"
          :disabled="!mozhnoSformirovat"
          @click="sformirovat()"
      />
    </template>
  </GhDialog>
</template>

<style scoped>
.opencode-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.okno-ssylki__copied {
  color: var(--fgColor-success);
}
</style>
