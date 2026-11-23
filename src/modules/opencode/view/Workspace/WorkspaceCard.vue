<script setup lang="ts">
import { computed } from "vue";
import i18n from "@/bootstrap/translator";
import {
    GhActionMenu,
    GhBanner,
    GhBox,
    GhButton,
    GhIcon,
    GhLabel,
} from "@/components/ui";
import type { GhActionMenuItem } from "@/components/ui";
import WorkspaceStatusBadge from "@/modules/opencode/view/Workspace/WorkspaceStatusBadge.vue";
import OknoSsylkiWorkspace from "@/modules/opencode/view/Workspace/OknoSsylkiWorkspace.vue";
import { useStorPomoschnikaSsylkiWorkspace } from "@/modules/opencode/store/StorPomoschnikaSsylkiWorkspace";
import { convertDate } from "@/utils/dates";
import {
    estReadOnly,
    mozhnoArhivirovat,
    mozhnoUdalit,
    mozhnoVosstanovit,
    statusTranzitniy,
    type ProektWorkspace,
    type Workspace,
} from "@/modules/opencode/model/Workspace";

/**
 * Карточка workspace.
 *
 * Карточка не выполняет запросы: она только сообщает о намерении, а список
 * решает, как провести действие (например, архив с подтверждением dirty-файлов).
 */
type DejstvieWorkspace = "archive" | "restore" | "delete" | "create_units";

const props = defineProps<{
    workspace: Workspace;
    /** Текущее действие по этой карточке; `null` — карточка свободна. */
    dejstvie?: DejstvieWorkspace | null;
}>();

/**
 * Помощник ссылки на порт. Диалог рендерится только у карточки-источника:
 * единственный открытый workspace в сторе задаёт `workspaceId`, поэтому
 * на списке не появляется дублирующихся диалогов.
 */
const storPomoschnika = useStorPomoschnikaSsylkiWorkspace();

/** Кнопка помощника доступна только у работающего workspace. */
const mozhnoOtkritPomoschnik = computed(() => props.workspace.status === "RUNNING");

/** Подпись проекта: фактическая ветка проекта либо общая ветка workspace. */
function podpisProekta(project: ProektWorkspace): string {
    const vetka = project.branch || props.workspace.branch;

    return `${project.projectName} · ${vetka}`;
}

function otkritPomoschnik(): void {
    storPomoschnika.otkrit(props.workspace);
}

const emit = defineEmits<{
    open: [];
    archive: [];
    restore: [];
    delete: [];
    "create-units": [];
    "open-units": [unitIds: string[]];
}>();

const tranzitniy = computed(() => statusTranzitniy(props.workspace.status));
const readOnly = computed(() => estReadOnly(props.workspace));
const unitiWorkspace = computed(() => props.workspace.units ?? []);

/**
 * Действие доступно только у работающего workspace без созданных юнитов.
 * После создания кнопка исчезает навсегда: повторный запуск запрещён.
 */
const mozhnoSozdatUniti = computed(() => {
    return props.workspace.status === "RUNNING" && unitiWorkspace.value.length === 0;
});
const mozhnoArhiv = computed(() => mozhnoArhivirovat(props.workspace.status));
const mozhnoVosstan = computed(() => mozhnoVosstanovit(props.workspace.status));
const mozhnoUdal = computed(() => mozhnoUdalit(props.workspace.status));

const dejstvieIdet = computed(() => props.dejstvie !== null && props.dejstvie !== undefined);

/** Пункты меню действий по текущему статусу workspace. */
const punktyMenu = computed<GhActionMenuItem[]>(() => {
    const punkty: GhActionMenuItem[] = [];

    if (mozhnoSozdatUniti.value) {
        punkty.push({
            id: "create_units",
            label: i18n.global.t("opencode.workspace.buttons.create_units"),
            icon: "package",
            disabled: dejstvieIdet.value,
        });
    }

    if (mozhnoArhiv.value) {
        punkty.push({
            id: "archive",
            label: i18n.global.t("opencode.workspace.buttons.archive"),
            icon: "archive",
            disabled: dejstvieIdet.value,
        });
    }

    if (mozhnoVosstan.value) {
        punkty.push({
            id: "restore",
            label: i18n.global.t("opencode.workspace.buttons.restore"),
            icon: "sync",
            disabled: dejstvieIdet.value,
        });
    }

    if (mozhnoUdal.value) {
        punkty.push({
            id: "delete",
            label: i18n.global.t("opencode.workspace.buttons.delete"),
            icon: "trash",
            danger: true,
            separatorBefore: mozhnoArhiv.value || mozhnoVosstan.value,
            disabled: dejstvieIdet.value,
        });
    }

    return punkty;
});

/** Маршрутизация выбранного пункта меню к событию карточки. */
function vybratDejstvie(item: GhActionMenuItem): void {
    if (item.id === "create_units") {
        emit("create-units");
        return;
    }

    if (item.id === "archive") {
        emit("archive");
        return;
    }

    if (item.id === "restore") {
        emit("restore");
        return;
    }

    if (item.id === "delete") {
        emit("delete");
    }
}

/** Переход на страницу юнитов с фильтром по созданным юнитам. */
function otkritUniti(): void {
    emit("open-units", unitiWorkspace.value.map((unit) => unit.unitId));
}

/** Ключ перевода приходит с бэкенда; неизвестный ключ показываем как есть. */
function perevodKlyucha(klyuch: string | null | undefined): string | null {
    if (!klyuch) {
        return null;
    }

    return i18n.global.te(klyuch) ? i18n.global.t(klyuch) : klyuch;
}

const oshibka = computed(() => perevodKlyucha(props.workspace.errorKey));
</script>

<template>
  <GhBox padding="sm" class="workspace-card">
    <template #header>
      <WorkspaceStatusBadge :status="workspace.status" />

      <span class="workspace-card__name" :title="workspace.name">
        {{ workspace.name }}
        <q-tooltip>{{ workspace.name }}</q-tooltip>
      </span>

      <GhLabel
          v-if="readOnly"
          variant="attention"
          icon="lock"
          :label="$t('opencode.workspace.badges.read_only')"
          :title="$t('opencode.workspace.badges.read_only_hint')"
      />

      <GhLabel
          v-if="workspace.archived"
          variant="neutral"
          icon="archive"
          :label="$t('opencode.sessions.archive.badge')"
      />

      <GhIcon
          v-if="tranzitniy"
          name="sync"
          class="workspace-card__spin"
      />

      <span class="workspace-card__spacer" />

      <a
          v-if="workspace.ideLink"
          class="workspace-card__icon-link"
          :href="workspace.ideLink"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="$t('opencode.workspace.buttons.open_ide')"
      >
        <GhIcon name="link-external" />
      </a>

      <GhButton
          v-if="mozhnoOtkritPomoschnik"
          variant="invisible"
          size="sm"
          icon="link"
          :aria-label="$t('opencode.workspace.helper.open_button')"
          @click="otkritPomoschnik()"
      />

      <GhButton
          variant="invisible"
          size="sm"
          icon="comment-discussion"
          :aria-label="$t('opencode.workspace.buttons.open_chat')"
          @click="emit('open')"
      />

      <GhActionMenu
          :items="punktyMenu"
          :aria-label="$t('opencode.workspace.buttons.actions')"
          :disabled="dejstvieIdet"
          @select="vybratDejstvie"
      />
    </template>

    <div class="workspace-card__meta">
      <span>{{ $t('opencode.workspace.fields.branch') }}: <span class="gh-mono">{{ workspace.branch }}</span></span>
      <span>{{ $t('opencode.workspace.fields.projects_count', { count: workspace.projects.length }) }}</span>
      <span>{{ $t('opencode.sessions.fields.updated_at') }}: <span class="gh-mono">{{ convertDate(workspace.updatedAt) }}</span></span>
      <span>{{ $t('opencode.sessions.fields.created_at') }}: <span class="gh-mono">{{ convertDate(workspace.createdAt) }}</span></span>
    </div>

    <div v-if="unitiWorkspace.length > 0" class="workspace-card__units">
      <span class="workspace-card__units-title">
        {{ $t('opencode.workspace.units.title') }}
      </span>

      <button
          v-for="unit in unitiWorkspace"
          :key="'ws_unit_' + unit.unitId"
          type="button"
          class="workspace-card__unit-chip"
          :title="`${unit.unitName} · ${unit.branch}`"
          @click="otkritUniti()"
      >
        <GhIcon name="package" :size="12" />
        <span>{{ unit.unitName }}</span>
      </button>
    </div>

    <div v-if="workspace.projects.length > 0" class="workspace-card__projects">
      <GhLabel
          v-for="project in workspace.projects"
          :key="'ws_project_' + project.projectId"
          variant="neutral"
          icon="project"
          :title="!project.canPush ? $t('opencode.workspace.badges.no_push_project') : undefined"
      >
        {{ podpisProekta(project) }}
        <GhIcon v-if="!project.canPush" name="lock" :size="12" class="workspace-card__lock" />
      </GhLabel>
    </div>

    <GhBanner
        v-if="workspace.status === 'ERROR'"
        variant="danger"
        class="workspace-card__error"
    >
      {{ oshibka ?? $t('opencode.workspace.errors.operation_failed') }}

      <template #actions>
        <GhButton
            v-if="mozhnoVosstan"
            size="sm"
            :label="$t('opencode.workspace.buttons.restore')"
            @click="emit('restore')"
        />
        <GhButton
            v-if="mozhnoUdal"
            size="sm"
            variant="danger"
            :label="$t('opencode.workspace.buttons.delete')"
            @click="emit('delete')"
        />
      </template>
    </GhBanner>

    <!-- Один экземпляр диалога на список: только у карточки-источника. -->
    <OknoSsylkiWorkspace v-if="workspace.id === storPomoschnika.workspaceId" />
  </GhBox>
</template>

<style scoped>
.workspace-card {
  margin-bottom: 8px;
}

.workspace-card__name {
  min-width: 0;
  overflow: hidden;
  color: var(--fgColor-default);
  font-size: var(--fontSize-title);
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-card__spacer {
  flex: 1 1 auto;
}

.workspace-card__units {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.workspace-card__units-title {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-small);
}

.workspace-card__unit-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  color: var(--fgColor-accent);
  font-size: var(--fontSize-small);
  background: none;
  border: 1px solid var(--borderColor-accent-muted);
  border-radius: 999px;
  cursor: pointer;
}

.workspace-card__unit-chip:hover {
  background-color: var(--bgColor-accent-muted);
}

.workspace-card__spin {
  color: var(--fgColor-accent);
  animation: workspace-spin 1s linear infinite;
}

.workspace-card__icon-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--borderRadius-medium);
  color: var(--fgColor-default);
}

.workspace-card__icon-link:hover {
  background-color: var(--bgColor-neutral-muted);
}

.workspace-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.workspace-card__projects {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.workspace-card__lock {
  margin-left: 2px;
}

.workspace-card__error {
  margin-top: 8px;
}

@keyframes workspace-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
