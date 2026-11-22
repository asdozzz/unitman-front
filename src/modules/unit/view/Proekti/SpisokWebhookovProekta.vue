<script setup lang="ts">
import {computed} from "vue";
import {useI18n} from "vue-i18n";
import {SpisokWebhookovProektaStore} from "@/modules/unit/store/SpisokProektov/SpisokWebhookovProektaStore";
import {storeToRefs} from "pinia";
import {useRoute, useRouter} from "vue-router";
import {onMounted} from "vue";
import {
  GhActionMenu,
  GhBanner,
  GhBox,
  GhButton,
  GhEmptyState,
  GhFormField,
  GhIcon,
  GhInput,
  GhLabel,
  GhSkeleton,
} from "@/components/ui";
import type {GhActionMenuItem} from "@/components/ui";

type Webhook = {
  id: string;
  url: string;
  isActive: boolean;
};

const storeWebhookov = SpisokWebhookovProektaStore();
const { spisok, loaderDobavleniya, loaderIzmeneniya, loaderSpiska, form, oshibkaZagruzkiSpiska } = storeToRefs(storeWebhookov);

const route = useRoute();
const router = useRouter();
const {t} = useI18n();

onMounted(async () => {
  storeWebhookov.pokazatSpisok(route.params.id as string)
  await storeWebhookov.poluchitSpisok();
})

function punktyMenu(webhook: Webhook): GhActionMenuItem[] {
  const punkty: GhActionMenuItem[] = [
    {id: "events", label: t('unit.proekt.webhooks.buttons.open_events'), icon: "link-external"},
  ];

  punkty.push(
      webhook.isActive
          ? {id: "disable", label: t('unit.proekt.webhooks.buttons.disable'), icon: "eye-closed"}
          : {id: "enable", label: t('unit.proekt.webhooks.buttons.enable'), icon: "eye"},
  );

  punkty.push({
    id: "delete",
    label: t('unit.proekt.webhooks.buttons.delete'),
    icon: "trash",
    danger: true,
    separatorBefore: true,
  });

  return punkty;
}

function vybratDeistvie(webhook: Webhook, item: GhActionMenuItem): void {
  switch (item.id) {
    case "events":
      void router.push({ name: 'webhook_events', params: { id: route.params.id, webhookId: webhook.id }});
      return;
    case "disable":
      storeWebhookov.otkluchit(webhook.id);
      return;
    case "enable":
      storeWebhookov.vkluchit(webhook.id);
      return;
    case "delete":
      storeWebhookov.udalit(webhook.id);
      return;
  }
}

const oshibkaZagruzki = computed<string | null>(() => oshibkaZagruzkiSpiska.value);
</script>

<template>
  <div class="webhooks">
    <form @submit.prevent="storeWebhookov.dobavit">
      <GhBox padding="md">
        <template #header>
          {{ $t('unit.proekt.webhooks.title') }}
        </template>

        <div class="webhooks__form">
          <GhFormField :label="$t('unit.proekt.webhooks.fields.url')">
            <GhInput v-model="form.url" clearable type="url" />
          </GhFormField>
        </div>

        <template #footer>
          <GhButton
              type="submit"
              variant="primary"
              icon="plus"
              :label="$t('unit.proekt.webhooks.buttons.add')"
              :loading="loaderDobavleniya"
              :disabled="!form.url"
          />
        </template>
      </GhBox>
    </form>

    <GhBanner
        v-if="oshibkaZagruzki"
        variant="danger"
        :title="$t('common.states.error')"
        class="webhooks__gap"
    >
      {{ oshibkaZagruzki }}
      <template #actions>
        <GhButton
            variant="default"
            icon="sync"
            :label="$t('common.buttons.retry')"
            @click="storeWebhookov.poluchitSpisok()"
        />
      </template>
    </GhBanner>

    <GhBox v-else-if="loaderSpiska" padding="md" aria-busy="true" class="webhooks__gap">
      <div class="webhooks__skeleton">
        <GhSkeleton variant="text" width="70%" height="12" />
        <GhSkeleton variant="text" width="55%" height="12" />
      </div>
    </GhBox>

    <GhBox v-else-if="spisok.length === 0" padding="none" class="webhooks__gap">
      <GhEmptyState icon="broadcast" :title="$t('unit.proekt.webhooks.empty')" />
    </GhBox>

    <GhBox v-else padding="none" class="webhooks__gap">
      <ul class="webhooks__list">
        <li v-for="webhook in spisok" :key="webhook.id" class="webhooks__item">
          <GhIcon name="broadcast" :size="14" class="webhooks__icon" />

          <button
              type="button"
              class="webhooks__url gh-mono"
              :title="webhook.url"
              @click="router.push({ name: 'webhook_events', params: { id: route.params.id, webhookId: webhook.id }})"
          >
            {{ webhook.url }}
          </button>

          <GhLabel
              :variant="webhook.isActive ? 'success' : 'neutral'"
              :icon="webhook.isActive ? 'check-circle' : 'x-circle'"
              :label="webhook.isActive ? $t('unit.proekt.webhooks.active') : $t('unit.proekt.webhooks.inactive')"
          />

          <GhActionMenu
              :items="punktyMenu(webhook)"
              :aria-label="$t('common.actions')"
              :disabled="loaderIzmeneniya"
              @select="vybratDeistvie(webhook, $event)"
          />
        </li>
      </ul>
    </GhBox>
  </div>
</template>

<style scoped>
.webhooks {
  max-width: 820px;
}

.webhooks__form {
  display: flex;
  align-items: flex-end;
  gap: 16px;
}

@media (max-width: 767.98px) {
  .webhooks__form {
    flex-direction: column;
    align-items: stretch;
  }
}

.webhooks__gap {
  margin-top: 16px;
}

.webhooks__skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.webhooks__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.webhooks__item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 12px 8px 16px;
  border-bottom: 1px solid var(--borderColor-muted);
}

.webhooks__item:last-child {
  border-bottom: none;
}

.webhooks__icon {
  color: var(--fgColor-muted);
}

.webhooks__url {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  border: none;
  background: none;
  color: var(--fgColor-accent);
  font-size: var(--fontSize-caption);
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.webhooks__url:hover {
  text-decoration: underline;
}

.webhooks__url:focus-visible {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: 2px;
}
</style>
