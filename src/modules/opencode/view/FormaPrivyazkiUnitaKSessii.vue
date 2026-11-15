<script setup lang="ts">
import { storeToRefs } from "pinia";
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
</script>

<template>
  <q-dialog :model-value="otkrita" persistent @update:model-value="formaStore.zakrit()">
    <q-card style="min-width: 460px">
      <q-card-section class="bg-primary text-white">
        <div class="text-subtitle2">{{ $t('opencode.sessions.attach.caption') }}</div>
      </q-card-section>

      <q-card-section class="q-gutter-sm">
        <q-select
            v-model="unitIds"
            :options="dostupnieUniti"
            option-value="id"
            option-label="name"
            emit-value
            map-options
            multiple
            use-chips
            :loading="loaderUnitov"
            :label="$t('opencode.sessions.attach.fields.units')"
            :hint="$t('opencode.sessions.attach.hint_units')"
            filled
            dense
        >
          <template #option="scope">
            <q-item v-bind="scope.itemProps">
              <q-item-section>
                <q-item-label>{{ scope.opt.name }}</q-item-label>
                <q-item-label caption>
                  {{ scope.opt.projectName }} · {{ scope.opt.branch }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </template>
        </q-select>

        <div v-if="dostupnieUniti.length === 0 && !loaderUnitov" class="text-grey-7">
          {{ $t('opencode.sessions.attach.empty') }}
        </div>

        <div v-if="oshibkaZagruzkiUnitov" class="text-negative">{{ oshibkaZagruzkiUnitov }}</div>
        <div v-if="oshibkaOtBackenda" class="text-negative">{{ oshibkaOtBackenda }}</div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
            flat
            :label="$t('opencode.sessions.attach.buttons.close')"
            :disable="loader"
            @click="formaStore.zakrit()"
        />
        <q-btn
            color="primary"
            :label="$t('opencode.sessions.attach.buttons.ok')"
            :loading="loader"
            :disable="!mozhnoSohranit"
            @click="formaStore.sohranit()"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
