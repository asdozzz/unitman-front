<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import i18n from "@/bootstrap/translator";
import {
    GhBanner,
    GhBox,
    GhButton,
    GhDialog,
    GhEmptyState,
    GhLabel,
    GhSkeleton,
} from "@/components/ui";
import { useStorSpiskaSessiyOpenCode } from "@/modules/opencode/store/StorSpiskaSessiyOpenCode";
import { useStorSpiskaRekvizitovOpenCode } from "@/modules/account/store/SpisokRekvizitovOpenCode/StorSpiskaRekvizitovOpenCode";
import { useStorFormiSozdaniyaSessii } from "@/modules/opencode/store/StorFormiSozdaniyaSessii";
import { useStorFormiPrivyazkiUnitaKSessii } from "@/modules/opencode/store/StorFormiPrivyazkiUnitaKSessii";
import FormaSozdaniyaSessii from "@/modules/opencode/view/FormaSozdaniyaSessii.vue";
import FormaPrivyazkiUnitaKSessii from "@/modules/opencode/view/FormaPrivyazkiUnitaKSessii.vue";
import { convertDate } from "@/utils/dates";
import { ozhidaetsyaVtorayaKlavishaPosledovatelnosti } from "@/utils/useHotkeys";
import type { Schema } from "@/api/types";

/**
 * Список сессий OpenCode.
 *
 * Архивные сессии скрыты по умолчанию и показываются переключателем. Создание
 * требует реквизитов, поэтому кнопка блокируется заранее, а не после отказа
 * бэкенда.
 */
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

/** Сессия, для которой открыто подтверждение архивации. */
const sessiyaDlyaArhivacii = ref<Schema<"OpenCodeSession"> | null>(null);

/** Архивация выбранной сессии выполняется прямо сейчас. */
const arhivaciyaIdet = computed(() => {
    const id = sessiyaDlyaArhivacii.value?.id;

    return id !== undefined && arhiviruemiId.value === id;
});

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
    sessiyaDlyaArhivacii.value = sessiya;
}

/** Закрыть диалог без архивации. */
function zakritArhivaciyu(value: boolean) {
    if (!value) {
        sessiyaDlyaArhivacii.value = null;
    }
}

/** Подтверждённая архивация выбранной сессии. */
function arhivirovatSessiyu() {
    const sessiya = sessiyaDlyaArhivacii.value;

    if (sessiya === null) {
        return;
    }

    void storSpiska.arhivirovatSessiyu(sessiya.id);
    sessiyaDlyaArhivacii.value = null;
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

/** Селекторы, внутри которых страничные хоткеи не перехватываются. */
function ignorirovatVvod(event: KeyboardEvent): boolean {
    const cel = event.target;

    if (!(cel instanceof HTMLElement)) {
        return false;
    }

    if (cel.isContentEditable) {
        return true;
    }

    return cel.closest(
        'input, textarea, select, [contenteditable], [role="textbox"], [role="dialog"], .q-dialog, .q-menu',
    ) !== null;
}

/** Хоткеи страницы: `R` — обновить, `c` — создать. */
function obrabotatKlavishu(event: KeyboardEvent): void {
    if (
        event.defaultPrevented
        || event.isComposing
        || event.ctrlKey
        || event.metaKey
        || event.altKey
        || ozhidaetsyaVtorayaKlavishaPosledovatelnosti()
        || ignorirovatVvod(event)
    ) {
        return;
    }

    if (event.key === "R") {
        event.preventDefault();
        storSpiska.poluchitSpisok();

        return;
    }

    if (event.key === "c" && !netRekvizitov.value && !loaderSpiska.value) {
        event.preventDefault();
        formaStore.otkrit();
    }
}

onMounted(() => {
    storRekvizitov.poluchitSpisok();
    storSpiska.poluchitSpisok();
    window.addEventListener("keydown", obrabotatKlavishu);
});

onUnmounted(() => {
    window.removeEventListener("keydown", obrabotatKlavishu);
});
</script>

<template>
  <GhBox class="opencode-list primer" padding="none">
    <template #header>
      <span class="opencode-list__title">{{ $t('opencode.sessions.caption') }}</span>
      <span class="opencode-list__spacer" />

      <GhButton
          v-if="estArhivnie"
          size="sm"
          :icon="pokazivatArhiv ? 'eye-closed' : 'eye'"
          :aria-label="pokazivatArhiv ? $t('opencode.sessions.buttons.hide_archive') : $t('opencode.sessions.buttons.show_archive')"
          :title="pokazivatArhiv ? $t('opencode.sessions.buttons.hide_archive') : $t('opencode.sessions.buttons.show_archive')"
          @click="pokazivatArhiv = !pokazivatArhiv"
      />

      <GhButton
          variant="primary"
          size="sm"
          icon="plus"
          :label="$t('opencode.sessions.buttons.add')"
          :disabled="loaderSpiska || netRekvizitov"
          @click="formaStore.otkrit()"
      />

      <GhButton
          size="sm"
          icon="sync"
          :aria-label="$t('opencode.sessions.buttons.refresh')"
          :title="$t('opencode.sessions.buttons.refresh')"
          :loading="loaderSpiska"
          @click="storSpiska.poluchitSpisok()"
      />
    </template>

    <div class="opencode-list__body">
      <GhBanner v-if="netRekvizitov" variant="attention" class="opencode-list__banner">
        <i18n-t keypath="opencode.sessions.no_credentials_hint" tag="span">
          <template #link>
            <router-link :to="{name: 'account_settings'}" class="opencode-list__link">
              {{ $t('opencode.sessions.no_credentials_link') }}
            </router-link>
          </template>
        </i18n-t>
      </GhBanner>

      <GhBanner v-if="oshibkaRekvizitov" variant="danger" class="opencode-list__banner">
        {{ oshibkaRekvizitov }}
        <template #actions>
          <GhButton size="sm" :label="$t('common.buttons.retry')" @click="storRekvizitov.poluchitSpisok()" />
        </template>
      </GhBanner>

      <GhBanner v-if="oshibkaZagruzki" variant="danger" class="opencode-list__banner">
        {{ oshibkaZagruzki }}
        <template #actions>
          <GhButton size="sm" :label="$t('common.buttons.retry')" @click="storSpiska.poluchitSpisok()" />
        </template>
      </GhBanner>

      <div v-if="loaderSpiska && spisok.length === 0" class="opencode-list__skeletons">
        <GhSkeleton v-for="n in 4" :key="'session-skeleton-' + n" height="76px" />
      </div>

      <GhEmptyState
          v-else-if="otobrazhaemie.length === 0"
          icon="comment-discussion"
          :title="pokazivatArhiv ? $t('opencode.sessions.empty') : $t('opencode.sessions.empty_active')"
      >
        <template #actions>
          <GhButton
              v-if="!pokazivatArhiv"
              variant="primary"
              icon="plus"
              :label="$t('opencode.sessions.buttons.add')"
              :disabled="netRekvizitov"
              @click="formaStore.otkrit()"
          />
          <GhButton
              v-else
              :label="$t('opencode.sessions.buttons.hide_archive')"
              @click="pokazivatArhiv = false"
          />
        </template>
      </GhEmptyState>

      <div v-else class="opencode-sessions">
        <div
            v-for="sessiya in otobrazhaemie"
            :key="sessiya.id"
            class="opencode-session"
            role="button"
            tabindex="0"
            @click="otkrit(sessiya)"
            @keydown.enter.prevent="otkrit(sessiya)"
        >
          <div class="opencode-session__main">
            <div class="opencode-session__title-row">
              <span class="opencode-session__title" :title="sessiya.title">
                {{ sessiya.title }}
                <q-tooltip>{{ sessiya.title }}</q-tooltip>
              </span>

              <GhLabel
                  v-if="sessiya.type === 'workspace'"
                  variant="accent"
                  icon="rows"
                  :label="$t('opencode.workspace.list.badge')"
              />

              <GhLabel
                  v-if="sessiya.archived"
                  variant="neutral"
                  icon="archive"
                  :label="$t('opencode.sessions.archive.badge')"
                  :title="$t('opencode.sessions.archive.badge_hint')"
              />
            </div>

            <p v-if="sessiya.archived" class="opencode-session__muted">
              {{ podpisPrichini(sessiya) }}
            </p>

            <div class="opencode-session__meta">
              <span>
                {{ $t('opencode.sessions.fields.credential') }}:
                <span class="gh-mono">{{ imyaRekvizitov(sessiya) }}</span>
              </span>

              <span v-if="sessiya.type === 'workspace'" class="opencode-session__chips">
                {{ $t('opencode.sessions.fields.projects') }}:
                <template v-if="proektySessii(sessiya).length > 0">
                  <GhLabel
                      v-for="project in proektySessii(sessiya)"
                      :key="'sessiya_project_' + sessiya.id + '_' + project.projectId"
                      variant="neutral"
                      icon="project"
                      :label="project.projectName"
                      :title="project.projectName"
                  />
                </template>
                <template v-else>{{ $t('opencode.sessions.fields.no_units') }}</template>
              </span>

              <span v-else class="opencode-session__chips">
                {{ $t('opencode.sessions.fields.units') }}:
                <template v-if="(sessiya.units ?? []).length > 0">
                  <GhLabel
                      v-for="unit in sessiya.units"
                      :key="'sessiya_unit_' + sessiya.id + '_' + unit.unitId"
                      variant="neutral"
                      icon="project"
                      :label="nazvanieUnitaPoId(unit.unitId)"
                      :title="nazvanieUnitaPoId(unit.unitId)"
                  />
                </template>
                <template v-else>{{ $t('opencode.sessions.fields.no_units') }}</template>
              </span>

              <span class="opencode-session__dates">
                {{ $t('opencode.sessions.fields.created_at') }}: <span class="gh-mono">{{ convertDate(sessiya.createdAt) }}</span>
                · {{ $t('opencode.sessions.fields.updated_at') }}: <span class="gh-mono">{{ convertDate(sessiya.updatedAt) }}</span>
              </span>
            </div>
          </div>

          <div class="opencode-session__actions" @click.stop>
            <GhButton
                variant="invisible"
                size="sm"
                icon="comment-discussion"
                :aria-label="$t('opencode.sessions.buttons.open')"
                :title="$t('opencode.sessions.buttons.open')"
                @click.stop="otkrit(sessiya)"
            />
            <GhButton
                v-if="!sessiya.archived && sessiya.type !== 'workspace'"
                variant="invisible"
                size="sm"
                icon="link"
                :aria-label="$t('opencode.sessions.buttons.attach_unit')"
                :title="$t('opencode.sessions.buttons.attach_unit')"
                @click.stop="privyazatUniti(sessiya)"
            />
            <GhButton
                v-if="!sessiya.archived && sessiya.type !== 'workspace'"
                variant="invisible"
                size="sm"
                icon="archive"
                :aria-label="$t('opencode.sessions.buttons.archive')"
                :title="$t('opencode.sessions.buttons.archive')"
                :loading="arhiviruemiId === sessiya.id"
                @click.stop="podtverditArhivaciyu(sessiya)"
            />
          </div>
        </div>
      </div>
    </div>

    <FormaSozdaniyaSessii @sozdana="pereytiVSessiyu" />
    <FormaPrivyazkiUnitaKSessii />

    <GhDialog
        :model-value="sessiyaDlyaArhivacii !== null"
        :title="$t('opencode.sessions.archive.confirm_caption')"
        :close-label="$t('common.buttons.close')"
        persistent
        @update:model-value="zakritArhivaciyu"
    >
      <p class="opencode-list__dialog-text">
        {{ $t('opencode.sessions.archive.confirm_message', { title: sessiyaDlyaArhivacii?.title ?? '' }) }}
      </p>

      <template #footer>
        <GhButton
            variant="default"
            :label="$t('common.buttons.cancel')"
            @click="zakritArhivaciyu(false)"
        />
        <GhButton
            variant="primary"
            icon="archive"
            :label="$t('opencode.sessions.archive.ok')"
            :loading="arhivaciyaIdet"
            @click="arhivirovatSessiyu"
        />
      </template>
    </GhDialog>
  </GhBox>
</template>

<style scoped>
.opencode-list__title {
  color: var(--fgColor-default);
  font-size: var(--fontSize-title);
  font-weight: var(--fontWeight-semibold);
}

.opencode-list__spacer {
  flex: 1 1 auto;
}

.opencode-list__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.opencode-list__banner {
  margin: 0;
}

.opencode-list__dialog-text {
  margin: 0;
}

.opencode-list__link {
  color: var(--fgColor-accent);
}

.opencode-list__link:hover {
  text-decoration: underline;
}

.opencode-list__skeletons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.opencode-sessions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.opencode-session {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--borderColor-default);
  border-radius: var(--borderRadius-medium);
  background-color: var(--bgColor-default);
  cursor: pointer;
  transition: background-color 80ms ease-out;
}

.opencode-session:hover {
  background-color: var(--bgColor-muted);
}

.opencode-session:focus-visible {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: 2px;
}

.opencode-session__main {
  min-width: 0;
  flex: 1 1 auto;
}

.opencode-session__title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.opencode-session__title {
  min-width: 0;
  overflow: hidden;
  color: var(--fgColor-default);
  font-size: var(--fontSize-body);
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.opencode-session__muted {
  margin: 4px 0 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.opencode-session__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 4px;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.opencode-session__chips {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.opencode-session__dates {
  white-space: normal;
  word-break: break-word;
}

.opencode-session__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 2px;
}

@media (max-width: 480px) {
  .opencode-list__body {
    padding: 12px;
  }

  .opencode-session {
    flex-direction: column;
  }

  .opencode-session__actions {
    align-self: flex-end;
  }
}
</style>
