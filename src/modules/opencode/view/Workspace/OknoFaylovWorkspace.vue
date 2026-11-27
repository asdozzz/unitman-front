<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { GhBanner, GhButton, GhDialog } from "@/components/ui";
import MediatekaService, { type ChernovikFayla } from "@/modules/unit/services/MediatekaService";
import OpenCodeService from "@/modules/opencode/services/OpenCodeService";
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

const fayly = ref<ChernovikFayla[]>([]);
const zagruzka = ref(false);
const oshibka = ref<string | null>(null);

function zakryt(): void {
    emit("update:modelValue", false);
}

async function vybrat(value: File[] | null): Promise<void> {
    if (!value || value.length === 0) {
        return;
    }

    zagruzka.value = true;
    oshibka.value = null;

    try {
        for (const file of value) {
            const response = await MediatekaService.zagruzitChernovikWorkspace(file);
            if (response.status === "success") {
                fayly.value = [...fayly.value, response.data];
            } else {
                oshibka.value = response.status === "fail" ? response.data.message : response.message;
            }
        }
    } finally {
        zagruzka.value = false;
    }
}

async function prikrepit(): Promise<void> {
    if (!props.workspace || fayly.value.length === 0) {
        return;
    }

    zagruzka.value = true;
    oshibka.value = null;

    try {
        const response = await OpenCodeService.prikrepitFaylyKWorkspace({
            workspaceId: props.workspace.id,
            fileIds: fayly.value.map((file) => file.id),
        });

        if (response.status !== "success") {
            oshibka.value = response.status === "fail" ? response.data.message : response.message;
            return;
        }

        emit("done");
        zakryt();
    } finally {
        zagruzka.value = false;
    }
}

watch(
    () => props.modelValue,
    (otkrita) => {
        if (otkrita) {
            fayly.value = [];
            oshibka.value = null;
        }
    },
);
</script>

<template>
  <GhDialog
      :model-value="modelValue"
      :title="t('opencode.workspace.actions.attach_files')"
      width="520px"
      @update:model-value="zakryt()"
  >
    <div class="opencode-form">
      <q-file
          :model-value="null"
          multiple
          :loading="zagruzka"
          accept=".png,.jpg,.jpeg,.gif,.webp,.txt,.md,.csv,.tsv,.json,.yaml,.yml,.xml,.log"
          :label="t('opencode.workspace.form.fields.files')"
          @update:model-value="(value) => vybrat(value as File[] | null)"
      />

      <ul v-if="fayly.length > 0" class="opencode-form__files">
        <li v-for="file in fayly" :key="file.id">{{ file.name }}</li>
      </ul>

      <GhBanner v-if="oshibka" variant="danger">{{ oshibka }}</GhBanner>
    </div>

    <template #footer>
      <GhButton :label="t('common.buttons.cancel')" :disabled="zagruzka" @click="zakryt()" />
      <GhButton
          variant="primary"
          :label="t('opencode.workspace.actions.attach_files')"
          :loading="zagruzka"
          :disabled="fayly.length === 0"
          @click="prikrepit()"
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

.opencode-form__files {
  margin: 0;
  padding-left: 18px;
}
</style>
