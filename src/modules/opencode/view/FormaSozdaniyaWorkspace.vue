<script setup lang="ts">
import { onBeforeUnmount, watch } from "vue";
import { storeToRefs } from "pinia";
import {
    MAX_PROEKTOV_WORKSPACE,
    useStorFormiSozdaniyaWorkspace,
} from "@/modules/opencode/store/StorFormiSozdaniyaWorkspace";

/**
 * Диалог создания workspace.
 *
 * Как и форма сессии, компонент не решает, куда переходить: он только
 * сообщает идентификатор созданного workspace. Навигация остаётся за списком.
 */
const emit = defineEmits<{ sozdan: [id: string] }>();

const formaStore = useStorFormiSozdaniyaWorkspace();
const {
    otkrita,
    name,
    branch,
    credentialId,
    projectIds,
    prompt,
    proekti,
    loaderProektov,
    oshibkaZagruzkiProektov,
    loader,
    oshibkaOtBackenda,
    rekvizity,
    mozhnoSohranit,
    vetkiPereopredeleniya,
    vetkiProektov,
    oshibkiVetokProektov,
} = storeToRefs(formaStore);

/** Таймеры debounce для фильтра веток, по одному на проект. */
const taimeryVetok = new Map<string, ReturnType<typeof setTimeout>>();

async function sozdat() {
    const id = await formaStore.sozdatIDobavitVSpiske();

    if (id !== null) {
        emit("sozdan", id);
    }
}

/** Название проекта для подписи поля ветки. */
function imyaProekta(projectId: string): string {
    return proekti.value.find((proekt) => proekt.id === projectId)?.name ?? projectId;
}

/** Ветки проекта из кеша стора. */
function vetkiProekta(projectId: string): string[] {
    return vetkiProektov.value[projectId]?.spisok ?? [];
}

/** Идёт ли загрузка веток проекта. */
function loaderVetok(projectId: string): boolean {
    return vetkiProektov.value[projectId]?.loader ?? false;
}

/** Ошибка загрузки веток проекта, если была. */
function oshibkaVetok(projectId: string): string | null {
    return oshibkiVetokProektov.value[projectId] ?? null;
}

/**
 * Фильтр веток проекта с debounce и защитой от гонок в сторе.
 *
 * Пока пользователь печатает, запросы не летят на каждый символ; стор
 * дополнительно отбрасывает устаревшие ответы по номеру запроса.
 */
function filterVetokProekta(
    projectId: string,
    val: string,
    update: (callback: () => void) => void,
): void {
    update(() => {
        // Опции приходят из реактивного стора, локально фильтровать не нужно.
    });

    const query = (val ?? "").trim();
    const suschestvuyushiy = taimeryVetok.get(projectId);

    if (suschestvuyushiy !== undefined) {
        clearTimeout(suschestvuyushiy);
    }

    taimeryVetok.set(projectId, setTimeout(() => {
        taimeryVetok.delete(projectId);
        void formaStore.poluchitVetkiProekta(projectId, query);
    }, 250));
}

/** Сохранить/очистить переопределение ветки проекта. */
function ustanovitVetku(projectId: string, value: string | null): void {
    formaStore.ustanovitVetkuProekta(projectId, value);
}

/**
 * После изменения выбора проектов чистим переопределения и кеш веток
 * для снятых проектов.
 */
watch(
    projectIds,
    () => formaStore.sbalansirovatVetkiProektov(),
    { deep: true },
);

onBeforeUnmount(() => {
    taimeryVetok.forEach((timer) => clearTimeout(timer));
    taimeryVetok.clear();
});
</script>

<template>
  <q-dialog :model-value="otkrita" persistent @update:model-value="formaStore.zakrit()">
    <q-card style="min-width: 520px; max-width: 640px">
      <q-card-section class="bg-primary text-white">
        <div class="text-subtitle2">{{ $t('opencode.workspace.form.caption') }}</div>
      </q-card-section>

      <q-card-section class="q-gutter-sm">
        <q-input
            v-model="name"
            :label="$t('opencode.workspace.form.fields.name')"
            :hint="$t('opencode.workspace.form.hint_name')"
            :maxlength="256"
            filled
            dense
            autofocus
        />

        <q-select
            v-model="credentialId"
            :options="rekvizity"
            option-value="id"
            option-label="name"
            emit-value
            map-options
            :label="$t('opencode.workspace.form.fields.credential')"
            filled
            dense
        />

        <q-input
            v-model="branch"
            :label="$t('opencode.workspace.form.fields.branch')"
            :hint="$t('opencode.workspace.form.hint_branch')"
            :maxlength="256"
            filled
            dense
        />

        <q-select
            v-model="projectIds"
            :options="proekti"
            option-value="id"
            option-label="name"
            emit-value
            map-options
            multiple
            use-chips
            :loading="loaderProektov"
            :label="$t('opencode.workspace.form.fields.projects')"
            :hint="$t('opencode.workspace.form.hint_projects', { max: MAX_PROEKTOV_WORKSPACE, count: projectIds.length })"
            filled
            dense
        >
          <template #option="scope">
            <q-item v-bind="scope.itemProps">
              <q-item-section>
                <q-item-label>{{ scope.opt.name }}</q-item-label>
                <q-item-label caption>{{ scope.opt.code }}</q-item-label>
              </q-item-section>
            </q-item>
          </template>
        </q-select>

        <div
            v-for="projectId in projectIds"
            :key="'vetka-' + projectId"
            class="q-mt-sm"
        >
          <q-select
              :model-value="vetkiPereopredeleniya[projectId] ?? ''"
              :options="vetkiProekta(projectId)"
              :loading="loaderVetok(projectId)"
              :label="$t('opencode.workspace.form.fields.project_branch', { project: imyaProekta(projectId) })"
              :placeholder="$t('opencode.workspace.form.placeholder_project_branch', { branch: branch })"
              :hint="$t('opencode.workspace.form.hint_project_branch')"
              use-input
              fill-input
              hide-selected
              clearable
              filled
              dense
              @filter="(val, update) => filterVetokProekta(projectId, val, update)"
              @update:model-value="(value) => ustanovitVetku(projectId, value)"
          >
            <template #no-option>
              <q-item>
                <q-item-section class="text-grey">
                  {{ $t('opencode.workspace.form.no_project_branches') }}
                </q-item-section>
              </q-item>
            </template>
          </q-select>
          <div v-if="oshibkaVetok(projectId)" class="text-negative text-caption q-mt-xs">
            {{ $t('opencode.workspace.form.error_project_branches') }}: {{ oshibkaVetok(projectId) }}
          </div>
        </div>

        <q-input
            v-model="prompt"
            :label="$t('opencode.workspace.form.fields.prompt')"
            :hint="$t('opencode.workspace.form.hint_prompt')"
            type="textarea"
            autogrow
            filled
            dense
        />

        <div class="text-caption text-grey-7">
          {{ $t('opencode.workspace.form.push_warning') }}
        </div>

        <div v-if="oshibkaZagruzkiProektov" class="text-negative">{{ oshibkaZagruzkiProektov }}</div>
        <div v-if="oshibkaOtBackenda" class="text-negative">{{ oshibkaOtBackenda }}</div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
            flat
            :label="$t('common.buttons.cancel')"
            :disable="loader"
            @click="formaStore.zakrit()"
        />
        <q-btn
            color="primary"
            :label="$t('opencode.workspace.form.buttons.ok')"
            :loading="loader"
            :disable="!mozhnoSohranit"
            @click="sozdat()"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
