<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import {
    GhBanner,
    GhButton,
    GhDialog,
    GhFormField,
    GhInput,
    GhSelect,
    GhSkeleton,
    GhSwitch,
} from "@/components/ui";
import type { GhSelectOption } from "@/components/ui";
import { useStorFormiSozdaniyaSessii } from "@/modules/opencode/store/StorFormiSozdaniyaSessii";

/**
 * Диалог создания сессии.
 *
 * Компонент не решает, куда переходить после создания: он только сообщает
 * идентификатор новой сессии. Так диалог можно переиспользовать и в списке,
 * и в чате, не зашивая в него навигацию.
 */
const emit = defineEmits<{ sozdana: [id: string] }>();

const { t } = useI18n();

const formaStore = useStorFormiSozdaniyaSessii();
const {
    otkrita,
    title,
    credentialId,
    model,
    dostupnieModeli,
    modelPoUmolchaniyu,
    unitIds,
    uniti,
    loaderUnitov,
    oshibkaZagruzkiUnitov,
    loader,
    oshibkaOtBackenda,
    rekvizity,
    mozhnoSohranit,
} = storeToRefs(formaStore);

/** Опции реквизитов для GhSelect. */
const optsRekvizitov = computed<GhSelectOption[]>(() =>
    rekvizity.value.map((rekvizit) => ({
        value: rekvizit.id,
        label: rekvizit.name,
    })),
);

/** Опции моделей выбранных реквизитов с подписью дефолтной. */
const optsModelei = computed<GhSelectOption[]>(() => {
    const marker = t("opencode.rekvizity.default_marker");
    const poUmolchaniyu = modelPoUmolchaniyu.value;

    return dostupnieModeli.value.map((nazvanie) => ({
        value: nazvanie,
        label: nazvanie === poUmolchaniyu ? `${nazvanie} (${marker})` : nazvanie,
    }));
});

/** Смена реквизитов: стор сбрасывает модель на их дефолт. */
function izmenitRekvizity(value: string | number | null): void {
    formaStore.ustanovitRekvizity(value === null ? "" : String(value));
}

/** Выбор модели для создаваемой сессии. */
function izmenitModel(value: string | number | null): void {
    formaStore.ustanovitModel(value === null ? null : String(value));
}

/** Множественный выбор юнитов через GhSwitch. */
function perekluchitUnita(id: string, vklyuchen: boolean): void {
    const nabor = new Set(unitIds.value);

    if (vklyuchen) {
        nabor.add(id);
    } else {
        nabor.delete(id);
    }

    unitIds.value = [...nabor];
}

async function sozdat() {
    const id = await formaStore.sozdatISozdatVSpiske();

    if (id !== null) {
        emit("sozdana", id);
    }
}
</script>

<template>
  <GhDialog
      :model-value="otkrita"
      :title="$t('opencode.sessions.form.caption')"
      width="520px"
      persistent
      @update:model-value="formaStore.zakrit()"
  >
    <div class="opencode-form">
      <GhFormField
          :label="$t('opencode.sessions.form.fields.title')"
          :caption="$t('opencode.sessions.form.hint_title')"
      >
        <GhInput v-model="title" />
      </GhFormField>

      <GhFormField :label="$t('opencode.sessions.form.fields.credential')">
        <GhSelect
            :model-value="credentialId"
            :options="optsRekvizitov"
            @update:model-value="izmenitRekvizity"
        />
      </GhFormField>

      <GhFormField :label="$t('opencode.rekvizity.fields.default_model')">
        <GhSelect
            :model-value="model"
            :options="optsModelei"
            use-input
            hide-selected
            fill-input
            :placeholder="$t('opencode.rekvizity.fields.default_model')"
            @update:model-value="izmenitModel"
        />
      </GhFormField>

      <GhFormField
          :label="$t('opencode.sessions.form.fields.units')"
          :caption="$t('opencode.sessions.form.hint_units')"
      >
        <div class="opencode-form__switch-list">
          <template v-if="loaderUnitov">
            <GhSkeleton v-for="n in 3" :key="'unit-skeleton-' + n" height="28px" />
          </template>

          <template v-else>
            <GhSwitch
                v-for="unit in uniti"
                :key="unit.id"
                :model-value="unitIds.includes(unit.id)"
                :label="unit.name"
                :description="`${unit.projectName} · ${unit.branch}`"
                @update:model-value="perekluchitUnita(unit.id, $event)"
            />
          </template>

          <p v-if="!loaderUnitov && uniti.length === 0" class="opencode-form__muted">
            {{ $t('opencode.sessions.fields.no_units') }}
          </p>
        </div>
      </GhFormField>

      <GhBanner v-if="oshibkaZagruzkiUnitov" variant="danger">
        {{ oshibkaZagruzkiUnitov }}
      </GhBanner>

      <GhBanner v-if="oshibkaOtBackenda" variant="danger">
        {{ oshibkaOtBackenda }}
      </GhBanner>
    </div>

    <template #footer>
      <GhButton
          :label="$t('opencode.sessions.form.buttons.close')"
          :disabled="loader"
          @click="formaStore.zakrit()"
      />
      <GhButton
          variant="primary"
          :label="$t('opencode.sessions.form.buttons.ok')"
          :loading="loader"
          :disabled="!mozhnoSohranit"
          @click="sozdat()"
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

.opencode-form__switch-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
}

/* Строки выбора юнитов — 32px, выровнены по центру (F2). */
.opencode-form__switch-list :deep(.gh-switch) {
  min-height: 32px;
  align-items: center;
}

.opencode-form__muted {
  margin: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}
</style>
