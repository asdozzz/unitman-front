<script setup lang="ts">
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useFormaZapolneniyaPeremenihUnitaStore } from "@/modules/unit/store/SpisokUnitov/FormaZapolneniyaPeremenihUnitStore";
import PeremenayaKonfiga from "@/modules/unit/view/Unit/Konfig/PeremenayaKonfiga.vue";
import FaylVoluma from "@/modules/unit/view/Unit/Konfig/FaylVoluma.vue";
import { GhBanner, GhButton, GhSkeleton } from "@/components/ui";

const formStore = useFormaZapolneniyaPeremenihUnitaStore();
const { form, oshibkaOtBackenda, loader } = storeToRefs(formStore);

onMounted(async () => {
  await formStore.poluchitPeremenieUnita();
});

const emit = defineEmits<{
  formaBilaOtpravlena: [];
}>();

async function otpravitFormu() {
  const response = await formStore.otpravitFormu();

  if (response.status === "success") {
    emit("formaBilaOtpravlena");
    formStore.zakritFormu();
  }
}
</script>

<template>
  <div class="unit-form">
    <div v-if="loader" class="unit-form__skeleton" aria-busy="true">
      <GhSkeleton variant="text" width="35%" height="12" />
      <GhSkeleton variant="rect" width="100%" height="32" />
      <GhSkeleton variant="text" width="45%" height="12" />
      <GhSkeleton variant="rect" width="100%" height="32" />
    </div>

    <template v-else>
      <template v-for="peremenaya in form.values" :key="peremenaya.konfig.id">
        <PeremenayaKonfiga :peremenaya="peremenaya" />
      </template>

      <template v-if="form.volumes.length > 0">
        <div class="unit-form__section-title">{{ $t("unit.form_volume.title") }}</div>
        <template v-for="volume in form.volumes" :key="volume.volume.dir">
          <FaylVoluma
            :volume="volume"
            @zagruzit="formStore.zagruzitFaylToma"
            @udalit="formStore.udalitFaylToma"
            @vibrat="formStore.vibratFaylProekta"
            @ochistit="formStore.ochistitFaylToma"
          />
        </template>
      </template>
    </template>

    <GhBanner v-if="oshibkaOtBackenda" variant="danger">
      {{ oshibkaOtBackenda }}
    </GhBanner>

    <div class="unit-form__actions">
      <GhButton
        variant="default"
        :label="$t('common.buttons.close')"
        :disabled="loader"
        @click="formStore.zakritFormu()"
      />
      <GhButton
        variant="primary"
        icon="check"
        :label="$t('common.buttons.ok')"
        :loading="loader"
        @click="otpravitFormu"
      />
    </div>
  </div>
</template>

<style scoped>
.unit-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.unit-form__skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.unit-form__section-title {
  color: var(--fgColor-default);
  font-size: var(--fontSize-title);
  font-weight: var(--fontWeight-semibold);
}

.unit-form__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
</style>
