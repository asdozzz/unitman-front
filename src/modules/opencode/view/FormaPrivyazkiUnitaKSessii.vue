<script setup lang="ts">
import { storeToRefs } from "pinia";
import {
    GhBanner,
    GhButton,
    GhDialog,
    GhFormField,
    GhSkeleton,
    GhSwitch,
} from "@/components/ui";
import { useStorFormiPrivyazkiUnitaKSessii } from "@/modules/opencode/store/StorFormiPrivyazkiUnitaKSessii";

/**
 * Диалог привязки юнитов к существующей сессии.
 *
 * Уже привязанные юниты исключены из выбора: привязка идемпотентна, но
 * показывать их повторно бессмысленно. После успешной привязки стор сам
 * перезапрашивает список сессий, поэтому компонент не управляет навигацией.
 */
const formaStore = useStorFormiPrivyazkiUnitaKSessii();
const {
    otkrita,
    unitIds,
    dostupnieUniti,
    loaderUnitov,
    oshibkaZagruzkiUnitov,
    loader,
    oshibkaOtBackenda,
    mozhnoSohranit,
} = storeToRefs(formaStore);

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
</script>

<template>
  <GhDialog
      :model-value="otkrita"
      :title="$t('opencode.sessions.attach.caption')"
      width="520px"
      persistent
      @update:model-value="formaStore.zakrit()"
  >
    <div class="opencode-form">
      <GhFormField
          :label="$t('opencode.sessions.attach.fields.units')"
          :caption="$t('opencode.sessions.attach.hint_units')"
      >
        <div class="opencode-form__switch-list">
          <template v-if="loaderUnitov">
            <GhSkeleton v-for="n in 3" :key="'unit-skeleton-' + n" height="28px" />
          </template>

          <template v-else>
            <GhSwitch
                v-for="unit in dostupnieUniti"
                :key="unit.id"
                :model-value="unitIds.includes(unit.id)"
                :label="unit.name"
                :description="`${unit.projectName} · ${unit.branch}`"
                @update:model-value="perekluchitUnita(unit.id, $event)"
            />
          </template>

          <p v-if="!loaderUnitov && dostupnieUniti.length === 0" class="opencode-form__muted">
            {{ $t('opencode.sessions.attach.empty') }}
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
          :label="$t('opencode.sessions.attach.buttons.close')"
          :disabled="loader"
          @click="formaStore.zakrit()"
      />
      <GhButton
          variant="primary"
          :label="$t('opencode.sessions.attach.buttons.ok')"
          :loading="loader"
          :disabled="!mozhnoSohranit"
          @click="formaStore.sohranit()"
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
  max-height: 260px;
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
