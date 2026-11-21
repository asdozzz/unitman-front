<script setup lang="ts">
import { computed } from "vue";
import i18n from "@/bootstrap/translator";
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
type DejstvieWorkspace = "archive" | "restore" | "delete";

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
}>();

const tranzitniy = computed(() => statusTranzitniy(props.workspace.status));
const readOnly = computed(() => estReadOnly(props.workspace));
const mozhnoArhiv = computed(() => mozhnoArhivirovat(props.workspace.status));
const mozhnoVosstan = computed(() => mozhnoVosstanovit(props.workspace.status));
const mozhnoUdal = computed(() => mozhnoUdalit(props.workspace.status));

const zagruzhaetsya = computed(() => ({
    archive: props.dejstvie === "archive",
    restore: props.dejstvie === "restore",
    delete: props.dejstvie === "delete",
}));

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
  <q-card flat bordered class="workspace-card q-mb-sm">
    <q-card-section class="q-pb-xs">
      <div class="row items-center q-gutter-xs">
        <WorkspaceStatusBadge :status="workspace.status" />

        <div class="text-subtitle1 ellipsis col">
          {{ workspace.name }}
        </div>

        <q-badge v-if="readOnly" color="orange-8">
          {{ $t('opencode.workspace.badges.read_only') }}
          <q-tooltip>{{ $t('opencode.workspace.badges.read_only_hint') }}</q-tooltip>
        </q-badge>

        <q-badge v-if="workspace.archived" color="grey-6">
          {{ $t('opencode.sessions.archive.badge') }}
        </q-badge>

        <q-spinner v-if="tranzitniy" color="primary" size="1.3em" />

        <q-btn
            v-if="workspace.ideLink"
            dense
            flat
            icon="open_in_new"
            color="primary"
            type="a"
            :href="workspace.ideLink"
            target="_blank"
            rel="noopener noreferrer"
        >
          <q-tooltip>{{ $t('opencode.workspace.buttons.open_ide') }}</q-tooltip>
        </q-btn>

        <q-btn
            v-if="mozhnoOtkritPomoschnik"
            dense
            flat
            icon="link"
            color="primary"
            @click="otkritPomoschnik()"
        >
          <q-tooltip>{{ $t('opencode.workspace.helper.open_button') }}</q-tooltip>
        </q-btn>

        <q-btn dense flat icon="forum" color="primary" @click="emit('open')">
          <q-tooltip>{{ $t('opencode.workspace.buttons.open_chat') }}</q-tooltip>
        </q-btn>

        <q-btn dense flat icon="more_vert" color="primary">
          <q-menu>
            <q-list dense style="min-width: 220px">
              <q-item
                  v-if="mozhnoArhiv"
                  clickable
                  :disable="dejstvie !== null && dejstvie !== undefined"
                  @click="emit('archive')"
              >
                <q-item-section avatar>
                  <q-icon name="archive" color="warning" />
                </q-item-section>
                <q-item-section>{{ $t('opencode.workspace.buttons.archive') }}</q-item-section>
                <q-item-section v-if="zagruzhaetsya.archive" side>
                  <q-spinner size="1.2em" />
                </q-item-section>
              </q-item>

              <q-item
                  v-if="mozhnoVosstan"
                  clickable
                  :disable="dejstvie !== null && dejstvie !== undefined"
                  @click="emit('restore')"
              >
                <q-item-section avatar>
                  <q-icon name="restore" color="primary" />
                </q-item-section>
                <q-item-section>{{ $t('opencode.workspace.buttons.restore') }}</q-item-section>
                <q-item-section v-if="zagruzhaetsya.restore" side>
                  <q-spinner size="1.2em" />
                </q-item-section>
              </q-item>

              <q-separator v-if="mozhnoArhiv || mozhnoVosstan" />

              <q-item
                  v-if="mozhnoUdal"
                  clickable
                  :disable="dejstvie !== null && dejstvie !== undefined"
                  @click="emit('delete')"
              >
                <q-item-section avatar>
                  <q-icon name="delete" color="negative" />
                </q-item-section>
                <q-item-section class="text-negative">
                  {{ $t('opencode.workspace.buttons.delete') }}
                </q-item-section>
                <q-item-section v-if="zagruzhaetsya.delete" side>
                  <q-spinner size="1.2em" />
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>

      <div class="text-caption text-grey-7 q-mt-xs">
        {{ $t('opencode.workspace.fields.branch') }}: {{ workspace.branch }}
        · {{ $t('opencode.workspace.fields.projects_count', { count: workspace.projects.length }) }}
        · {{ $t('opencode.sessions.fields.updated_at') }}: {{ convertDate(workspace.updatedAt) }}
        · {{ $t('opencode.sessions.fields.created_at') }}: {{ convertDate(workspace.createdAt) }}
      </div>
    </q-card-section>

    <q-card-section v-if="workspace.projects.length > 0" class="q-py-xs row items-center q-gutter-xs">
      <q-chip
          v-for="project in workspace.projects"
          :key="'ws_project_' + project.projectId"
          dense
          square
          color="primary"
          text-color="white"
          icon="folder"
          :label="podpisProekta(project)"
      >
        <q-icon
            v-if="!project.canPush"
            name="lock"
            size="14px"
            class="q-ml-xs"
        >
          <q-tooltip>{{ $t('opencode.workspace.badges.no_push_project') }}</q-tooltip>
        </q-icon>
      </q-chip>
    </q-card-section>

    <q-banner v-if="workspace.status === 'ERROR'" dense class="bg-red-1 text-negative">
      <div class="row items-center q-gutter-sm">
        <q-icon name="error_outline" />
        <span class="col">{{ oshibka ?? $t('opencode.workspace.errors.operation_failed') }}</span>
        <q-btn
            v-if="mozhnoVosstan"
            dense
            flat
            no-caps
            color="primary"
            :label="$t('opencode.workspace.buttons.restore')"
            @click="emit('restore')"
        />
        <q-btn
            v-if="mozhnoUdal"
            dense
            flat
            no-caps
            color="negative"
            :label="$t('opencode.workspace.buttons.delete')"
            @click="emit('delete')"
        />
      </div>
    </q-banner>

    <!-- Один экземпляр диалога на список: только у карточки-источника. -->
    <OknoSsylkiWorkspace v-if="workspace.id === storPomoschnika.workspaceId" />
  </q-card>
</template>

<style scoped>
.workspace-card {
  transition: box-shadow 0.15s ease;
}
</style>
