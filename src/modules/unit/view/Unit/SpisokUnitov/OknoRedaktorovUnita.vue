<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { copyToClipboard } from "quasar";
import i18n from "@/bootstrap/translator";
import type { Unit } from "@/modules/unit/store/SpisokUnitov/model/Unit";
import type { Schema } from "@/api/types";
import { useAuthStore } from "@/modules/account/store/auth";
import { useSpisokVsehPolzovateleiStore } from "@/modules/account/store/SpisokVsehPolzovateleiStore";
import { useStorRedaktorovUnita } from "@/modules/unit/store/SpisokUnitov/StorRedaktorovUnita";
import { convertDateTime } from "@/utils/dates";
import {
  GhBanner,
  GhButton,
  GhDialog,
  GhFormField,
  GhLabel,
  GhSelect,
  GhSkeleton,
  GhSwitch,
} from "@/components/ui";

const props = defineProps<{
  unit: Unit;
}>();

const authStore = useAuthStore();
const { userId, isAdmin } = storeToRefs(authStore);

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
const { spisok: vsePolzovateli } = storeToRefs(storPolzovatelei);

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
  return (
    mozhetUpravlyat.value ||
    props.unit.moguRedaktirovat === true ||
    props.unit.redaktorMode === "edit"
  );
});

/** Подпись причины запрета из поля `prichinaZapreta`. */
const podpisPrichini = computed<string | null>(() => {
  if (props.unit.prichinaZapreta === "protected_branch") {
    return i18n.global.t("unit.redaktor.prichina.protected_branch");
  }

  if (props.unit.prichinaZapreta === "net_tokena") {
    return i18n.global.t("unit.redaktor.prichina.net_tokena");
  }

  return null;
});

/** Выбранный в селекторе пользователь. */
const vibraniyUserId = ref<string | null>(null);

/** Варианты для селектора: все пользователи, кроме уже прикреплённых. */
const variantyPolzovatelei = computed<{ label: string; value: string }[]>(() => {
  const zanyatie = new Set(
    redaktory.value.map((redaktor: Schema<"RedaktorUnita">) => redaktor.userId),
  );

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

/** Открывает полученную ссылку редактора в новой вкладке. */
function otkritSsylku(): void {
  if (!ssylka.value) {
    return;
  }

  window.open(ssylka.value.ssylka, "_blank", "noopener,noreferrer");
}
</script>

<template>
  <GhDialog v-model="vidno" width="560px" :title="$t('unit.redaktor.dialog.title')">
    <div v-if="loader" class="okno-redaktorov__skeleton" aria-busy="true">
      <GhSkeleton variant="text" width="40%" height="12" />
      <GhSkeleton variant="rect" width="100%" height="32" />
      <GhSkeleton variant="text" width="70%" height="12" />
    </div>

    <div v-else class="okno-redaktorov">
      <div class="okno-redaktorov__row">
        <div class="okno-redaktorov__grow">
          <div class="okno-redaktorov__label">{{ $t("unit.redaktor.toggle.label") }}</div>
          <div v-if="rezhimZablokirovan && podpisPrichini" class="okno-redaktorov__hint">
            {{ podpisPrichini }}
          </div>
          <div v-else-if="netLichnogoTokena" class="okno-redaktorov__hint">
            {{ $t("unit.redaktor.hints.net_tokena") }}
          </div>
        </div>

        <GhSwitch
          :model-value="redaktirovanieVklucheno"
          :disabled="!mozhetUpravlyat || rezhimZablokirovan"
          :aria-label="$t('unit.redaktor.toggle.label')"
          @update:model-value="perekluchitRedaktirovanie"
        />
      </div>

      <hr class="okno-redaktorov__divider" />

      <div>
        <div v-if="redaktory.length === 0" class="okno-redaktorov__muted">
          {{ $t("unit.redaktor.editors.empty") }}
        </div>

        <ul v-else class="okno-redaktorov__list">
          <li
            v-for="redaktor in redaktory"
            :key="redaktor.userId"
            class="okno-redaktorov__list-item"
          >
            <span class="okno-redaktorov__grow">{{ redaktor.imya }}</span>

            <GhLabel
              :variant="redaktor.imeetTokenNaProekt ? 'success' : 'neutral'"
              :icon="redaktor.imeetTokenNaProekt ? 'check' : 'x'"
            >
              {{
                redaktor.imeetTokenNaProekt
                  ? $t("unit.redaktor.editors.token_yes")
                  : $t("unit.redaktor.editors.token_no")
              }}
            </GhLabel>

            <GhButton
              variant="danger"
              size="sm"
              icon="x"
              :label="$t('unit.redaktor.buttons.detach')"
              :disabled="!mozhnoOtkrepit(redaktor)"
              :loading="dejstvieUserId === redaktor.userId"
              @click="otkrepit(redaktor)"
            />
          </li>
        </ul>
      </div>

      <div class="okno-redaktorov__row okno-redaktorov__row--field">
        <GhFormField
          class="okno-redaktorov__grow"
          :label="$t('unit.redaktor.fields.user')"
        >
          <template #default="{ controlId, ariaDescribedby, ariaInvalid }">
            <GhSelect
              v-model="vibraniyUserId"
              :id="controlId"
              :aria-describedby="ariaDescribedby"
              :aria-invalid="ariaInvalid"
              :options="variantyPolzovatelei"
              :placeholder="$t('unit.redaktor.fields.user')"
              :disabled="!mozhnoPrikrepit"
            />
          </template>
        </GhFormField>

        <GhButton
          variant="primary"
          icon="plus"
          :label="$t('unit.redaktor.buttons.attach')"
          :disabled="!vibraniyUserId || !mozhnoPrikrepit"
          @click="prikrepit"
        />
      </div>

      <template v-if="mozhnoPoluchitSsylku">
        <hr class="okno-redaktorov__divider" />

        <div>
          <GhButton
            variant="default"
            icon="link"
            :label="$t('unit.redaktor.buttons.my_link')"
            :loading="loaderSsylki"
            @click="poluchitSsylku"
          />

          <div v-if="ssylka" class="okno-redaktorov__link">
            <code class="okno-redaktorov__link-value gh-mono">{{ ssylka.ssylka }}</code>

            <div class="okno-redaktorov__link-actions">
              <GhButton
                variant="invisible"
                size="sm"
                icon="copy"
                :label="$t('unit.redaktor.buttons.copy_link')"
                @click="skopirovatSsylku"
              />

              <GhButton
                variant="invisible"
                size="sm"
                icon="link"
                :label="$t('unit.redaktor.buttons.open_link')"
                @click="otkritSsylku"
              />

              <span class="okno-redaktorov__muted">
                {{ $t("unit.redaktor.link.expires") }}: {{ convertDateTime(ssylka.expiresAt) }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <GhBanner v-if="oshibka" variant="danger">
        {{ perevodKlyucha(oshibka) }}
      </GhBanner>
    </div>

    <template #footer>
      <GhButton
        variant="default"
        :label="$t('common.buttons.close')"
        @click="vidno = false"
      />
    </template>
  </GhDialog>
</template>

<style scoped>
.okno-redaktorov {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.okno-redaktorov__skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.okno-redaktorov__row {
  display: flex;
  align-items: center;
  gap: 12px;
}

/*
 * Строка «поле + кнопка»: кнопка выравнивается по нижней границе инпута,
 * а не по центру блока «подпись + инпут» — иначе «Прикрепить» уезжает вверх.
 */
.okno-redaktorov__row--field {
  align-items: flex-end;
}

.okno-redaktorov__grow {
  flex: 1 1 auto;
  min-width: 0;
}

.okno-redaktorov__label {
  font-weight: var(--fontWeight-semibold);
}

.okno-redaktorov__hint {
  color: var(--fgColor-attention);
  font-size: var(--fontSize-caption);
}

.okno-redaktorov__muted {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.okno-redaktorov__divider {
  margin: 0;
  border: 0;
  border-top: 1px solid var(--borderColor-default);
}

.okno-redaktorov__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.okno-redaktorov__list-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.okno-redaktorov__link {
  margin-top: 8px;
  padding: 8px 12px;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-medium);
  background-color: var(--bgColor-muted);
}

.okno-redaktorov__link-value {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.okno-redaktorov__link-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
</style>
