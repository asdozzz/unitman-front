<script setup lang="ts">
import {computed} from "vue";
import {RouterLink, useRoute} from "vue-router";
import {SobitiyaWebhookaStore} from "@/modules/unit/store/SpisokProektov/SobitiyaWebhookaStore";
import {storeToRefs} from "pinia";
import {onMounted} from "vue";
import {convertDateTime} from "@/utils/dates";
import {
  GhBox,
  GhButton,
  GhEmptyState,
  GhFormField,
  GhIcon,
  GhInput,
  GhSkeleton,
} from "@/components/ui";

const storeWebhookov = SobitiyaWebhookaStore();
const { form, loaderIzmeneniya, sobitiya } = storeToRefs(storeWebhookov);

const route = useRoute();

onMounted(async () => {
  storeWebhookov.initStore(route.params.webhookId as string)
})

function changePage(newPage: number) {
  storeWebhookov.newPage(newPage);
}

const estPredidushaya = computed<boolean>(() => sobitiya.value.pagination.page > 1);
const estSleduyushaya = computed<boolean>(
    () => sobitiya.value.pagination.page < sobitiya.value.pagination.totalPages,
);

function predidushayaStranitsa(): void {
  if (estPredidushaya.value) {
    changePage(sobitiya.value.pagination.page - 1);
  }
}

function sleduyushayaStranitsa(): void {
  if (estSleduyushaya.value) {
    changePage(sobitiya.value.pagination.page + 1);
  }
}
</script>

<template>
  <div class="webhook-events">
    <nav class="webhook-events__breadcrumbs">
      <RouterLink to="/" class="webhook-events__crumb">{{ $t('app.tabs.home') }}</RouterLink>
      <GhIcon name="chevron-right" :size="12" />
      <RouterLink :to="{name: 'project_list'}" class="webhook-events__crumb">
        {{ $t('unit.proekt.page.back_to_projects') }}
      </RouterLink>
      <GhIcon name="chevron-right" :size="12" />
      <RouterLink :to="`/unit/projects/${route.params.id}/home`" class="webhook-events__crumb">
        {{ route.params.id }}
      </RouterLink>
      <GhIcon name="chevron-right" :size="12" />
      <RouterLink :to="`/unit/projects/${route.params.id}/webhooks`" class="webhook-events__crumb">
        {{ $t('unit.proekt.tabs.webhooks') }}
      </RouterLink>
      <GhIcon name="chevron-right" :size="12" />
      <span class="webhook-events__crumb webhook-events__crumb--current">{{ route.params.webhookId }}</span>
    </nav>

    <form v-if="form.id" @submit.prevent="storeWebhookov.obnovit">
      <GhBox padding="md" class="webhook-events__gap">
        <template #header>
          {{ $t('unit.proekt.webhooks.title') }}
        </template>

        <div class="webhook-events__form">
          <GhFormField :label="$t('unit.proekt.webhooks.fields.url')">
            <GhInput v-model="form.newUrl" clearable type="url" />
          </GhFormField>
        </div>

        <template #footer>
          <GhButton
              type="submit"
              variant="primary"
              icon="check"
              :label="$t('common.buttons.save')"
              :loading="loaderIzmeneniya"
          />
        </template>
      </GhBox>
    </form>

    <div class="webhook-events__layout">
      <GhBox padding="none" class="webhook-events__list-box">
        <template #header>
          {{ $t('unit.proekt.webhook_events.title') }}
        </template>

        <div v-if="sobitiya.loaderSpiska" class="webhook-events__skeleton" aria-busy="true">
          <GhSkeleton variant="text" width="80%" height="28" />
          <GhSkeleton variant="text" width="70%" height="28" />
          <GhSkeleton variant="text" width="60%" height="28" />
        </div>

        <GhEmptyState
            v-else-if="sobitiya.spisok.length === 0"
            icon="broadcast"
            :title="$t('unit.proekt.webhook_events.empty')"
        />

        <template v-else>
          <ul class="webhook-events__list">
            <li v-for="item in sobitiya.spisok" :key="item.id">
              <button
                  type="button"
                  class="webhook-events__event"
                  :class="{'webhook-events__event--active': item.id === sobitiya.select?.id}"
                  :aria-pressed="item.id === sobitiya.select?.id ? 'true' : 'false'"
                  @click="storeWebhookov.select(item)"
              >
                <span class="webhook-events__event-type">{{ item.type }}</span>
                <span class="webhook-events__event-time gh-mono">{{ convertDateTime(item.unixtime) }}</span>
              </button>
            </li>
          </ul>

          <div v-if="sobitiya.pagination.totalPages > 1" class="webhook-events__pagination">
            <GhButton
                variant="default"
                size="sm"
                icon="chevron-left"
                :aria-label="$t('common.buttons.back')"
                :disabled="!estPredidushaya"
                @click="predidushayaStranitsa"
            />
            <span class="webhook-events__page gh-mono">
              {{ $t('unit.proekt.webhook_events.page', {
                page: sobitiya.pagination.page,
                total: sobitiya.pagination.totalPages,
              }) }}
            </span>
            <GhButton
                variant="default"
                size="sm"
                icon="chevron-right"
                :aria-label="$t('common.buttons.open')"
                :disabled="!estSleduyushaya"
                @click="sleduyushayaStranitsa"
            />
          </div>
        </template>
      </GhBox>

      <div v-if="sobitiya.select" class="webhook-events__details">
        <GhBox padding="md">
          <template #header>
            {{ $t('unit.proekt.webhook_events.payload') }}
          </template>
          <pre class="webhook-events__code gh-mono">{{ sobitiya.select.payload }}</pre>
        </GhBox>

        <GhBox padding="md">
          <template #header>
            {{ $t('unit.proekt.webhook_events.response') }}
          </template>
          <p v-if="!sobitiya.select.sent" class="webhook-events__not-sent">
            {{ $t('unit.proekt.webhook_events.not_sent') }}
          </p>
          <pre v-else class="webhook-events__code gh-mono">{{ sobitiya.select.response }}</pre>
        </GhBox>
      </div>
    </div>
  </div>
</template>

<style scoped>
.webhook-events {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.webhook-events__breadcrumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
}

.webhook-events__crumb {
  overflow: hidden;
  color: var(--fgColor-accent);
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.webhook-events__crumb:hover {
  text-decoration: underline;
}

.webhook-events__crumb--current {
  color: var(--fgColor-muted);
}

.webhook-events__form {
  display: flex;
  align-items: flex-end;
  gap: 16px;
}

@media (max-width: 767.98px) {
  .webhook-events__form {
    flex-direction: column;
    align-items: stretch;
  }
}

.webhook-events__layout {
  display: grid;
  grid-template-columns: minmax(220px, 320px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

@media (max-width: 767.98px) {
  .webhook-events__layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

.webhook-events__skeleton {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 16px;
}

.webhook-events__list {
  margin: 0;
  padding: 4px;
  list-style: none;
}

.webhook-events__event {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 32px;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: var(--borderRadius-medium);
  background: transparent;
  color: var(--fgColor-default);
  font-family: var(--fontStack-system);
  font-size: var(--fontSize-body);
  text-align: left;
  cursor: pointer;
}

.webhook-events__event:hover {
  background: var(--bgColor-neutral-muted);
}

.webhook-events__event--active {
  background: var(--bgColor-accent-muted);
  color: var(--fgColor-accent);
  font-weight: var(--fontWeight-semibold);
}

.webhook-events__event:focus-visible {
  outline: 2px solid var(--focus-outlineColor);
  outline-offset: 2px;
}

.webhook-events__event-type {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.webhook-events__event-time {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  white-space: nowrap;
}

.webhook-events__pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid var(--borderColor-default);
}

.webhook-events__page {
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  white-space: nowrap;
}

.webhook-events__details {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.webhook-events__code {
  margin: 0;
  max-height: 420px;
  overflow: auto;
  color: var(--fgColor-default);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-normal);
  white-space: pre-wrap;
  word-break: break-word;
}

.webhook-events__not-sent {
  margin: 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-body);
}
</style>
