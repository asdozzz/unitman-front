<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useStorFormiSozdaniyaSessii } from "@/modules/opencode/store/StorFormiSozdaniyaSessii";

/**
 * Диалог создания сессии.
 *
 * Компонент не решает, куда переходить после создания: он только сообщает
 * идентификатор новой сессии. Так диалог можно переиспользовать и в списке,
 * и в чате, не зашивая в него навигацию.
 */
const emit = defineEmits<{ sozdana: [id: string] }>();

const formaStore = useStorFormiSozdaniyaSessii();
const {
    otkrita,
    title,
    credentialId,
    unitIds,
    uniti,
    loaderUnitov,
    oshibkaZagruzkiUnitov,
    loader,
    oshibkaOtBackenda,
    rekvizity,
    mozhnoSohranit,
} = storeToRefs(formaStore);

async function sozdat() {
    const id = await formaStore.sozdatISozdatVSpiske();

    if (id !== null) {
        emit("sozdana", id);
    }
}
</script>

<template>
  <q-dialog :model-value="otkrita" persistent @update:model-value="formaStore.zakrit()">
    <q-card style="min-width: 460px">
      <q-card-section class="bg-primary text-white">
        <div class="text-subtitle2">{{ $t('opencode.sessions.form.caption') }}</div>
      </q-card-section>

      <q-card-section class="q-gutter-sm">
        <q-input
            v-model="title"
            :label="$t('opencode.sessions.form.fields.title')"
            :hint="$t('opencode.sessions.form.hint_title')"
            filled
            dense
            autofocus
        />
        <q-select
            v-model="credentialId"
            :options="rekvizity"
            option-value="id"
            option-label="name"
            emit-value
            map-options
            :label="$t('opencode.sessions.form.fields.credential')"
            filled
            dense
        />
        <q-select
            v-model="unitIds"
            :options="uniti"
            option-value="id"
            option-label="name"
            emit-value
            map-options
            multiple
            use-chips
            :loading="loaderUnitov"
            :label="$t('opencode.sessions.form.fields.units')"
            :hint="$t('opencode.sessions.form.hint_units')"
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

        <div v-if="oshibkaZagruzkiUnitov" class="text-negative">{{ oshibkaZagruzkiUnitov }}</div>
        <div v-if="oshibkaOtBackenda" class="text-negative">{{ oshibkaOtBackenda }}</div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
            flat
            :label="$t('opencode.sessions.form.buttons.close')"
            :disable="loader"
            @click="formaStore.zakrit()"
        />
        <q-btn
            color="primary"
            :label="$t('opencode.sessions.form.buttons.ok')"
            :loading="loader"
            :disable="!mozhnoSohranit"
            @click="sozdat()"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
