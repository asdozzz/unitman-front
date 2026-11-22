<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import {
  GhBanner,
  GhBox,
  GhButton,
  GhFormField,
  GhInput,
  GhLabel,
} from "@/components/ui";
import { storNastroekPolzovatelya } from "@/modules/account/store/StorNastroekPolzovatelya";
import { useAuthStore } from "@/modules/account/store/auth";

const props = withDefaults(
  defineProps<{
    /** Исходное значение ника, с которым сравнивается форма. */
    baseline?: string;
  }>(),
  {
    baseline: "",
  },
);

const emit = defineEmits<{
  (e: "saved", nickname: string): void;
}>();

const { t } = useI18n();

const store = storNastroekPolzovatelya();
const { formNickname, oshibkaOtBackendaNick, loader } = storeToRefs(store);

const authStore = useAuthStore();
const { email } = storeToRefs(authStore);

const sohraneno = ref<boolean>(false);
const oshibkaSohraneniya = ref<boolean>(false);

let tajmerUspeha: ReturnType<typeof setTimeout> | null = null;

/** В форме есть изменения относительно исходного значения. */
const estIzmeneniya = computed<boolean>(
  () => formNickname.value.newNickname.trim() !== props.baseline,
);

/** Пустой ник отправить нельзя. */
const mozhnoSohranit = computed<boolean>(
  () => estIzmeneniya.value && formNickname.value.newNickname.trim() !== "" && !loader.value,
);

/** Текст ошибки: сообщение бэкенда либо общий текст «не удалось сохранить». */
const tekstOshibki = computed<string>(() => {
  if (oshibkaOtBackendaNick.value) {
    return oshibkaOtBackendaNick.value;
  }

  return oshibkaSohraneniya.value ? t("settings.save_error") : "";
});

function skrytUspehCherezZaderzhku(): void {
  if (tajmerUspeha !== null) {
    clearTimeout(tajmerUspeha);
  }

  tajmerUspeha = setTimeout(() => {
    sohraneno.value = false;
    tajmerUspeha = null;
  }, 4000);
}

function obnovitNick(znachenie: string | number | null): void {
  formNickname.value.newNickname = znachenie === null ? "" : String(znachenie);
  sohraneno.value = false;
  oshibkaSohraneniya.value = false;
}

/** Сохранение ника через существующий use-case стора. */
async function sohranitProfil(): Promise<void> {
  if (!mozhnoSohranit.value) {
    return;
  }

  oshibkaSohraneniya.value = false;

  const otvet = await store.izmenitNick();

  if (otvet?.status === "success") {
    sohraneno.value = true;
    emit("saved", formNickname.value.newNickname);
    skrytUspehCherezZaderzhku();
    return;
  }

  sohraneno.value = false;
  oshibkaSohraneniya.value = true;
}

function sbrositIzmeneniya(): void {
  formNickname.value.newNickname = props.baseline;
  store.oshibkaOtBackendaNick = null;
  sohraneno.value = false;
  oshibkaSohraneniya.value = false;
}

onUnmounted(() => {
  if (tajmerUspeha !== null) {
    clearTimeout(tajmerUspeha);
  }
});
</script>

<template>
  <GhBox>
    <template #header>
      <span>{{ t("settings.profile.title") }}</span>
    </template>

    <div class="tab-profil__body">
      <GhBanner
        v-if="sohraneno"
        variant="success"
        :title="t('settings.profile.saved')"
        dismissible
        @dismiss="sohraneno = false"
      />

      <GhBanner
        v-if="tekstOshibki"
        variant="danger"
        :title="t('settings.save_error')"
        dismissible
        @dismiss="oshibkaSohraneniya = false"
      >
        {{ tekstOshibki }}
      </GhBanner>

      <GhFormField :label="t('settings.profile.nickname')">
        <template #default="{ controlId, ariaDescribedby, ariaInvalid }">
          <GhInput
            :id="controlId"
            :model-value="formNickname.newNickname"
            :placeholder="t('settings.profile.nickname_placeholder')"
            :aria-describedby="ariaDescribedby"
            :aria-invalid="ariaInvalid"
            :disabled="loader"
            @update:model-value="obnovitNick"
          />
        </template>
      </GhFormField>

      <div class="tab-profil__email">
        <span class="tab-profil__email-label">{{ t("settings.profile.email") }}</span>
        <span class="gh-mono tab-profil__email-value">{{ email ?? "" }}</span>
        <GhLabel variant="neutral" :label="t('settings.profile.email_readonly')" />
      </div>
    </div>

    <template #footer>
      <GhButton
        variant="default"
        :label="t('settings.profile.reset')"
        :disabled="!estIzmeneniya || loader"
        @click="sbrositIzmeneniya"
      />
      <GhButton
        variant="primary"
        icon="check"
        :label="t('settings.profile.save')"
        :loading="loader"
        :disabled="!mozhnoSohranit"
        @click="sohranitProfil"
      />
    </template>
  </GhBox>
</template>

<style scoped>
.tab-profil__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tab-profil__email {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: var(--fgColor-default);
  font-size: var(--fontSize-body);
}

.tab-profil__email-label {
  font-weight: var(--fontWeight-semibold);
}

.tab-profil__email-value {
  color: var(--fgColor-muted);
  word-break: break-all;
}
</style>
