<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import {
    GhBanner,
    GhButton,
    GhDialog,
    GhEmptyState,
    GhFormField,
    GhInput,
    GhLabel,
    GhSelect,
    GhSkeleton,
} from "@/components/ui";
import type { GhSelectOption } from "@/components/ui";
import {
    useStorUchastnikovWorkspace,
    type RolDlyaPriglasheniya,
} from "@/modules/opencode/store/StorUchastnikovWorkspace";
import { useStorSpiskaRekvizitovOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/StorSpiskaRekvizitovOpenCode";
import { modeliRekvizitov } from "@/modules/opencode/model/ModeliOpenCode";
import type { WorkspaceParticipant } from "@/modules/opencode/model/WorkspaceSession";

/**
 * Диалог участников общего workspace.
 *
 * Бэкенд не отдаёт список кандидатов, поэтому приглашение идёт по введённому
 * `accountId`. Владелец неприкосновенен: понизить роль и удалить его нельзя
 * (бэкенд всё равно отклонит запрос), поэтому UI не показывает этих действий.
 */
const props = defineProps<{
    modelValue: boolean;
    workspaceId: string;
    /** `true` — текущий пользователь владелец и может менять участников. */
    canManage: boolean;
}>();

const emit = defineEmits<{
    (e: "update:modelValue", value: boolean): void;
    (e: "izmeneno"): void;
}>();

const { t } = useI18n();

const stor = useStorUchastnikovWorkspace();
const storRekvizitov = useStorSpiskaRekvizitovOpenCode();

const { spisok, loader, oshibka, dejstvieAccountId, dejstvie, idetDejstvie } = storeToRefs(stor);

const accountId = ref<string>("");
const rol = ref<RolDlyaPriglasheniya>("writer");
const credentialId = ref<string>("");
const model = ref<string>("");

const optsRoley = computed<GhSelectOption[]>(() => [
    { value: "writer", label: t("opencode.workspace.participants.roles.writer") },
    { value: "viewer", label: t("opencode.workspace.participants.roles.viewer") },
]);

const optsRekvizitov = computed<GhSelectOption[]>(() =>
    storRekvizitov.spisok.map((rekvizity) => ({
        value: rekvizity.id,
        label: rekvizity.name,
    })),
);

const vibranieRekvizityModeli = computed<string[]>(() => {
    if (credentialId.value === "") {
        return [];
    }

    return modeliRekvizitov(storRekvizitov.rekvizityPoId(credentialId.value));
});

const optsModelei = computed<GhSelectOption[]>(() =>
    vibranieRekvizityModeli.value.map((nazvanie) => ({ value: nazvanie, label: nazvanie })),
);

/** Текст ошибки: известный ключ переводим, неизвестный показываем как есть. */
const tekstOshibki = computed<string>(() => {
    if (oshibka.value === null) {
        return "";
    }

    return t(oshibka.value) !== oshibka.value ? t(oshibka.value) : oshibka.value;
});

function perevodKlyucha(klyuch: string | null | undefined): string {
    if (!klyuch) {
        return "";
    }

    return t(klyuch) !== klyuch ? t(klyuch) : klyuch;
}

/** Подпись роли участника. */
function podpisRoli(uchastnik: WorkspaceParticipant): string {
    return perevodKlyucha(`opencode.workspace.participants.roles.${uchastnik.role}`);
}

function izmenitRol(uchastnik: WorkspaceParticipant, value: string | number | null): void {
    const novayaRol = value === "viewer" ? "viewer" : "writer";

    if (novayaRol === uchastnik.role) {
        return;
    }

    void stor.izmenit({
        accountId: uchastnik.accountId,
        role: novayaRol,
    }).then((uspeh) => {
        if (uspeh) {
            emit("izmeneno");
        }
    });
}

function udalit(uchastnik: WorkspaceParticipant): void {
    void stor.udalit(uchastnik.accountId).then((uspeh) => {
        if (uspeh) {
            emit("izmeneno");
        }
    });
}

function otpravitPriglashenie(): void {
    if (accountId.value.trim() === "") {
        return;
    }

    void stor.dobavit({
        accountId: accountId.value,
        role: rol.value,
        credentialId: credentialId.value === "" ? null : credentialId.value,
        model: model.value === "" ? null : model.value,
    }).then((uspeh) => {
        if (!uspeh) {
            return;
        }

        accountId.value = "";
        rol.value = "writer";
        credentialId.value = "";
        model.value = "";
        emit("izmeneno");
    });
}

function zakrit(): void {
    emit("update:modelValue", false);
}

/** При открытии диалога перечитываем участников и чистим форму. */
watch(
    () => props.modelValue,
    (otkrit) => {
        if (!otkrit) {
            return;
        }

        accountId.value = "";
        rol.value = "writer";
        credentialId.value = "";
        model.value = "";
        stor.sbrositOshibku();
        stor.zagruzit(props.workspaceId);
    },
);

watch(
    () => props.workspaceId,
    (id) => {
        if (props.modelValue && id !== "") {
            stor.zagruzit(id);
        }
    },
);
</script>

<template>
  <GhDialog
      :model-value="modelValue"
      :title="t('opencode.workspace.participants.caption')"
      width="640px"
      @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="gh-participants">
      <GhBanner v-if="tekstOshibki !== ''" variant="danger">
        {{ tekstOshibki }}
        <template #actions>
          <GhButton
              size="sm"
              :label="t('common.buttons.retry')"
              @click="stor.zagruzit(workspaceId)"
          />
        </template>
      </GhBanner>

      <div v-if="loader && spisok.length === 0" class="gh-participants__skeletons" aria-busy="true">
        <GhSkeleton v-for="n in 3" :key="'participant-skeleton-' + n" height="40px" />
      </div>

      <GhEmptyState
          v-else-if="spisok.length === 0 && !loader"
          icon="people"
          :title="t('opencode.workspace.participants.empty')"
          :description="t('opencode.workspace.participants.empty_hint')"
      />

      <ul v-else class="gh-participants__list">
        <li
            v-for="uchastnik in spisok"
            :key="uchastnik.accountId"
            class="gh-participants__row"
        >
          <div class="gh-participants__info">
            <span class="gh-participants__account gh-mono">{{ uchastnik.accountId }}</span>
            <GhLabel v-if="uchastnik.owner" variant="accent">
              {{ t('opencode.workspace.participants.owner') }}
            </GhLabel>
            <GhLabel v-else variant="neutral">
              {{ podpisRoli(uchastnik) }}
            </GhLabel>
          </div>

          <div v-if="canManage && !uchastnik.owner" class="gh-participants__actions">
            <div class="gh-participants__role-select">
              <GhSelect
                  :model-value="uchastnik.role"
                  :options="optsRoley"
                  size="sm"
                  :disabled="idetDejstvie"
                  :aria-label="t('opencode.workspace.participants.change_role')"
                  @update:model-value="izmenitRol(uchastnik, $event)"
              />
            </div>
            <GhButton
                variant="invisible"
                size="sm"
                icon="trash"
                :aria-label="t('opencode.workspace.participants.remove')"
                :title="t('opencode.workspace.participants.remove')"
                :disabled="idetDejstvie"
                :loading="dejstvie === 'remove' && dejstvieAccountId === uchastnik.accountId"
                @click="udalit(uchastnik)"
            />
          </div>
        </li>
      </ul>

      <section v-if="canManage" class="gh-participants__invite">
        <h3 class="gh-participants__invite-title">
          {{ t('opencode.workspace.participants.invite_title') }}
        </h3>

        <GhFormField
            :label="t('opencode.workspace.participants.fields.account_id')"
            :caption="t('opencode.workspace.participants.fields.account_id_hint')"
        >
          <GhInput
              v-model="accountId"
              size="sm"
              :placeholder="t('opencode.workspace.participants.fields.account_id_placeholder')"
              :disabled="idetDejstvie"
          />
        </GhFormField>

        <GhFormField :label="t('opencode.workspace.participants.fields.role')">
          <GhSelect
              v-model="rol"
              :options="optsRoley"
              size="sm"
              :disabled="idetDejstvie"
          />
        </GhFormField>

        <GhFormField
            :label="t('opencode.workspace.participants.fields.credential')"
            :caption="t('opencode.workspace.participants.fields.credential_hint')"
        >
          <GhSelect
              v-model="credentialId"
              :options="optsRekvizitov"
              size="sm"
              clearable
              :disabled="idetDejstvie"
              :placeholder="t('opencode.workspace.participants.fields.credential_placeholder')"
          />
        </GhFormField>

        <GhFormField
            v-if="optsModelei.length > 0"
            :label="t('opencode.workspace.participants.fields.model')"
        >
          <GhSelect
              v-model="model"
              :options="optsModelei"
              size="sm"
              clearable
              use-input
              :disabled="idetDejstvie"
              :placeholder="t('opencode.workspace.participants.fields.model_placeholder')"
          />
        </GhFormField>

        <div class="gh-participants__invite-actions">
          <GhButton
              variant="primary"
              size="sm"
              icon="person-add"
              :label="t('opencode.workspace.participants.buttons.invite')"
              :loading="dejstvie === 'invite'"
              :disabled="idetDejstvie || accountId.trim() === ''"
              @click="otpravitPriglashenie"
          />
        </div>
      </section>

      <p v-else class="gh-participants__readonly">
        {{ t('opencode.workspace.participants.readonly_hint') }}
      </p>
    </div>

    <template #footer>
      <GhButton
          size="sm"
          :label="t('common.buttons.close')"
          @click="zakrit"
      />
    </template>
  </GhDialog>
</template>

<style scoped>
.gh-participants {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.gh-participants__skeletons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gh-participants__list {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0;
  padding: 0;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-medium);
  list-style: none;
}

.gh-participants__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--borderColor-default);
}

.gh-participants__row:last-child {
  border-bottom: 0;
}

.gh-participants__info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.gh-participants__account {
  overflow: hidden;
  font-size: var(--fontSize-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gh-participants__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.gh-participants__role-select {
  width: 140px;
}

.gh-participants__invite {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--borderColor-default);
}

.gh-participants__invite-title {
  margin: 0;
  font-size: var(--fontSize-title);
  font-weight: var(--fontWeight-semibold);
}

.gh-participants__invite-actions {
  display: flex;
  justify-content: flex-end;
}

.gh-participants__readonly {
  margin: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}
</style>
