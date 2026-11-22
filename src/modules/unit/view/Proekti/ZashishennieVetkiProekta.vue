<script setup lang="ts">
import {storeToRefs} from "pinia";
import {onUnmounted, ref, watch} from "vue";
import i18n from "@/bootstrap/translator";
import {useAuthStore} from "@/modules/account/store/auth";
import {storePolucheniyaProekta} from "@/modules/unit/store/SpisokProektov/StorPolucheniyaProekta";
import {useStorZashishennyhVetok} from "@/modules/unit/store/SpisokProektov/StorZashishennyhVetok";
import {OshibkaMaski, proveritMaskuVetki} from "@/modules/unit/utils/zashishennieVetki";
import {
  GhBanner,
  GhBox,
  GhButton,
} from "@/components/ui";

const authStore = useAuthStore();
const {isAdmin} = storeToRefs(authStore);

const storeProekta = storePolucheniyaProekta();
const {proekt} = storeToRefs(storeProekta);

const stor = useStorZashishennyhVetok();
const {loader, oshibkaOtBackenda, spisok} = storeToRefs(stor);

const lokalnayaOshibka = ref<string | null>(null);
const uspeh = ref<boolean>(false);

/** Таймер автоскрытия успешного баннера. */
let tajmerUspeha: ReturnType<typeof setTimeout> | null = null;

type NewValueDone = (value?: string, mode?: 'add' | 'add-unique' | 'toggle') => void;

watch(
    () => proekt.value?.zashishennieVetki,
    (vetki) => stor.ustanovitSpisok(vetki ?? []),
    {immediate: true},
);

function tekstOshibkiMaski(kod: OshibkaMaski): string {
  switch (kod) {
    case 'empty':
      return i18n.global.t('unit.proekt.zashishennie_vetki.validation.empty');
    case 'too_long':
      return i18n.global.t('unit.proekt.zashishennie_vetki.validation.too_long');
    case 'duplicate':
      return i18n.global.t('unit.proekt.zashishennie_vetki.validation.duplicate');
    case 'too_many':
      return i18n.global.t('unit.proekt.zashishennie_vetki.validation.too_many');
    default:
      return '';
  }
}

function dobavitMasku(value: string, done: NewValueDone): void {
  const oshibka = proveritMaskuVetki(value, spisok.value);
  if (oshibka) {
    lokalnayaOshibka.value = tekstOshibkiMaski(oshibka);
    return;
  }

  lokalnayaOshibka.value = null;
  done(value.trim());
}

async function sohranit(): Promise<void> {
  const id = proekt.value?.id;
  if (!id) {
    return;
  }

  lokalnayaOshibka.value = null;
  const response = await stor.sohranit(id);

  if (response.status === "success") {
    uspeh.value = true;

    if (tajmerUspeha !== null) {
      clearTimeout(tajmerUspeha);
    }

    tajmerUspeha = setTimeout(() => {
      uspeh.value = false;
      tajmerUspeha = null;
    }, 4000);

    await storeProekta.poluchitProekt(id);
  }
}

onUnmounted(() => {
  if (tajmerUspeha !== null) {
    clearTimeout(tajmerUspeha);
    tajmerUspeha = null;
  }
});
</script>

<template>
  <GhBox v-if="isAdmin" padding="md" class="protected-branches">
    <template #header>
      {{ $t('unit.proekt.zashishennie_vetki.title') }}
    </template>

    <p class="protected-branches__hint">{{ $t('unit.proekt.zashishennie_vetki.hint') }}</p>

    <GhBanner v-if="uspeh" variant="success" dismissible @dismiss="uspeh = false" class="protected-branches__message">
      {{ $t('common.notifications.success') }}
    </GhBanner>

    <q-select
        v-model="spisok"
        class="protected-branches__select"
        use-input
        use-chips
        multiple
        hide-selected
        fill-input
        outlined
        dense
        @new-value="dobavitMasku"
    />

    <p v-if="lokalnayaOshibka" class="protected-branches__error">{{ lokalnayaOshibka }}</p>
    <p v-if="spisok.length === 0" class="protected-branches__empty">
      {{ $t('unit.proekt.zashishennie_vetki.empty') }}
    </p>

    <GhBanner v-if="oshibkaOtBackenda" variant="danger" class="protected-branches__message">
      {{ oshibkaOtBackenda }}
    </GhBanner>

    <template #footer>
      <GhButton
          variant="primary"
          icon="check"
          :label="$t('unit.proekt.zashishennie_vetki.buttons.save')"
          :loading="loader"
          @click="sohranit"
      />
    </template>
  </GhBox>
</template>

<style scoped>
.protected-branches {
  max-width: 560px;
}

.protected-branches__hint {
  margin: 0 0 12px;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-normal);
}

.protected-branches__select {
  width: 100%;
}

.protected-branches__message {
  margin-top: 12px;
}

.protected-branches__error {
  margin: 6px 0 0;
  color: var(--fgColor-danger);
  font-size: var(--fontSize-caption);
}

.protected-branches__empty {
  margin: 6px 0 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

</style>
