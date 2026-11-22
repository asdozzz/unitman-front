<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import {
    GhBanner,
    GhBox,
    GhButton,
    GhEmptyState,
    GhLabel,
    GhSkeleton,
} from "@/components/ui";
import { useStorSpiskaSessiyUnita } from "@/modules/opencode/store/StorSpiskaSessiyUnita";
import type { UnitSession } from "@/modules/opencode/model/UnitSession";

/**
 * Список unit-сессий.
 *
 * Workspace живёт на отдельном маршруте и в этот список не попадает.
 * Создание сессии выполняется из карточки юнита: у юнита одна активная сессия.
 */
const router = useRouter();
const storSpiska = useStorSpiskaSessiyUnita();
const { spisok, loaderSpiska, oshibkaZagruzki, arhiviruemiId, estArhivnie, nazvanieUnitaPoId } = storeToRefs(storSpiska);

const pokazivatArhiv = ref(false);

const otobrazhaemie = computed<UnitSession[]>(() => {
    return pokazivatArhiv.value
        ? spisok.value
        : spisok.value.filter((session) => !session.archived);
});

function otkrit(session: UnitSession) {
    void router.push({
        name: "opencode_unit_session_chat",
        params: { id: session.id },
    });
}

function arhivaciyaIdet(session: UnitSession): boolean {
    return arhiviruemiId.value === session.id;
}

function podpisUnita(session: UnitSession): string {
    return nazvanieUnitaPoId.value(session.unitId);
}

onMounted(() => {
    void storSpiska.poluchitSpisok();
});
</script>

<template>
  <GhBox class="unit-sessions-list primer" padding="none">
    <template #header>
      <span class="unit-sessions-list__title">{{ $t('opencode.unit_sessions.caption') }}</span>
      <span class="unit-sessions-list__spacer" />

      <GhButton
          v-if="estArhivnie"
          size="sm"
          :icon="pokazivatArhiv ? 'eye-closed' : 'eye'"
          :aria-label="pokazivatArhiv ? $t('opencode.unit_sessions.buttons.hide_archive') : $t('opencode.unit_sessions.buttons.show_archive')"
          :title="pokazivatArhiv ? $t('opencode.unit_sessions.buttons.hide_archive') : $t('opencode.unit_sessions.buttons.show_archive')"
          @click="pokazivatArhiv = !pokazivatArhiv"
      />

      <GhButton
          size="sm"
          icon="sync"
          :aria-label="$t('opencode.unit_sessions.buttons.refresh')"
          :title="$t('opencode.unit_sessions.buttons.refresh')"
          :loading="loaderSpiska"
          @click="storSpiska.poluchitSpisok()"
      />
    </template>

    <div class="unit-sessions-list__body">
      <GhBanner v-if="oshibkaZagruzki" variant="danger">
        {{ oshibkaZagruzki }}
      </GhBanner>

      <template v-if="loaderSpiska && spisok.length === 0">
        <GhSkeleton v-for="n in 4" :key="'unit-session-skeleton-' + n" height="56px" />
      </template>

      <GhEmptyState
          v-else-if="otobrazhaemie.length === 0"
          icon="comment-discussion"
          :title="$t('opencode.unit_sessions.empty.title')"
          :description="$t('opencode.unit_sessions.empty.description')"
      />

      <ul v-else class="unit-sessions-list__items">
        <li
            v-for="session in otobrazhaemie"
            :key="session.id"
            class="unit-sessions-list__item"
        >
          <button
              type="button"
              class="unit-sessions-list__main"
              @click="otkrit(session)"
          >
            <span class="unit-sessions-list__name">{{ session.title || session.id }}</span>
            <span class="unit-sessions-list__meta">
              {{ podpisUnita(session) }}
            </span>
          </button>

          <div class="unit-sessions-list__actions">
            <GhLabel v-if="session.archived" variant="neutral">
              {{ $t('opencode.unit_sessions.badges.archived') }}
            </GhLabel>

            <GhButton
                v-if="!session.archived"
                size="sm"
                variant="invisible"
                icon="archive"
                :label="$t('opencode.unit_sessions.buttons.archive')"
                :loading="arhivaciyaIdet(session)"
                @click="storSpiska.arhivirovat(session.id)"
            />
          </div>
        </li>
      </ul>
    </div>
  </GhBox>
</template>

<style scoped>
.unit-sessions-list__title {
  font-weight: 600;
}

.unit-sessions-list__spacer {
  flex: 1 1 auto;
}

.unit-sessions-list__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px 16px;
}

.unit-sessions-list__items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.unit-sessions-list__item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 4px 8px;
  border: 1px solid var(--borderColor-muted);
  border-radius: var(--borderRadius-medium);
}

.unit-sessions-list__item:hover {
  background-color: var(--bgColor-neutral-muted);
}

.unit-sessions-list__main {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 4px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.unit-sessions-list__name {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unit-sessions-list__meta {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.unit-sessions-list__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
