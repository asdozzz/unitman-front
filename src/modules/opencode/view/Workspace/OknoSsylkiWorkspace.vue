<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { storeToRefs } from "pinia";
import { copyToClipboard } from "quasar";
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
  <q-dialog :model-value="otkrita" persistent @update:model-value="zakrit()">
    <q-card style="min-width: 460px; max-width: 600px">
      <q-card-section class="bg-primary text-white">
        <div class="text-subtitle2">{{ $t('opencode.workspace.helper.caption') }}</div>
      </q-card-section>

      <q-card-section class="q-gutter-sm">
        <q-input
            :model-value="port"
            type="number"
            min="1"
            max="65535"
            :label="$t('opencode.workspace.helper.fields.port')"
            :hint="$t('opencode.workspace.helper.hint_port')"
            :error="portNekorrektniy"
            :error-message="$t('opencode.workspace.helper.errors.invalid_port')"
            filled
            dense
            autofocus
            @update:model-value="obnovitPort"
        />

        <q-input
            v-model="suffix"
            :label="$t('opencode.workspace.helper.fields.suffix')"
            :hint="$t('opencode.workspace.helper.hint_suffix')"
            filled
            dense
        />

        <div v-if="oshibka" class="text-negative">{{ oshibka }}</div>

        <q-input
            v-if="ssylka !== null"
            :model-value="ssylka"
            :label="$t('opencode.workspace.helper.result_link')"
            readonly
            filled
            dense
        >
          <template #append>
            <q-btn
                flat
                dense
                :icon="skopirovano ? 'check' : 'content_copy'"
                :color="skopirovano ? 'positive' : undefined"
                :aria-label="$t('opencode.workspace.helper.buttons.copy')"
                @click="skopirovat()"
            >
              <q-tooltip>
                {{ skopirovano ? $t('opencode.workspace.helper.buttons.copied') : $t('opencode.workspace.helper.buttons.copy') }}
              </q-tooltip>
            </q-btn>

            <q-btn
                flat
                dense
                icon="open_in_new"
                :aria-label="$t('opencode.workspace.helper.buttons.open')"
                @click="otkryt()"
            >
              <q-tooltip>{{ $t('opencode.workspace.helper.buttons.open') }}</q-tooltip>
            </q-btn>
          </template>
        </q-input>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
            flat
            :label="$t('common.buttons.cancel')"
            :disable="loader"
            @click="zakrit()"
        />
        <q-btn
            color="primary"
            :label="$t('opencode.workspace.helper.buttons.ok')"
            :loading="loader"
            :disable="!mozhnoSformirovat"
            @click="sformirovat()"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
