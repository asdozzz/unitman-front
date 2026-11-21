<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useQuasar } from "quasar";
import { useRoute, useRouter } from "vue-router";
import i18n from "@/bootstrap/translator";
import { useStorSpiskaWorkspace } from "@/modules/opencode/store/StorSpiskaWorkspace";
import { useStorSpiskaRekvizitovOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/StorSpiskaRekvizitovOpenCode";
import { useStorFormiSozdaniyaWorkspace } from "@/modules/opencode/store/StorFormiSozdaniyaWorkspace";
import {
    prochitatFiltriWorkspaceIzQuery,
    serializovatFiltriWorkspaceVQuery,
} from "@/modules/opencode/utils/workspaceFiltersUrl";
import type { FiltriWorkspace } from "@/modules/opencode/model/WorkspaceFiltri";
import type { Workspace } from "@/modules/opencode/model/Workspace";
import type { Schema } from "@/api/types";
import OpenCodeRazdelToggle from "@/modules/opencode/view/OpenCodeRazdelToggle.vue";
import WorkspaceCard from "@/modules/opencode/view/Workspace/WorkspaceCard.vue";
import FormaSozdaniyaWorkspace from "@/modules/opencode/view/FormaSozdaniyaWorkspace.vue";

/**
 * Список workspace-сессий OpenCode.
 *
 * Фильтры (`search`, `onlyActive`) совпадают с query-параметрами бэкенда и
 * синхронизируются с URL. Карточка сообщает о намерении, а список проводит
 * действие: архив требует подтверждения при незакоммиченных файлах, удаление
 * необратимо.
 */
const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const stor = useStorSpiskaWorkspace();
const storRekvizitov = useStorSpiskaRekvizitovOpenCode();
const formaStore = useStorFormiSozdaniyaWorkspace();

const {
    spisok,
    loaderSpiska,
    oshibkaZagruzki,
    dejstvieId,
    dejstvie,
    oshibkaDejstviya,
} = storeToRefs(stor);
const { oshibkaZagruzki: oshibkaRekvizitov } = storeToRefs(storRekvizitov);

/** Без реквизитов workspace создать нельзя, поэтому кнопка блокируется заранее. */
const netRekvizitov = computed(() => storRekvizitov.spisok.length === 0);

/** Текущий фильтр: инициализируется из URL, чтобы ссылка была воспроизводимой. */
const filtr = ref<FiltriWorkspace>(prochitatFiltriWorkspaceIzQuery(route.query as Record<string, unknown>));
const poisk = ref(filtr.value.search ?? "");

let tajmerPoiska: ReturnType<typeof setTimeout> | null = null;

/** Применить фильтр: обновить URL и перечитать список. */
function primenitFiltr() {
    const noviy: FiltriWorkspace = {
        search: poisk.value.trim() === "" ? null : poisk.value.trim(),
        onlyActive: filtr.value.onlyActive,
    };

    filtr.value = noviy;

    const query = serializovatFiltriWorkspaceVQuery(noviy);
    const tekushchiy = serializovatFiltriWorkspaceVQuery(prochitatFiltriWorkspaceIzQuery(route.query as Record<string, unknown>));

    if (JSON.stringify(query) !== JSON.stringify(tekushchiy)) {
        void router.replace({ query });
    }

    void stor.primenitFiltr(noviy);
}

/** Поиск с debounce: не дёргаем бэкенд на каждый символ. */
function izmenitPoisk() {
    if (tajmerPoiska !== null) {
        clearTimeout(tajmerPoiska);
    }

    tajmerPoiska = setTimeout(() => {
        tajmerPoiska = null;
        primenitFiltr();
    }, 350);
}

function perekluchitTolkoAktivnie(znachenie: boolean) {
    filtr.value.onlyActive = znachenie;
    primenitFiltr();
}

/** Переход в чат workspace: тип передаётся, чтобы чат не делал probe-запрос. */
function otkrit(workspace: Workspace) {
    void router.push({
        name: "opencode_chat",
        params: { id: workspace.id },
        query: { type: "workspace" },
    });
}

function perejtiVWorkspace(id: string) {
    void router.push({
        name: "opencode_chat",
        params: { id },
        query: { type: "workspace" },
    });
}

const PRAVILA_EKRANIROVANIYA: ReadonlyArray<readonly [RegExp, string]> = [
    [/&/g, "\u0026amp;"],
    [/</g, "\u0026lt;"],
    [/>/g, "\u0026gt;"],
    [/\x22/g, "\u0026quot;"],
    [/'/g, "\u0026#39;"],
];

/** Имена и пути файлов приходят из репозитория — экранируем перед вставкой в HTML. */
function ekranirovatHtml(znachenie: string): string {
    return PRAVILA_EKRANIROVANIYA.reduce(
        (rezultat: string, [shablon, zamena]: readonly [RegExp, string]) => rezultat.replace(shablon, zamena),
        znachenie,
    );
}

/** HTML списка незакоммиченных файлов по проектам для диалога подтверждения. */
function sostavitDirtyHtml(dirtyProjects: Schema<"RezultatArhivaciiWorkspace">["dirtyProjects"]): string {
    const proekti = dirtyProjects.map((project) => {
        const fajly = project.files
            .slice(0, 10)
            .map((file) => `<li>${ekranirovatHtml(file)}</li>`)
            .join("");
        const ostalnie = project.files.length > 10 ? "<li>…</li>" : "";

        return `<div class="q-mt-sm"><b>${ekranirovatHtml(project.name)}</b><ul class="q-my-xs">${fajly}${ostalnie}</ul></div>`;
    }).join("");

    return `<div>${i18n.global.t('opencode.workspace.archive.dirty_intro')}</div>${proekti}`;
}

/**
 * Архивировать workspace.
 *
 * Первый запрос идёт без `force`. Если есть незакоммиченные файлы, бэкенд
 * просит подтверждение — показываем диалог и повторяем с `force: true`.
 */
async function arhivirovat(workspace: Workspace) {
    const result = await stor.arhivirovat(workspace.id);

    if (result === null || !result.requiresConfirmation) {
        return;
    }

    $q.dialog({
        title: i18n.global.t("opencode.workspace.archive.dirty_caption"),
        message: sostavitDirtyHtml(result.dirtyProjects),
        html: true,
        persistent: true,
        ok: {
            label: i18n.global.t("opencode.workspace.archive.force"),
            color: "warning",
            unelevated: true,
        },
        cancel: { label: i18n.global.t("common.buttons.cancel"), flat: true },
    }).onOk(() => {
        void stor.arhivirovat(workspace.id, true);
    });
}

function vosstanovit(workspace: Workspace) {
    void stor.vosstanovit(workspace.id);
}

/** Удаление необратимо: контейнер, тома, каталог и записи БД. */
function udalit(workspace: Workspace) {
    $q.dialog({
        title: i18n.global.t("opencode.workspace.delete.caption"),
        message: i18n.global.t("opencode.workspace.delete.message", { name: workspace.name }),
        persistent: true,
        ok: {
            label: i18n.global.t("common.buttons.delete"),
            color: "negative",
            unelevated: true,
        },
        cancel: { label: i18n.global.t("common.buttons.cancel"), flat: true },
    }).onOk(() => {
        void stor.udalit(workspace.id);
    });
}

// Навигация «назад/вперёд» меняет query: синхронизируем фильтр со ссылкой.
watch(() => route.query, (query) => {
    if (route.name !== "opencode_workspaces") {
        return;
    }

    const noviy = prochitatFiltriWorkspaceIzQuery(query as Record<string, unknown>);

    if (noviy.search === filtr.value.search && noviy.onlyActive === filtr.value.onlyActive) {
        return;
    }

    filtr.value = noviy;
    poisk.value = noviy.search ?? "";
    void stor.primenitFiltr(noviy);
});

onMounted(() => {
    storRekvizitov.poluchitSpisok();
    void stor.primenitFiltr(filtr.value);
});

onUnmounted(() => {
    stor.ostanovitOpros();

    if (tajmerPoiska !== null) {
        clearTimeout(tajmerPoiska);
        tajmerPoiska = null;
    }
});
</script>

<template>
  <q-card>
    <q-card-section class="bg-primary text-white row items-center q-gutter-sm">
      <div class="text-subtitle2 col">{{ $t('opencode.workspace.list.caption') }}</div>

      <OpenCodeRazdelToggle />

      <q-btn
          dense
          flat
          icon="add"
          color="white"
          :disable="loaderSpiska || netRekvizitov"
          @click="formaStore.otkrit()"
      >
        <q-tooltip>
          {{ netRekvizitov ? $t('opencode.sessions.no_credentials') : $t('opencode.workspace.buttons.add') }}
        </q-tooltip>
      </q-btn>

      <q-btn
          dense
          flat
          icon="refresh"
          color="white"
          :loading="loaderSpiska"
          @click="stor.poluchitSpisok()"
      >
        <q-tooltip>{{ $t('opencode.sessions.buttons.refresh') }}</q-tooltip>
      </q-btn>
    </q-card-section>

    <q-card-section class="q-pb-xs row items-center q-gutter-sm">
      <q-input
          v-model="poisk"
          class="col"
          :placeholder="$t('opencode.workspace.list.search')"
          :debounce="0"
          filled
          dense
          clearable
          @update:model-value="izmenitPoisk()"
      >
        <template #prepend>
          <q-icon name="search" />
        </template>
      </q-input>

      <q-toggle
          :model-value="filtr.onlyActive"
          :label="$t('opencode.workspace.list.only_active')"
          dense
          @update:model-value="perekluchitTolkoAktivnie(Boolean($event))"
      />
    </q-card-section>

    <q-card-section class="q-pt-none">
      <div v-if="netRekvizitov" class="text-warning q-mb-sm">
        <i18n-t keypath="opencode.sessions.no_credentials_hint" tag="span">
          <template #link>
            <router-link :to="{ name: 'account_settings' }" class="text-primary">
              {{ $t('opencode.sessions.no_credentials_link') }}
            </router-link>
          </template>
        </i18n-t>
      </div>

      <div v-if="oshibkaRekvizitov" class="text-negative q-mb-sm">{{ oshibkaRekvizitov }}</div>
      <div v-if="oshibkaZagruzki" class="text-negative q-mb-sm">{{ oshibkaZagruzki }}</div>
      <div v-if="oshibkaDejstviya" class="text-negative q-mb-sm">{{ oshibkaDejstviya }}</div>

      <div v-if="loaderSpiska && spisok.length === 0" class="row justify-center q-pa-md">
        <q-spinner color="primary" size="2em" />
      </div>

      <div v-else-if="spisok.length === 0" class="text-grey-7">
        {{ $t('opencode.workspace.list.empty') }}
      </div>

      <div v-else>
        <WorkspaceCard
            v-for="workspace in spisok"
            :key="workspace.id"
            :workspace="workspace"
            :dejstvie="dejstvieId === workspace.id ? dejstvie : null"
            @open="otkrit(workspace)"
            @archive="arhivirovat(workspace)"
            @restore="vosstanovit(workspace)"
            @delete="udalit(workspace)"
        />
      </div>
    </q-card-section>

    <FormaSozdaniyaWorkspace @sozdan="perejtiVWorkspace" />
  </q-card>
</template>
