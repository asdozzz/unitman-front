<script setup lang="ts">
import {computed, ref, watch} from "vue";
import {storeToRefs} from "pinia";
import {copyToClipboard} from "quasar";
import i18n from "@/bootstrap/translator";
import type {Unit} from "@/modules/unit/store/SpisokUnitov/model/Unit";
import type {Schema} from "@/api/types";
import {useAuthStore} from "@/modules/account/store/auth";
import {useSpisokVsehPolzovateleiStore} from "@/modules/account/store/SpisokVsehPolzovateleiStore";
import {useStorRedaktorovUnita} from "@/modules/unit/store/SpisokUnitov/StorRedaktorovUnita";
import {convertDateTime} from "@/utils/dates";

const props = defineProps<{
  unit: Unit;
}>();

const authStore = useAuthStore();
const {userId, isAdmin} = storeToRefs(authStore);

const stor = useStorRedaktorovUnita();
const {
  otkryt,
  loader,
  redaktirovanieVklucheno,
  redaktory,
  oshibka,
  ssylka,
  loaderSsylki,
  dejstvieUserId,
} = storeToRefs(stor);

const storPolzovatelei = useSpisokVsehPolzovateleiStore();
const {spisok: vsePolzovateli, loaderSpiska: loaderPolzovatelei} = storeToRefs(storPolzovatelei);

/** Автор юнита или администратор — только они управляют редакторами. */
const mozhetUpravlyat = computed<boolean>(() => {
  return props.unit.authorId === userId.value || isAdmin.value;
});

/** Защищённая ветка или явный режим `locked` запрещают редактирование всем. */
const rezhimZablokirovan = computed<boolean>(() => {
  return props.unit.vetkaZashishena === true || props.unit.redaktorMode === "locked";
});

/** У текущего пользователя нет личного токена с правами на проект. */
const netLichnogoTokena = computed<boolean>(() => {
  return props.unit.prichinaZapreta === "net_tokena";
});

const mozhnoPrikrepit = computed<boolean>(() => {
  return mozhetUpravlyat.value && !rezhimZablokirovan.value;
});

/** Ссылка редактора доступна автору и пользователям с правом редактирования. */
const mozhnoPoluchitSsylku = computed<boolean>(() => {
  return mozhetUpravlyat.value
      || props.unit.moguRedaktirovat === true
      || props.unit.redaktorMode === "edit";
});

/** Подпись причины запрета из поля `prichinaZapreta`. */
const podpisPrichini = computed<string | null>(() => {
  if (props.unit.prichinaZapreta === "protected_branch") {
    return i18n.global.t('unit.redaktor.prichina.protected_branch');
  }

  if (props.unit.prichinaZapreta === "net_tokena") {
    return i18n.global.t('unit.redaktor.prichina.net_tokena');
  }

  return null;
});

/** Выбранный в селекторе пользователь. */
const vibraniyUserId = ref<string | null>(null);

/** Варианты для селектора: все пользователи, кроме уже прикреплённых. */
const variantyPolzovatelei = computed<{label: string, value: string}[]>(() => {
  const zanyatie = new Set(redaktory.value.map((redaktor: Schema<"RedaktorUnita">) => redaktor.userId));

  return vsePolzovateli.value
      .filter((polzovatel) => !zanyatie.has(polzovatel.id))
      .map((polzovatel) => ({
        label: polzovatel.nickname || polzovatel.email,
        value: polzovatel.id,
      }));
});

/**
 * Диалог общий для всех карточек (состояние живёт в сторе), поэтому
 * показывать его должна только карточка, для которой стор открыт.
 */
const aktivenDlyaUnita = computed<boolean>(() => {
  return otkryt.value && stor.unitId === props.unit.id;
});

/** Диалог управляется состоянием стора. */
const vidno = computed<boolean>({
  get: () => aktivenDlyaUnita.value,
  set: (value: boolean) => {
    if (!value && aktivenDlyaUnita.value) {
      stor.zakryt();
    }
  },
});

/** Пользователи грузятся при открытии, если ещё не загружены. */
watch(aktivenDlyaUnita, (value: boolean) => {
  if (value && storPolzovatelei.spisok.length === 0) {
    void storPolzovatelei.poluchitVsehPolzovatelei();
  }
});

/** Ключ перевода ошибки приходит с бэкенда; неизвестный показываем как есть. */
function perevodKlyucha(klyuch: string | null): string | null {
  if (!klyuch) {
    return null;
  }

  return i18n.global.te(klyuch) ? i18n.global.t(klyuch) : klyuch;
}

/** Открепить может автор, админ или сам редактор. */
function mozhnoOtkrepit(redaktor: Schema<"RedaktorUnita">): boolean {
  return mozhetUpravlyat.value || redaktor.userId === userId.value;
}

async function perekluchitRedaktirovanie(value: boolean): Promise<void> {
  if (value) {
    await stor.vklyuchit();
  } else {
    await stor.vykluchit();
  }
}

async function prikrepit(): Promise<void> {
  if (!vibraniyUserId.value) {
    return;
  }

  const uspeh = await stor.prikrepit(vibraniyUserId.value);

  if (uspeh) {
    vibraniyUserId.value = null;
  }
}

async function otkrepit(redaktor: Schema<"RedaktorUnita">): Promise<void> {
  await stor.otkrepit(redaktor.userId);
}

async function poluchitSsylku(): Promise<void> {
  await stor.poluchitSsylku();
}

async function skopirovatSsylku(): Promise<void> {
  if (!ssylka.value) {
    return;
  }

  await copyToClipboard(ssylka.value.ssylka);
}
</script>

<template>
  <q-dialog v-model="vidno">
    <q-card class="okno-redaktorov">
      <q-card-section class="row items-center no-wrap">
        <div class="text-h6">{{ $t('unit.redaktor.dialog.title') }}</div>
        <q-space />
        <q-btn flat round dense icon="close" v-close-popup />
      </q-card-section>

      <q-separator />

      <q-card-section v-if="loader" class="row justify-center q-pa-lg">
        <q-spinner color="primary" size="32px" />
      </q-card-section>

      <q-card-section v-else class="q-gutter-y-md">
        <div class="row items-center no-wrap q-gutter-sm">
          <div class="col">
            <div class="text-subtitle2">{{ $t('unit.redaktor.toggle.label') }}</div>
            <div v-if="rezhimZablokirovan && podpisPrichini" class="text-caption text-warning">
              {{ podpisPrichini }}
            </div>
            <div v-else-if="netLichnogoTokena" class="text-caption text-warning">
              {{ $t('unit.redaktor.hints.net_tokena') }}
            </div>
          </div>

          <q-toggle
              :model-value="redaktirovanieVklucheno"
              :disable="!mozhetUpravlyat || rezhimZablokirovan"
              color="positive"
              @update:model-value="perekluchitRedaktirovanie"
          />
        </div>

        <q-separator />

        <div>
          <div v-if="redaktory.length === 0" class="text-caption text-grey">
            {{ $t('unit.redaktor.editors.empty') }}
          </div>

          <q-list v-else dense separator>
            <q-item v-for="redaktor in redaktory" :key="redaktor.userId">
              <q-item-section>
                <q-item__label no-caption>{{ redaktor.imya }}</q-item__label>
              </q-item-section>

              <q-item-section side>
                <q-chip
                    dense
                    square
                    text-color="white"
                    :color="redaktor.imeetTokenNaProekt ? 'positive' : 'grey'"
                >
                  {{ redaktor.imeetTokenNaProekt
                    ? $t('unit.redaktor.editors.token_yes')
                    : $t('unit.redaktor.editors.token_no') }}
                </q-chip>
              </q-item-section>

              <q-item-section side>
                <q-btn
                    flat
                    dense
                    color="negative"
                    :label="$t('unit.redaktor.buttons.detach')"
                    :disable="!mozhnoOtkrepit(redaktor)"
                    :loading="dejstvieUserId === redaktor.userId"
                    @click="otkrepit(redaktor)"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </div>

        <div>
          <div class="text-subtitle2 q-mb-sm">{{ $t('unit.redaktor.fields.user') }}</div>

          <div class="row items-center no-wrap q-gutter-sm">
            <q-select
                v-model="vibraniyUserId"
                class="col"
                outlined
                dense
                use-input
                fill-input
                hide-selected
                input-debounce="0"
                emit-value
                map-options
                :label="$t('unit.redaktor.fields.user')"
                :options="variantyPolzovatelei"
                :loading="loaderPolzovatelei"
            />

            <q-btn
                color="primary"
                :label="$t('unit.redaktor.buttons.attach')"
                :disable="!vibraniyUserId || !mozhnoPrikrepit"
                @click="prikrepit"
            />
          </div>
        </div>

        <template v-if="mozhnoPoluchitSsylku">
          <q-separator />

          <div>
            <q-btn
                outline
                color="primary"
                icon="link"
                :label="$t('unit.redaktor.buttons.my_link')"
                :loading="loaderSsylki"
                @click="poluchitSsylku"
            />

            <div v-if="ssylka" class="q-mt-sm">
              <q-field dense outlined readonly :model-value="ssylka.ssylka">
                <template #control>
                  <div class="ellipsis">{{ ssylka.ssylka }}</div>
                </template>
              </q-field>

              <div class="row items-center q-gutter-sm q-mt-sm">
                <q-btn
                    flat
                    dense
                    icon="content_copy"
                    :label="$t('unit.redaktor.buttons.copy_link')"
                    @click="skopirovatSsylku"
                />

                <q-btn
                    flat
                    dense
                    icon="open_in_new"
                    :label="$t('unit.redaktor.buttons.open_link')"
                    tag="a"
                    :href="ssylka.ssylka"
                    target="_blank"
                    rel="noopener noreferrer"
                />

                <span class="text-caption text-grey">
                  {{ $t('unit.redaktor.link.expires') }}: {{ convertDateTime(ssylka.expiresAt) }}
                </span>
              </div>
            </div>
          </div>
        </template>

        <q-banner v-if="oshibka" dense rounded class="bg-negative text-white">
          {{ perevodKlyucha(oshibka) }}
        </q-banner>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.okno-redaktorov {
  width: 560px;
  max-width: 95vw;
}
</style>
