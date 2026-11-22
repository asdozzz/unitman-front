<script setup lang="ts">
import { storFormiDeistviyUnita } from "@/modules/unit/store/SpisokUnitov/StorFormiDeistviy";
import { storeToRefs } from "pinia";
import { GhBanner, GhButton, GhFormField, GhInput, GhLabel, GhSelect } from "@/components/ui";

const storFormiDeistviy = storFormiDeistviyUnita();
const { form, deistvie, loader, oshibkaOtBackenda } = storeToRefs(storFormiDeistviy);

const emit = defineEmits<{
  formaBilaOtpravlena: [];
}>();

async function otpravitFormu() {
  const response = await storFormiDeistviy.otpravitFormu();

  if (response.status === "success") {
    emit("formaBilaOtpravlena");
    storFormiDeistviy.zakritFormu();
  }
}

/** Опции переменной приводятся к контракту GhSelect (`value`/`label`). */
function optiony(peremenaya: { konfig: { options?: { options?: unknown[] } | null } }): {
  value: string;
  label: string;
}[] {
  const istochnik = (peremenaya.konfig.options?.options ?? []) as Array<
    Record<string, unknown>
  >;

  return istochnik.map((option) => ({
    value: String(option.id ?? option.value ?? ""),
    label: String(option.name ?? option.label ?? ""),
  }));
}

function izmenitZnachenie(index: number, znachenie: string | number | null): void {
  const peremenaya = form.value.values[index];

  if (!peremenaya) {
    return;
  }

  peremenaya.value = znachenie === null ? "" : String(znachenie);
}
</script>

<template>
  <div class="unit-form">
    <div v-if="deistvie" class="unit-form__intro">
      <p class="unit-form__name">{{ deistvie.name }}</p>

      <div v-if="deistvie.commands.length > 0" class="unit-form__commands">
        <GhLabel
          v-for="(command, index) in deistvie.commands"
          :key="`${command}-${index}`"
          variant="neutral"
        >
          {{ command }}
        </GhLabel>
      </div>
    </div>

    <template v-for="(peremenaya, index) in form.values" :key="peremenaya.konfig.id">
      <GhFormField :label="peremenaya.konfig.label">
        <template #default="{ controlId, ariaDescribedby, ariaInvalid }">
          <GhSelect
            v-if="peremenaya.konfig.type === 'collection'"
            :id="controlId"
            :aria-describedby="ariaDescribedby"
            :aria-invalid="ariaInvalid"
            :model-value="peremenaya.value"
            :options="optiony(peremenaya)"
            :placeholder="peremenaya.konfig.label"
            @update:model-value="izmenitZnachenie(index, $event)"
          />

          <GhInput
            v-else
            :id="controlId"
            :aria-describedby="ariaDescribedby"
            :aria-invalid="ariaInvalid"
            :model-value="peremenaya.value"
            @update:model-value="izmenitZnachenie(index, $event)"
          />
        </template>
      </GhFormField>
    </template>

    <GhBanner v-if="oshibkaOtBackenda" variant="danger">
      {{ oshibkaOtBackenda }}
    </GhBanner>

    <div class="unit-form__actions">
      <GhButton
        variant="default"
        :label="$t('common.buttons.close')"
        :disabled="loader"
        @click="storFormiDeistviy.zakritFormu()"
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

.unit-form__intro {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.unit-form__name {
  margin: 0;
  color: var(--fgColor-default);
  font-size: var(--fontSize-title);
  font-weight: var(--fontWeight-semibold);
}

.unit-form__commands {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.unit-form__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
</style>
