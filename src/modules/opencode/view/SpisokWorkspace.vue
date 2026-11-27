<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useQuasar } from "quasar";
import { useRoute, useRouter } from "vue-router";
import i18n from "@/bootstrap/translator";
import {
    GhBanner,
    GhBox,
    GhButton,
    GhCheckbox,
    GhEmptyState,
    GhInput,
    GhSkeleton,
} from "@/components/ui";
import { useStorSpiskaWorkspace } from "@/modules/opencode/store/StorSpiskaWorkspace";
import { useStorSpiskaRekvizitovOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/StorSpiskaRekvizitovOpenCode";
import { useStorFormiSozdaniyaWorkspace } from "@/modules/opencode/store/StorFormiSozdaniyaWorkspace";
import {
    prochitatFiltriWorkspaceIzQuery,
    serializovatFiltriWorkspaceVQuery,
} from "@/modules/opencode/utils/workspaceFiltersUrl";
import { ozhidaetsyaVtorayaKlavishaPosledovatelnosti } from "@/utils/useHotkeys";
import type { FiltriWorkspace } from "@/modules/opencode/model/WorkspaceFiltri";
import type { Workspace } from "@/modules/opencode/model/Workspace";
import type { Schema } from "@/api/types";
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

/** Обёртка поля поиска — нужна для фокуса по `/`. */
const polePoiska = ref<HTMLElement | null>(null);

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
        name: "opencode_workspace_chat",
        params: { id: workspace.id },
        query: { type: "workspace" },
    });
}

function perejtiVWorkspace(id: string) {
    void router.push({
        name: "opencode_workspace_chat",
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

/**
 * Создать юниты для всех проектов workspace.
 *
 * После успеха карточка покажет чипсы созданных юнитов, а действие исчезнет:
 * повторное создание запрещено и на бэкенде.
 */
function sozdatUniti(workspace: Workspace) {
    $q.dialog({
        title: i18n.global.t("opencode.workspace.units.confirm_title"),
        message: i18n.global.t("opencode.workspace.units.confirm_message", {
            name: workspace.name,
            count: workspace.projects.length,
        }),
        persistent: true,
        ok: {
            label: i18n.global.t("opencode.workspace.buttons.create_units"),
            color: "primary",
            unelevated: true,
        },
        cancel: { label: i18n.global.t("common.buttons.cancel"), flat: true },
    }).onOk(() => {
        void stor.sozdatUniti(workspace.id);
    });
}

/** Перейти на страницу юнитов с фильтром по созданным юнитам. */
function otkritUniti(unitIds: string[]) {
    if (unitIds.length === 0) {
        return;
    }

    void router.push({ path: "/", query: { unitIds: unitIds.join(",") } });
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

/** Селекторы, внутри которых страничные хоткеи не перехватываются. */
function ignorirovatVvod(event: KeyboardEvent): boolean {
    const cel = event.target;

    if (!(cel instanceof HTMLElement)) {
        return false;
    }

    if (cel.isContentEditable) {
        return true;
    }

    return cel.closest(
        'input, textarea, select, [contenteditable], [role="textbox"], [role="dialog"], .q-dialog, .q-menu',
    ) !== null;
}

/** Хоткеи страницы: `/` — поиск, `R` — обновить, `c` — создать. */
function obrabotatKlavishu(event: KeyboardEvent): void {
    if (
        event.defaultPrevented
        || event.isComposing
        || event.ctrlKey
        || event.metaKey
        || event.altKey
        || ozhidaetsyaVtorayaKlavishaPosledovatelnosti()
        || ignorirovatVvod(event)
    ) {
        return;
    }

    if (event.key === "/") {
        event.preventDefault();

        const pole = polePoiska.value?.querySelector<HTMLInputElement>("input");
        pole?.focus();
        pole?.select();

        return;
    }

    if (event.key === "R") {
        event.preventDefault();
        void stor.poluchitSpisok();

        return;
    }

    if (event.key === "c" && !netRekvizitov.value && !loaderSpiska.value) {
        event.preventDefault();
        formaStore.otkrit();
    }
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
    window.addEventListener("keydown", obrabotatKlavishu);
});

onUnmounted(() => {
    stor.ostanovitOpros();
    window.removeEventListener("keydown", obrabotatKlavishu);

    if (tajmerPoiska !== null) {
        clearTimeout(tajmerPoiska);
        tajmerPoiska = null;
    }
});
</script>

<template>
  <GhBox class="opencode-list primer" padding="none">
    <template #header>
      <span class="opencode-list__title">{{ $t('opencode.workspace.list.caption') }}</span>
      <span class="opencode-list__spacer" />

      <GhButton
          variant="primary"
          size="sm"
          icon="plus"
          :label="$t('opencode.workspace.buttons.add')"
          :disabled="loaderSpiska || netRekvizitov"
          @click="formaStore.otkrit()"
      />
      <GhButton
          size="sm"
          icon="sync"
          :aria-label="$t('opencode.sessions.buttons.refresh')"
          :loading="loaderSpiska"
          @click="stor.poluchitSpisok()"
      />
    </template>

    <div class="opencode-list__filters">
      <div ref="polePoiska" class="opencode-list__search">
        <GhInput
            v-model="poisk"
            size="sm"
            icon="search"
            clearable
            :placeholder="$t('opencode.workspace.list.search')"
            @update:model-value="izmenitPoisk()"
        />
      </div>

      <GhCheckbox
          :model-value="filtr.onlyActive"
          :label="$t('opencode.workspace.list.only_active')"
          @update:model-value="perekluchitTolkoAktivnie($event)"
      />
    </div>

    <div class="opencode-list__body">
      <GhBanner v-if="netRekvizitov" variant="attention" class="opencode-list__banner">
        <i18n-t keypath="opencode.sessions.no_credentials_hint" tag="span">
          <template #link>
            <router-link :to="{ name: 'account_settings' }" class="opencode-list__link">
              {{ $t('opencode.sessions.no_credentials_link') }}
            </router-link>
          </template>
        </i18n-t>
      </GhBanner>

      <GhBanner v-if="oshibkaRekvizitov" variant="danger" class="opencode-list__banner">
        {{ oshibkaRekvizitov }}
        <template #actions>
          <GhButton size="sm" :label="$t('common.buttons.retry')" @click="storRekvizitov.poluchitSpisok()" />
        </template>
      </GhBanner>

      <GhBanner v-if="oshibkaZagruzki" variant="danger" class="opencode-list__banner">
        {{ oshibkaZagruzki }}
        <template #actions>
          <GhButton size="sm" :label="$t('common.buttons.retry')" @click="stor.poluchitSpisok()" />
        </template>
      </GhBanner>

      <GhBanner v-if="oshibkaDejstviya" variant="danger" class="opencode-list__banner">
        {{ oshibkaDejstviya }}
      </GhBanner>

      <div v-if="loaderSpiska && spisok.length === 0" class="opencode-list__skeletons">
        <GhSkeleton v-for="n in 3" :key="'workspace-skeleton-' + n" height="96px" />
      </div>

      <GhEmptyState
          v-else-if="spisok.length === 0"
          icon="rows"
          :title="$t('opencode.workspace.list.empty')"
      >
        <template #actions>
          <GhButton
              variant="primary"
              icon="plus"
              :label="$t('opencode.workspace.buttons.add')"
              :disabled="netRekvizitov"
              @click="formaStore.otkrit()"
          />
        </template>
      </GhEmptyState>

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
            @create-units="sozdatUniti(workspace)"
            @open-units="otkritUniti"
            @refresh="stor.poluchitSpisok()"
        />
      </div>
    </div>

    <FormaSozdaniyaWorkspace @sozdan="perejtiVWorkspace" />
  </GhBox>
</template>

<style scoped>
.opencode-list__title {
  color: var(--fgColor-default);
  font-size: var(--fontSize-title);
  font-weight: var(--fontWeight-semibold);
}

.opencode-list__spacer {
  flex: 1 1 auto;
}

.opencode-list__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--borderColor-default);
}

.opencode-list__search {
  min-width: 160px;
  flex: 1 1 220px;
}

/*
 * F4: строка GhCheckbox в kit — 32px. В строке фильтров все контролы size="sm"
 * (28px), поэтому локально выравниваем чекбокс по высоте строки, не меняя kit.
 */
.opencode-list__filters :deep(.gh-checkbox) {
  min-height: var(--control-height-sm);
}

.opencode-list__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.opencode-list__banner {
  margin: 0;
}

.opencode-list__link {
  color: var(--fgColor-accent);
}

.opencode-list__link:hover {
  text-decoration: underline;
}

.opencode-list__skeletons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (max-width: 480px) {
  .opencode-list__filters,
  .opencode-list__body {
    padding: 12px;
  }
}
</style>
