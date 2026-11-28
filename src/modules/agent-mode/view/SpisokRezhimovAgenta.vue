<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
    GhBanner,
    GhBox,
    GhButton,
    GhDialog,
    GhFormField,
    GhInput,
    GhLabel,
    GhSelect,
    GhSkeleton,
    GhSwitch,
} from "@/components/ui";
import type { GhSelectOption } from "@/components/ui";
import AgentModeService from "@/modules/agent-mode/services/AgentModeService";
import { useStorRezhimovAgenta } from "@/modules/agent-mode/store/StorRezhimovAgenta";
import type {
    AgentMode,
    RezhimDostupaAgenta,
    TipChataAgenta,
} from "@/modules/agent-mode/model/AgentMode";
import { useStorSpiskaRekvizitovOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/StorSpiskaRekvizitovOpenCode";
import { modeliRekvizitov, modelPoUmolchaniyu } from "@/modules/opencode/model/ModeliOpenCode";

/**
 * Управление модами агентов.
 *
 * `admin = true` — общий каталог: администратор создаёт и редактирует общие
 * моды. Иначе пользователь управляет своими модами и настройками общих.
 */
const props = withDefaults(defineProps<{ admin?: boolean }>(), {
    admin: false,
});

const { t } = useI18n();
const store = useStorRezhimovAgenta();
const rekvizity = useStorSpiskaRekvizitovOpenCode();

const oshibka = ref<string | null>(null);
const deystvie = ref(false);
const dialogOtkrit = ref(false);
const redaktiruemyyId = ref<string | null>(null);
const form = ref({
    name: "",
    slug: "",
    description: "",
    prompt: "",
    accessMode: "build" as RezhimDostupaAgenta,
});

const rezhimy = computed<AgentMode[]>(() =>
    props.admin ? store.modes.filter((mode) => mode.isGlobal) : store.modes,
);

const optsRekvizitov = computed<GhSelectOption[]>(() =>
    rekvizity.spisok.map((item) => ({ value: item.id, label: item.name })),
);

const optsRezhimaDostupa = computed<GhSelectOption[]>(() => [
    { value: "build", label: t("opencode.agent_modes.access_build") },
    { value: "plan", label: t("opencode.agent_modes.access_plan") },
]);

function modeliDlya(mode: AgentMode): GhSelectOption[] {
    const item = rekvizity.rekvizityPoId(mode.credentialId ?? "");

    return modeliRekvizitov(item).map((model) => ({ value: model, label: model }));
}

async function zagruzit(): Promise<void> {
    oshibka.value = null;

    if (rekvizity.spisok.length === 0) {
        await rekvizity.poluchitSpisok();
    }

    await store.zagruzit(true);

    if (store.error !== null) {
        oshibka.value = store.error;
    }
}

async function izmenitVidimost(mode: AgentMode, enabled: boolean): Promise<void> {
    await sohranitNastroyki(mode, { enabled });
}

async function izmenitRekvizity(mode: AgentMode, value: string | number | null): Promise<void> {
    const credentialId = value === null ? "" : String(value);
    const item = rekvizity.rekvizityPoId(credentialId);

    await sohranitNastroyki(mode, {
        credentialId,
        model: modelPoUmolchaniyu(item) || null,
    });
}

async function izmenitModel(mode: AgentMode, value: string | number | null): Promise<void> {
    await sohranitNastroyki(mode, { model: value === null ? null : String(value) });
}

async function sohranitNastroyki(
    mode: AgentMode,
    izmeneniya: { credentialId?: string; model?: string | null; enabled?: boolean },
): Promise<void> {
    deystvie.value = true;
    oshibka.value = null;

    const response = await AgentModeService.nastroit({
        modeId: mode.id,
        credentialId: izmeneniya.credentialId ?? mode.credentialId,
        model: izmeneniya.model !== undefined ? izmeneniya.model : mode.model,
        enabled: izmeneniya.enabled ?? mode.enabled,
        sortOrder: mode.sortOrder,
    });

    deystvie.value = false;

    if (response.status !== "success") {
        oshibka.value = response.status === "fail" ? response.data.message : response.message;

        return;
    }

    await store.zagruzit(true);
}

async function sdelatDefault(mode: AgentMode, tip: TipChataAgenta): Promise<void> {
    deystvie.value = true;
    oshibka.value = null;

    const response = await AgentModeService.poUmolchaniyu(tip, mode.id);

    deystvie.value = false;

    if (response.status !== "success") {
        oshibka.value = response.status === "fail" ? response.data.message : response.message;

        return;
    }

    await store.zagruzit(true);
}

async function otkrytSozdanie(): Promise<void> {
    redaktiruemyyId.value = null;
    form.value = {
        name: "",
        slug: "",
        description: "",
        prompt: "",
        accessMode: "build",
    };
    dialogOtkrit.value = true;
}

async function otkrytRedaktirovanie(mode: AgentMode): Promise<void> {
    deystvie.value = true;
    oshibka.value = null;

    const response = await AgentModeService.read(mode.id);

    deystvie.value = false;

    if (response.status !== "success") {
        oshibka.value = response.status === "fail" ? response.data.message : response.message;

        return;
    }

    redaktiruemyyId.value = mode.id;
    form.value = {
        name: response.data.name,
        slug: response.data.slug,
        description: response.data.description,
        prompt: response.data.prompt,
        accessMode: response.data.accessMode,
    };
    dialogOtkrit.value = true;
}

async function sohranit(): Promise<void> {
    deystvie.value = true;
    oshibka.value = null;

    const response = redaktiruemyyId.value === null
        ? await AgentModeService.sozdat({
            name: form.value.name,
            slug: form.value.slug || null,
            description: form.value.description,
            prompt: form.value.prompt,
            accessMode: form.value.accessMode,
            scope: props.admin ? "global" : "personal",
        })
        : await AgentModeService.izmenit({
            id: redaktiruemyyId.value,
            name: form.value.name,
            slug: form.value.slug || null,
            description: form.value.description,
            prompt: form.value.prompt,
            accessMode: form.value.accessMode,
        });

    deystvie.value = false;

    if (response.status !== "success") {
        oshibka.value = response.status === "fail" ? response.data.message : response.message;

        return;
    }

    dialogOtkrit.value = false;
    await store.zagruzit(true);
}

async function arhivirovat(mode: AgentMode): Promise<void> {
    deystvie.value = true;
    oshibka.value = null;

    const response = await AgentModeService.udalit(mode.id);

    deystvie.value = false;

    if (response.status !== "success") {
        oshibka.value = response.status === "fail" ? response.data.message : response.message;

        return;
    }

    await store.zagruzit(true);
}

onMounted(() => {
    void zagruzit();
});
</script>

<template>
  <div class="agent-modes">
    <div class="agent-modes__header">
      <div>
        <h3 class="agent-modes__title">
          {{ t(props.admin ? "opencode.agent_modes.admin_title" : "opencode.agent_modes.title") }}
        </h3>
        <p class="agent-modes__subtitle">
          {{ t(props.admin ? "opencode.agent_modes.admin_subtitle" : "opencode.agent_modes.subtitle") }}
        </p>
      </div>
      <GhButton
          variant="primary"
          icon="plus"
          :label="t('opencode.agent_modes.create')"
          :disabled="deystvie"
          @click="otkrytSozdanie"
      />
    </div>

    <GhBanner v-if="oshibka" variant="danger">
      {{ oshibka }}
    </GhBanner>

    <div v-if="store.loading" class="agent-modes__skeleton">
      <GhSkeleton v-for="n in 3" :key="'agent-mode-skeleton-' + n" height="84px" />
    </div>

    <div v-else-if="rezhimy.length === 0" class="agent-modes__empty">
      {{ t("opencode.agent_modes.empty") }}
    </div>

    <GhBox
        v-for="mode in rezhimy"
        :key="mode.id"
        padding="md"
        class="agent-modes__card"
    >
      <div class="agent-modes__card-head">
        <div class="agent-modes__name-block">
          <span class="agent-modes__name">{{ mode.name }}</span>
          <GhLabel variant="neutral">
            {{ t(mode.isGlobal ? "opencode.agent_modes.global" : "opencode.agent_modes.personal") }}
          </GhLabel>
          <GhLabel :variant="mode.accessMode === 'plan' ? 'attention' : 'success'">
            {{ t(mode.accessMode === 'plan' ? "opencode.agent_modes.access_plan" : "opencode.agent_modes.access_build") }}
          </GhLabel>
        </div>
        <div class="agent-modes__actions">
          <GhButton
              v-if="mode.isOwner || (props.admin && mode.isGlobal)"
              variant="invisible"
              size="sm"
              icon="pencil"
              :label="t('opencode.agent_modes.edit')"
              :disabled="deystvie"
              @click="otkrytRedaktirovanie(mode)"
          />
          <GhButton
              v-if="mode.isOwner || (props.admin && mode.isGlobal)"
              variant="invisible"
              size="sm"
              icon="archive"
              :label="t('opencode.agent_modes.archive')"
              :disabled="deystvie"
              @click="arhivirovat(mode)"
          />
        </div>
      </div>

      <p v-if="mode.description" class="agent-modes__description">{{ mode.description }}</p>

      <div class="agent-modes__controls">
        <GhSwitch
            :model-value="mode.enabled"
            :label="t('opencode.agent_modes.enabled')"
            :disabled="deystvie || !mode.isGlobal"
            @update:model-value="izmenitVidimost(mode, $event)"
        />
        <GhSelect
            :model-value="mode.credentialId"
            :options="optsRekvizitov"
            size="sm"
            :disable="deystvie"
            :placeholder="t('opencode.agent_modes.credential_placeholder')"
            :aria-label="t('opencode.agent_modes.credential')"
            @update:model-value="izmenitRekvizity(mode, $event)"
        />
        <GhSelect
            :model-value="mode.model"
            :options="modeliDlya(mode)"
            size="sm"
            use-input
            hide-selected
            fill-input
            :disable="deystvie || mode.credentialId === null"
            :placeholder="t('opencode.agent_modes.model_placeholder')"
            :aria-label="t('opencode.agent_modes.model')"
            @update:model-value="izmenitModel(mode, $event)"
        />
      </div>

      <div class="agent-modes__defaults">
        <GhButton
            size="sm"
            :variant="mode.isDefaultUnit ? 'primary' : 'default'"
            icon="check"
            :label="t('opencode.agent_modes.default_unit')"
            :disabled="deystvie"
            @click="sdelatDefault(mode, 'unit')"
        />
        <GhButton
            size="sm"
            :variant="mode.isDefaultWorkspace ? 'primary' : 'default'"
            icon="check"
            :label="t('opencode.agent_modes.default_workspace')"
            :disabled="deystvie"
            @click="sdelatDefault(mode, 'workspace')"
        />
      </div>
    </GhBox>

    <GhDialog
        v-model="dialogOtkrit"
        :title="t(redaktiruemyyId === null ? 'opencode.agent_modes.create' : 'opencode.agent_modes.edit')"
        width="640px"
        persistent
    >
      <div class="agent-modes__form">
        <GhFormField :label="t('opencode.agent_modes.name')">
          <GhInput v-model="form.name" :maxlength="128" />
        </GhFormField>
        <GhFormField :label="t('opencode.agent_modes.slug')" :caption="t('opencode.agent_modes.slug_hint')">
          <GhInput v-model="form.slug" :maxlength="64" />
        </GhFormField>
        <GhFormField :label="t('opencode.agent_modes.description')">
          <GhInput v-model="form.description" :maxlength="512" />
        </GhFormField>
        <GhFormField :label="t('opencode.agent_modes.access_mode')">
          <GhSelect v-model="form.accessMode" :options="optsRezhimaDostupa" />
        </GhFormField>
        <GhFormField :label="t('opencode.agent_modes.prompt')">
          <GhInput v-model="form.prompt" type="textarea" autogrow />
        </GhFormField>
      </div>

      <template #footer>
        <GhButton :label="t('opencode.agent_modes.cancel')" :disabled="deystvie" @click="dialogOtkrit = false" />
        <GhButton
            variant="primary"
            :label="t('opencode.agent_modes.save')"
            :loading="deystvie"
            :disabled="form.name.trim() === '' || form.prompt.trim() === ''"
            @click="sohranit"
        />
      </template>
    </GhDialog>
  </div>
</template>

<style scoped>
.agent-modes {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.agent-modes__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.agent-modes__title {
  margin: 0;
  font-size: var(--fontSize-title);
}

.agent-modes__subtitle,
.agent-modes__description,
.agent-modes__empty {
  margin: 4px 0 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.agent-modes__skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.agent-modes__card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.agent-modes__card-head,
.agent-modes__name-block,
.agent-modes__controls,
.agent-modes__defaults,
.agent-modes__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.agent-modes__card-head {
  justify-content: space-between;
}

.agent-modes__name {
  font-weight: var(--fontWeight-semibold);
}

.agent-modes__controls :deep(.gh-select) {
  flex: 1 1 180px;
  min-width: 150px;
}

.agent-modes__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
