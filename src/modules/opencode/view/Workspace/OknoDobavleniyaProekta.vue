<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { GhBanner, GhButton, GhDialog, GhFormField, GhInput, GhSelect } from "@/components/ui";
import type { GhSelectOption } from "@/components/ui";
import OpenCodeService from "@/modules/opencode/services/OpenCodeService";
import ProektiService from "@/modules/unit/services/ProektiService";
import type { Proekt } from "@/modules/unit/store/SpisokProektov/model/Proekt";
import type { Workspace } from "@/modules/opencode/model/Workspace";

const props = defineProps<{
    modelValue: boolean;
    workspace: Workspace | null;
}>();

const emit = defineEmits<{
    "update:modelValue": [value: boolean];
    done: [];
}>();

const { t } = useI18n();

const proekti = ref<Proekt[]>([]);
const vybranniyProekt = ref("");
const bazovayaVetka = ref("");
const lokalnayaVetka = ref("");
const loader = ref(false);
const oshibka = ref<string | null>(null);

const optsProektov = computed<GhSelectOption[]>(() =>
    proekti.value.map((project) => ({ value: project.id, label: `${project.name} · ${project.code}` })),
);

function zakryt(): void {
    emit("update:modelValue", false);
}

function izmenitProekt(value: string | number | null): void {
    vybranniyProekt.value = value === null ? "" : String(value);
    const project = proekti.value.find((item) => item.id === vybranniyProekt.value);
    bazovayaVetka.value = project?.mainBranch ?? "";
    lokalnayaVetka.value = "";
}

async function zagruzitProekti(): Promise<void> {
    const response = await ProektiService.list({ limit: 200, offset: 0 });
    if (response.status === "success") {
        proekti.value = response.data;
    }
}

async function dobavit(): Promise<void> {
    if (!props.workspace || vybranniyProekt.value === "" || lokalnayaVetka.value.trim() === "") {
        return;
    }

    loader.value = true;
    oshibka.value = null;

    try {
        const branchResponse = await ProektiService.sozdatVetku({
            projectId: vybranniyProekt.value,
            nazvanie: lokalnayaVetka.value.trim(),
            otVetki: bazovayaVetka.value.trim(),
        });

        if (branchResponse.status !== "success") {
            oshibka.value = branchResponse.status === "fail"
                ? branchResponse.data.message
                : branchResponse.message;
            return;
        }

        const response = await OpenCodeService.dobavitProektVWorkspace({
            workspaceId: props.workspace.id,
            projects: [{ projectId: vybranniyProekt.value, branch: lokalnayaVetka.value.trim() }],
        });

        if (response.status !== "success") {
            oshibka.value = response.status === "fail" ? response.data.message : response.message;
            return;
        }

        emit("done");
        zakryt();
    } finally {
        loader.value = false;
    }
}

watch(
    () => props.modelValue,
    (otkrita) => {
        if (!otkrita) {
            return;
        }

        vybranniyProekt.value = "";
        bazovayaVetka.value = "";
        lokalnayaVetka.value = "";
        oshibka.value = null;
        void zagruzitProekti();
    },
);
</script>

<template>
  <GhDialog
      :model-value="modelValue"
      :title="t('opencode.workspace.actions.add_project')"
      width="520px"
      @update:model-value="zakryt()"
  >
    <div class="opencode-form">
      <GhFormField :label="t('opencode.workspace.form.fields.projects')">
        <GhSelect
            :model-value="vybranniyProekt"
            :options="optsProektov"
            @update:model-value="izmenitProekt"
        />
      </GhFormField>

      <GhFormField :label="t('opencode.workspace.form.fields.base_branch')">
        <GhInput v-model="bazovayaVetka" />
      </GhFormField>

      <GhFormField :label="t('opencode.workspace.form.fields.local_branch')">
        <GhInput v-model="lokalnayaVetka" />
      </GhFormField>

      <GhBanner v-if="oshibka" variant="danger">{{ oshibka }}</GhBanner>
    </div>

    <template #footer>
      <GhButton :label="t('common.buttons.cancel')" :disabled="loader" @click="zakryt()" />
      <GhButton
          variant="primary"
          :label="t('opencode.workspace.actions.add_project')"
          :loading="loader"
          :disabled="vybranniyProekt === '' || lokalnayaVetka.trim() === ''"
          @click="dobavit()"
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
</style>
