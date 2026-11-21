<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useQuasar } from "quasar";
import { useRouter } from "vue-router";
import i18n from "@/bootstrap/translator";
import { useStorSpiskaSessiyOpenCode } from "@/modules/opencode/store/StorSpiskaSessiyOpenCode";
import { useStorSpiskaRekvizitovOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/StorSpiskaRekvizitovOpenCode";
import { useStorFormiSozdaniyaSessii } from "@/modules/opencode/store/StorFormiSozdaniyaSessii";
import { useStorFormiPrivyazkiUnitaKSessii } from "@/modules/opencode/store/StorFormiPrivyazkiUnitaKSessii";
import FormaSozdaniyaSessii from "@/modules/opencode/view/FormaSozdaniyaSessii.vue";
import FormaPrivyazkiUnitaKSessii from "@/modules/opencode/view/FormaPrivyazkiUnitaKSessii.vue";
import OpenCodeRazdelToggle from "@/modules/opencode/view/OpenCodeRazdelToggle.vue";
import { convertDate } from "@/utils/dates";
import type { Schema } from "@/api/types";

const $q = useQuasar();
const router = useRouter();
const storSpiska = useStorSpiskaSessiyOpenCode();
const storRekvizitov = useStorSpiskaRekvizitovOpenCode();
const formaStore = useStorFormiSozdaniyaSessii();
const formaPrivyazki = useStorFormiPrivyazkiUnitaKSessii();

const { spisok, loaderSpiska, oshibkaZagruzki, arhiviruemiId, estArhivnie, nazvanieUnitaPoId } = storeToRefs(storSpiska);
const { oshibkaZagruzki: oshibkaRekvizitov } = storeToRefs(storRekvizitov);

/**
 * Показывать ли архивные сессии.
 *
 * Бэкенд отдаёт архивные сессии вместе с активными, но по умолчанию они
 * скрыты: после архивации сессия пропадает из списка, как и ожидает
 * пользователь. История при этом сохранена, и её можно посмотреть,
 * включив переключатель.
 */
const pokazivatArhiv = ref(false);

const otobrazhaemie = computed(() => {
    return pokazivatArhiv.value
        ? spisok.value
        : spisok.value.filter((sessiya) => !sessiya.archived);
});

/**
 * Без реквизитов сессию создать нельзя, поэтому кнопка блокируется заранее,
 * а не после отказа бэкенда.
 */
const netRekvizitov = computed(() => storRekvizitov.spisok.length === 0);

/** Подпись реквизитов: удалённые реквизиты остаются только идентификатором. */
function imyaRekvizitov(sessiya: Schema<"OpenCodeSession">): string {
    return storRekvizitov.imyaRekvizitov(sessiya.credentialId) ?? sessiya.credentialId;
}

/** Подпись причины архивации; неизвестный ключ показываем как есть. */
function podpisPrichini(sessiya: Schema<"OpenCodeSession">): string {
    const klyuch = sessiya.archiveReason === null || sessiya.archiveReason === undefined
        ? 'opencode.sessions.archive.reason_unknown'
        : `opencode.sessions.archive.reason_${sessiya.archiveReason}`;

    return i18n.global.te(klyuch) ? i18n.global.t(klyuch) : klyuch;
}

/**
 * Проекты workspace-сессии.
 *
 * В сгенерированной схеме `workspace` объявлен как `Workspace & null`, что
 * сводится к `never`; приведение возвращает реальный тип поля.
 */
function proektySessii(sessiya: Schema<"OpenCodeSession">) {
    const workspace = sessiya.workspace as Schema<"Workspace"> | null | undefined;

    return workspace?.projects ?? [];
}

/**
 * Подтверждение архивации.
 *
 * Полного удаления на бэкенде нет, поэтому в диалоге честно написано, что
 * сессия и её история сохраняются, а недоступны станут только новые ходы.
 */
function podtverditArhivaciyu(sessiya: Schema<"OpenCodeSession">) {
    $q.dialog({
        title: i18n.global.t('opencode.sessions.archive.confirm_caption'),
        message: i18n.global.t('opencode.sessions.archive.confirm_message', { title: sessiya.title }),
        cancel: true,
        persistent: true,
    }).onOk(() => {
        storSpiska.arhivirovatSessiyu(sessiya.id);
    });
}

function otkrit(sessiya: Schema<"OpenCodeSession">) {
    // Тип передаётся в чат, чтобы он не делал probe-запрос состояния workspace.
    void router.push({
        name: "opencode_chat",
        params: {id: sessiya.id},
        query: {type: sessiya.type},
    });
}

/** Открыть диалог привязки юнитов, исключив уже привязанные. */
function privyazatUniti(sessiya: Schema<"OpenCodeSession">) {
    formaPrivyazki.otkrit(
        sessiya.id,
        (sessiya.units ?? []).map((unit) => unit.unitId),
    );
}

function pereytiVSessiyu(id: string) {
    // Форма создания создаёт обычную unit-сессию.
    void router.push({name: "opencode_chat", params: {id}, query: {type: "unit"}});
}

onMounted(() => {
    storRekvizitov.poluchitSpisok();
    storSpiska.poluchitSpisok();
});
</script>

<template>
  <q-card>
    <q-card-section class="bg-primary text-white row items-center">
      <div class="text-subtitle2 col">{{ $t('opencode.sessions.caption') }}</div>
      <OpenCodeRazdelToggle />
      <q-btn
          v-if="estArhivnie"
          dense
          flat
          :icon="pokazivatArhiv ? 'inventory_2' : 'archive'"
          :color="pokazivatArhiv ? 'amber' : 'white'"
          @click="pokazivatArhiv = !pokazivatArhiv"
      >
        <q-tooltip>
          {{ pokazivatArhiv ? $t('opencode.sessions.buttons.hide_archive') : $t('opencode.sessions.buttons.show_archive') }}
        </q-tooltip>
      </q-btn>
      <q-btn
          dense
          flat
          icon="add"
          color="white"
          :disable="loaderSpiska || netRekvizitov"
          @click="formaStore.otkrit()"
      >
        <q-tooltip>
          {{ netRekvizitov ? $t('opencode.sessions.no_credentials') : $t('opencode.sessions.buttons.add') }}
        </q-tooltip>
      </q-btn>
      <q-btn
          dense
          flat
          icon="refresh"
          color="white"
          :loading="loaderSpiska"
          @click="storSpiska.poluchitSpisok()"
      >
        <q-tooltip>{{ $t('opencode.sessions.buttons.refresh') }}</q-tooltip>
      </q-btn>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <div v-if="netRekvizitov" class="text-warning q-mb-sm">
        <i18n-t keypath="opencode.sessions.no_credentials_hint" tag="span">
          <template #link>
            <router-link
                :to="{name: 'account_settings'}"
                class="text-primary"
            >
              {{ $t('opencode.sessions.no_credentials_link') }}
            </router-link>
          </template>
        </i18n-t>
      </div>

      <div v-if="oshibkaRekvizitov" class="text-negative q-mb-sm">{{ oshibkaRekvizitov }}</div>
      <div v-if="oshibkaZagruzki" class="text-negative q-mb-sm">{{ oshibkaZagruzki }}</div>

      <div v-if="loaderSpiska && spisok.length === 0" class="row justify-center q-pa-md">
        <q-spinner color="primary" size="2em" />
      </div>

      <div v-else-if="otobrazhaemie.length === 0" class="text-grey-7">
        {{ pokazivatArhiv ? $t('opencode.sessions.empty') : $t('opencode.sessions.empty_active') }}
      </div>

      <q-list v-else separator>
        <q-item v-for="sessiya in otobrazhaemie" :key="sessiya.id" clickable @click="otkrit(sessiya)">
          <q-item-section>
            <q-item-label>
              {{ sessiya.title }}
              <q-badge v-if="sessiya.type === 'workspace'" color="secondary" class="q-ml-sm">
                {{ $t('opencode.workspace.list.badge') }}
              </q-badge>
              <q-badge v-if="sessiya.archived" color="grey-6" class="q-ml-sm">
                {{ $t('opencode.sessions.archive.badge') }}
                <q-tooltip>{{ $t('opencode.sessions.archive.badge_hint') }}</q-tooltip>
              </q-badge>
            </q-item-label>
            <q-item-label v-if="sessiya.archived" caption>
              {{ podpisPrichini(sessiya) }}
            </q-item-label>
            <q-item-label caption>
              {{ $t('opencode.sessions.fields.credential') }}: {{ imyaRekvizitov(sessiya) }}
            </q-item-label>
            <q-item-label v-if="sessiya.type === 'workspace'" caption>
              {{ $t('opencode.sessions.fields.projects') }}:
              <template v-if="proektySessii(sessiya).length > 0">
                <q-chip
                    v-for="project in proektySessii(sessiya)"
                    :key="'sessiya_project_' + sessiya.id + '_' + project.projectId"
                    dense
                    square
                    color="primary"
                    text-color="white"
                    icon="folder"
                    :label="project.projectName"
                />
              </template>
              <template v-else>{{ $t('opencode.sessions.fields.no_units') }}</template>
            </q-item-label>
            <q-item-label v-else caption>
              {{ $t('opencode.sessions.fields.units') }}:
              <template v-if="(sessiya.units ?? []).length > 0">
                <q-chip
                    v-for="unit in sessiya.units"
                    :key="'sessiya_unit_' + sessiya.id + '_' + unit.unitId"
                    dense
                    square
                    color="primary"
                    text-color="white"
                    icon="folder"
                    :label="nazvanieUnitaPoId(unit.unitId)"
                />
              </template>
              <template v-else>{{ $t('opencode.sessions.fields.no_units') }}</template>
            </q-item-label>
            <q-item-label caption>
              {{ $t('opencode.sessions.fields.created_at') }}: {{ convertDate(sessiya.createdAt) }}
              · {{ $t('opencode.sessions.fields.updated_at') }}: {{ convertDate(sessiya.updatedAt) }}
            </q-item-label>
          </q-item-section>

          <q-item-section side>
            <div class="row q-gutter-xs">
              <q-btn dense flat icon="forum" color="primary" @click.stop="otkrit(sessiya)">
                <q-tooltip>{{ $t('opencode.sessions.buttons.open') }}</q-tooltip>
              </q-btn>
              <q-btn
                  v-if="!sessiya.archived && sessiya.type !== 'workspace'"
                  dense
                  flat
                  icon="create_new_folder"
                  color="primary"
                  @click.stop="privyazatUniti(sessiya)"
              >
                <q-tooltip>{{ $t('opencode.sessions.buttons.attach_unit') }}</q-tooltip>
              </q-btn>
              <q-btn
                  v-if="!sessiya.archived && sessiya.type !== 'workspace'"
                  dense
                  flat
                  icon="archive"
                  color="warning"
                  :loading="arhiviruemiId === sessiya.id"
                  @click.stop="podtverditArhivaciyu(sessiya)"
              >
                <q-tooltip>{{ $t('opencode.sessions.buttons.archive') }}</q-tooltip>
              </q-btn>
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>

    <FormaSozdaniyaSessii @sozdana="pereytiVSessiyu" />
    <FormaPrivyazkiUnitaKSessii />
  </q-card>
</template>
