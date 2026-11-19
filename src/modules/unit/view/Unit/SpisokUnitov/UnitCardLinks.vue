<script setup lang="ts">
import {Notify, copyToClipboard} from "quasar";
import {useI18n} from "vue-i18n";
import type {Link} from "@/modules/unit/store/SpisokUnitov/model/Unit";

defineProps<{
  links: Link[];
  canOpen: boolean;
}>();

const {t} = useI18n();

/** Копирует полный URL в буфер обмена, не открывая ссылку. */
async function skopirovat(link: Link) {
  await copyToClipboard(link.path);

  Notify.create({
    message: t('unit.spisok_unitov.card.messages.link_copied'),
    color: 'positive',
    timeout: 1200,
  });
}
</script>

<template>
  <div v-if="links.length > 0" class="unit-links">
    <div class="unit-card__section-title">{{ $t('unit.spisok_unitov.card.fields.links') }}</div>

    <div v-if="!canOpen" class="unit-links__hint text-caption-muted">
      <q-icon name="lock" size="12px" />
      {{ $t('unit.spisok_unitov.card.hints.links_stopped') }}
    </div>

    <div
        v-for="link in links"
        :key="link.path"
        class="unit-links__row"
    >
      <a
          v-if="canOpen"
          :href="link.path"
          class="unit-links__url text-mono"
          :title="link.path"
          target="_blank"
          rel="noopener noreferrer"
      >
        {{ link.path }}
      </a>
      <span
          v-else
          class="unit-links__url unit-links__url--disabled text-mono"
          :title="link.path"
      >
        {{ link.path }}
      </span>

      <q-btn
          v-if="canOpen"
          flat
          dense
          round
          size="sm"
          icon="open_in_new"
          tag="a"
          :href="link.path"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="$t('unit.spisok_unitov.card.buttons.open_link')"
      >
        <q-tooltip>{{ $t('unit.spisok_unitov.card.buttons.open_link') }}</q-tooltip>
      </q-btn>

      <q-btn
          flat
          dense
          round
          size="sm"
          icon="content_copy"
          :aria-label="$t('unit.spisok_unitov.card.buttons.copy_link')"
          @click="skopirovat(link)"
      >
        <q-tooltip>{{ $t('unit.spisok_unitov.card.buttons.copy_link') }}</q-tooltip>
      </q-btn>
    </div>
  </div>
</template>

<style scoped>
.unit-links {
  display: flex;
  flex-direction: column;
  gap: var(--app-space-1);
  min-width: 0;
}

.unit-links__hint {
  display: flex;
  align-items: center;
  gap: var(--app-space-1);
}

.unit-links__row {
  display: flex;
  align-items: center;
  gap: var(--app-space-1);
  min-width: 0;
}

.unit-links__url {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  color: var(--app-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
  text-decoration: none;
}

.unit-links__url:hover {
  text-decoration: underline;
}

.unit-links__url--disabled {
  color: var(--app-text-disabled);
  cursor: default;
}

.unit-links__url--disabled:hover {
  text-decoration: none;
}
</style>
