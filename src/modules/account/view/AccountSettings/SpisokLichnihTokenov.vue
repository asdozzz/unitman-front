<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useQuasar } from "quasar";
import { onMounted, ref } from "vue";
import i18n from "@/bootstrap/translator";
import { useStorLichnihTokenov } from "@/modules/account/store/StorLichnihTokenov";
import { useStorFormiLichnogoTokena } from "@/modules/account/store/StorFormiLichnogoTokena";
import ProektiService from "@/modules/unit/services/ProektiService";
import FormaDobavleniyaLichnogoTokena from "@/modules/account/view/AccountSettings/FormaDobavleniyaLichnogoTokena.vue";
import { convertDateTime } from "@/utils/dates";
import type { Schema } from "@/api/types";

const $q = useQuasar();
const storSpiska = useStorLichnihTokenov();
const formaStore = useStorFormiLichnogoTokena();

const {
    spisok,
    loaderSpiska,
    oshibkaZagruzki,
    dejstvieId,
    oshibkaDejstviya,
    poslednijRezultat,
} = storeToRefs(storSpiska);

/** Соответствие id проекта его имени; при недоступности показывается id. */
const imenaProektov = ref<Record<string, string>>({});

/** Имена проектов нужны для чипсов; список токенов от этого не зависит. */
async function zagruzitImenaProektov() {
    const response = await ProektiService.list();

    if (response.status !== "success") {
        return;
    }

    const karta: Record<string, string> = {};

    for (const proekt of response.data) {
        karta[proekt.id] = proekt.name;
    }

    imenaProektov.value = karta;
}

function nazvanieProekta(id: string): string {
    return imenaProektov.value[id] ?? id;
}

/** Удалённый токен не восстановить, поэтому удаление всегда через диалог. */
function podtverditUdalenie(token: Schema<"LichniyTokenPublic">) {
    $q.dialog({
        title: i18n.global.t('account.lichniy_tokeni.delete.caption'),
        message: i18n.global.t('account.lichniy_tokeni.delete.message', { nazvanie: token.nazvanie }),
        cancel: true,
        persistent: true,
    }).onOk(() => {
        storSpiska.udalit(token.id);
    });
}

onMounted(() => {
    storSpiska.poluchitSpisok();
    zagruzitImenaProektov();
});
</script>

<template>
  <q-card class="q-mb-md">
    <q-card-section class="bg-primary text-white row items-center">
      <div class="text-subtitle2 col">{{ $t('account.lichniy_tokeni.title') }}</div>
      <q-btn
          dense
          flat
          icon="add"
          color="white"
          :disable="loaderSpiska"
          @click="formaStore.otkryt()"
      >
        <q-tooltip>{{ $t('account.lichniy_tokeni.buttons.add') }}</q-tooltip>
      </q-btn>
      <q-btn
          dense
          flat
          icon="refresh"
          color="white"
          :loading="loaderSpiska"
          @click="storSpiska.poluchitSpisok()"
      >
        <q-tooltip>{{ $t('account.lichniy_tokeni.buttons.refresh') }}</q-tooltip>
      </q-btn>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <!-- Результат определения прав после добавления или перепроверки. -->
      <q-banner v-if="poslednijRezultat" dense class="bg-blue-1 q-mb-sm">
        <template #avatar>
          <q-icon name="verified" color="primary" />
        </template>
        <div class="text-weight-medium">
          {{ $t('account.lichniy_tokeni.result.caption') }}: {{ poslednijRezultat.nazvanie }}
        </div>
        <div v-if="poslednijRezultat.bezPravNaRedaktirovanie" class="text-negative">
          {{ $t('account.lichniy_tokeni.result.bez_prav') }}
        </div>
        <div v-else>
          {{ $t('account.lichniy_tokeni.obyom_prav.caption') }}:
          {{ poslednijRezultat.obyomPrav === 'vse'
              ? $t('account.lichniy_tokeni.obyom_prav.vse')
              : $t('account.lichniy_tokeni.obyom_prav.spisok') }}
          <template v-if="poslednijRezultat.obyomPrav === 'spisok' && poslednijRezultat.proektySPushom.length > 0">
            — {{ poslednijRezultat.proektySPushom.map(nazvanieProekta).join(', ') }}
          </template>
        </div>
        <template #action>
          <q-btn dense flat icon="close" @click="storSpiska.ochistitRezultat()" />
        </template>
      </q-banner>

      <div v-if="oshibkaZagruzki" class="text-negative q-mb-sm">{{ oshibkaZagruzki }}</div>
      <div v-if="oshibkaDejstviya" class="text-negative q-mb-sm">{{ oshibkaDejstviya }}</div>

      <div v-if="!loaderSpiska && spisok.length === 0" class="text-grey-7">
        {{ $t('account.lichniy_tokeni.empty') }}
      </div>

      <q-list v-else separator>
        <q-item v-for="token in spisok" :key="token.id">
          <q-item-section>
            <q-item-label>{{ token.nazvanie }}</q-item-label>
            <q-item-label caption>
              {{ $t('account.lichniy_tokeni.fields.token_hint') }}: <code>{{ token.tokenHint }}</code>
              · {{ $t('account.lichniy_tokeni.fields.provereno_v') }}: {{ convertDateTime(token.proverenoV) }}
              · {{ $t('account.lichniy_tokeni.obyom_prav.caption') }}:
              {{ token.obyomPrav === 'vse'
                  ? $t('account.lichniy_tokeni.obyom_prav.vse')
                  : $t('account.lichniy_tokeni.obyom_prav.spisok') }}
            </q-item-label>

            <div class="q-mt-xs row items-center q-gutter-xs">
              <template v-if="token.obyomPrav === 'vse'">
                <q-chip
                    dense
                    size="sm"
                    color="primary"
                    text-color="white"
                    icon="public"
                >
                  {{ $t('account.lichniy_tokeni.proekti.all') }}
                </q-chip>
              </template>
              <template v-else>
                <q-chip
                    v-for="projectId in token.proektySPushom"
                    :key="projectId"
                    dense
                    size="sm"
                    icon="folder"
                >
                  {{ nazvanieProekta(projectId) }}
                </q-chip>
              </template>

              <q-chip
                  v-if="token.bezPravNaRedaktirovanie"
                  dense
                  size="sm"
                  color="negative"
                  text-color="white"
                  icon="warning"
              >
                {{ $t('account.lichniy_tokeni.hints.bez_prav') }}
              </q-chip>
            </div>
          </q-item-section>

          <q-item-section side>
            <div class="row q-gutter-xs">
              <q-btn
                  dense
                  flat
                  icon="refresh"
                  color="primary"
                  :loading="dejstvieId === token.id"
                  @click="storSpiska.pereproverit(token.id)"
              >
                <q-tooltip>{{ $t('account.lichniy_tokeni.buttons.pereproverit') }}</q-tooltip>
              </q-btn>
              <q-btn
                  dense
                  flat
                  icon="delete"
                  color="negative"
                  :loading="dejstvieId === token.id"
                  @click="podtverditUdalenie(token)"
              >
                <q-tooltip>{{ $t('account.lichniy_tokeni.buttons.delete') }}</q-tooltip>
              </q-btn>
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>

    <FormaDobavleniyaLichnogoTokena />
  </q-card>
</template>
