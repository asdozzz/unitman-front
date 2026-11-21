<script setup lang="ts">
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
} = storeToRefs(formaStore);

async function sozdat() {
    const id = await formaStore.sozdatIDobavitVSpiske();

    if (id !== null) {
        emit("sozdan", id);
    }
}
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
