<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useQuasar } from "quasar";
import { onMounted } from "vue";
import i18n from "@/bootstrap/translator";
import { useStorSpiskaRekvizitovOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/StorSpiskaRekvizitovOpenCode";
import { useFormaRekvizitovOpenCodeStore } from "@/modules/account/store/SpisokRekvizitovOpenCode/FormaRekvizitovOpenCodeStore";
import FormaRekvizitovOpenCode from "@/modules/account/view/AccountSettings/FormaRekvizitovOpenCode.vue";
import { convertDate } from "@/utils/dates";
import type { Schema } from "@/api/types";

const $q = useQuasar();
const storSpiska = useStorSpiskaRekvizitovOpenCode();
const formaStore = useFormaRekvizitovOpenCodeStore();

const { spisok, loaderSpiska, oshibkaZagruzki, udalyaemiId } = storeToRefs(storSpiska);

/**
 * Подтверждение удаления.
 *
 * Удалённые реквизиты нельзя восстановить, а сессии, созданные под ними, больше
 * не смогут запускать ходы, поэтому удаление всегда через диалог.
 */
function podtverditUdalenie(rekvizity: Schema<"OpenCodeCredential">) {
    $q.dialog({
        title: i18n.global.t('opencode.rekvizity.delete.caption'),
        message: i18n.global.t('opencode.rekvizity.delete.message'),
        cancel: true,
        persistent: true,
    }).onOk(() => {
        storSpiska.udalitRekvizity(rekvizity.id);
    });
}

onMounted(() => {
    storSpiska.poluchitSpisok();
});
</script>

<template>
  <q-card class="q-mb-md">
    <q-card-section class="bg-primary text-white row items-center">
      <div class="text-subtitle2 col">OpenCode: {{ $t('opencode.rekvizity.caption') }}</div>
      <q-btn
          dense
          flat
          icon="add"
          color="white"
          :disable="loaderSpiska"
          @click="formaStore.otkritSozdanie()"
      >
        <q-tooltip>{{ $t('opencode.rekvizity.buttons.add') }}</q-tooltip>
      </q-btn>
      <q-btn
          dense
          flat
          icon="refresh"
          color="white"
          :loading="loaderSpiska"
          @click="storSpiska.poluchitSpisok()"
      >
        <q-tooltip>{{ $t('opencode.rekvizity.buttons.refresh') }}</q-tooltip>
      </q-btn>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <div v-if="oshibkaZagruzki" class="text-negative q-mb-sm">{{ oshibkaZagruzki }}</div>

      <div v-if="!loaderSpiska && spisok.length === 0" class="text-grey-7">
        {{ $t('opencode.rekvizity.empty') }}
      </div>

      <q-list v-else separator>
        <q-item v-for="rekvizity in spisok" :key="rekvizity.id">
          <q-item-section>
            <q-item-label>{{ rekvizity.name }}</q-item-label>
            <q-item-label caption>
              {{ rekvizity.url }} · {{ rekvizity.model }}
            </q-item-label>
            <q-item-label caption>
              {{ $t('opencode.rekvizity.fields.api_key_hint') }}: <code>{{ rekvizity.apiKeyHint }}</code>
              · {{ $t('opencode.rekvizity.fields.updated_at') }}: {{ convertDate(rekvizity.updatedAt) }}
            </q-item-label>
          </q-item-section>

          <q-item-section side>
            <div class="row q-gutter-xs">
              <q-btn
                  dense
                  flat
                  icon="edit"
                  color="primary"
                  @click="formaStore.otkritIzmenenie(rekvizity)"
              >
                <q-tooltip>{{ $t('opencode.rekvizity.buttons.edit') }}</q-tooltip>
              </q-btn>
              <q-btn
                  dense
                  flat
                  icon="delete"
                  color="negative"
                  :loading="udalyaemiId === rekvizity.id"
                  @click="podtverditUdalenie(rekvizity)"
              >
                <q-tooltip>{{ $t('opencode.rekvizity.buttons.delete') }}</q-tooltip>
              </q-btn>
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>

    <FormaRekvizitovOpenCode />
  </q-card>
</template>
