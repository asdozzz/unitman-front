<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { useFormaRekvizitovOpenCodeStore } from "@/modules/account/store/SpisokRekvizitovOpenCode/FormaRekvizitovOpenCodeStore";
import { useStorSpiskaRekvizitovOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/StorSpiskaRekvizitovOpenCode";

const formaStore = useFormaRekvizitovOpenCodeStore();
const storSpiska = useStorSpiskaRekvizitovOpenCode();
const { forma, loader, oshibkaOtBackenda, redaktiruemiId, maskaTekushegoKlyucha, etoSozdanie } = storeToRefs(formaStore);

const zagolovok = computed(() => etoSozdanie.value ? 'opencode.rekvizity.form.caption_create' : 'opencode.rekvizity.form.caption_edit');

/**
 * Подпись к полю ключа.
 *
 * При изменении ключ не приходит с бэкенда целиком, поэтому показывается только
 * маска, а пустое поле означает «оставить прежний».
 */
const podskazkaKlyucha = computed(() => {
    if (etoSozdanie.value) {
        return null;
    }

    return maskaTekushegoKlyucha.value;
});

const mozhnoSohranit = computed(() => {
    if (loader.value) {
        return false;
    }

    const estImya = forma.value.name.trim() !== "";
    const estUrl = forma.value.url.trim() !== "";
    const estModel = forma.value.model.trim() !== "";
    const estKlyuch = forma.value.apiKey.trim() !== "";

    // Ключ обязателен только при создании: при изменении пустое поле — «не менять».
    return estImya && estUrl && estModel && (estKlyuch || !etoSozdanie.value);
});

/** Сохранение идёт через стор списка: он же перезапрашивает список после успеха. */
function sohranit() {
    storSpiska.sohranitRekvizity();
}
</script>

<template>
  <q-dialog :model-value="redaktiruemiId !== null" persistent @update:model-value="formaStore.zakrit()">
    <q-card style="min-width: 480px">
      <q-card-section class="bg-primary text-white">
        <div class="text-subtitle2">{{ $t(zagolovok) }}</div>
      </q-card-section>

      <q-card-section class="q-gutter-sm">
        <q-input
            v-model="forma.name"
            :label="$t('opencode.rekvizity.form.fields.name')"
            filled
            dense
            autofocus
        />
        <q-input
            v-model="forma.url"
            :label="$t('opencode.rekvizity.form.fields.url')"
            hint="https://api.opencode.ai"
            filled
            dense
        />
        <q-input
            v-model="forma.model"
            :label="$t('opencode.rekvizity.form.fields.model')"
            hint="claude-sonnet-4"
            filled
            dense
        />
        <q-input
            v-model="forma.apiKey"
            :label="$t('opencode.rekvizity.form.fields.api_key')"
            :type="'password'"
            :hint="podskazkaKlyucha
                ? $t('opencode.rekvizity.form.fields.api_key_keep', { hint: podskazkaKlyucha })
                : $t('opencode.rekvizity.form.fields.api_key_new')"
            filled
            dense
        />

        <div v-if="oshibkaOtBackenda" class="text-negative">{{ oshibkaOtBackenda }}</div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat :label="$t('opencode.rekvizity.form.buttons.close')" :disable="loader" @click="formaStore.zakrit()" />
        <q-btn
            color="primary"
            :label="$t('opencode.rekvizity.form.buttons.ok')"
            :loading="loader"
            :disable="!mozhnoSohranit"
            @click="sohranit()"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
