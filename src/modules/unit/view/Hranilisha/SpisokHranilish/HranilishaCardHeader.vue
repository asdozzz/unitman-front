<script setup lang="ts">
import {computed} from "vue";
import {GhIcon} from "@/components/ui";
import type {Hranilishe} from "@/modules/unit/store/SpisokHranilish/model/Hranilishe";
import HranilishaStatusBadge from "@/modules/unit/view/Hranilisha/SpisokHranilish/HranilishaStatusBadge.vue";

const props = defineProps<{
  item: Hranilishe;
}>();

/**
 * Показываем URL, если адаптер его сохранил. Для GitHub/Bitbucket/Codeberg
 * это базовый адрес хостинга, для GitLab/Gitea/Forgejo/GitFlic/GitVerse —
 * адрес конкретной установки.
 */
const pokazatUrl = computed<boolean>(() => {
  return props.item.repoUrl !== "";
});
</script>

<template>
  <!-- Шапка карточки: имя и единственный бейдж подтверждения на одной строке.
       Кебаб рендерит HranilishaCard.vue через слот actions, чтобы у карточки
       оставалось ровно одно меню. -->
  <div class="hranilisha-card__head">
    <div class="hranilisha-card__head-main">
      <GhIcon name="database" :size="16" class="hranilisha-card__head-icon" />
      <h3 class="hranilisha-card__name" :title="item.name">
        {{ item.name }}
        <q-tooltip>{{ item.name }}</q-tooltip>
      </h3>
      <HranilishaStatusBadge :confirmed="item.confirmed" />
    </div>

    <div class="hranilisha-card__head-actions">
      <slot name="actions" />
    </div>
  </div>

  <div class="hranilisha-card__meta">
    <span class="hranilisha-card__meta-item">
      <GhIcon name="repo" :size="14" />
      <span class="hranilisha-card__meta-text" :title="item.type">{{ item.type }}</span>
    </span>

    <template v-if="pokazatUrl">
      <span class="hranilisha-card__separator">·</span>

      <span class="hranilisha-card__meta-item">
        <GhIcon name="link" :size="14" />
        <a
            class="hranilisha-card__meta-text hranilisha-card__url"
            :href="item.repoUrl"
            target="_blank"
            rel="noopener noreferrer"
            :title="item.repoUrl"
        >{{ item.repoUrl }}</a>
      </span>
    </template>
  </div>
</template>

<style scoped>
.hranilisha-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 8px 16px;
  border-bottom: 1px solid var(--borderColor-default);
  background: var(--bgColor-muted);
}

.hranilisha-card__head-icon {
  color: var(--fgColor-muted);
}

.hranilisha-card__head-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
}

.hranilisha-card__name {
  margin: 0;
  overflow: hidden;
  color: var(--fgColor-default);
  font-size: var(--fontSize-body);
  font-weight: var(--fontWeight-semibold);
  line-height: var(--lineHeight-tight);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hranilisha-card__head-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
}

/* Мета-строка живёт под шапкой и получает собственные отступы карточки. */
.hranilisha-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  row-gap: 2px;
  min-width: 0;
  padding: 8px 16px 0;
  color: var(--fgColor-muted);
  font-size: var(--fontSize-caption);
  line-height: var(--lineHeight-tight);
}

.hranilisha-card__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.hranilisha-card__meta-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hranilisha-card__url {
  color: var(--fgColor-accent);
  font-family: var(--fontStack-monospace);
  font-size: 0.9em;
  text-decoration: none;
}

.hranilisha-card__url:hover {
  text-decoration: underline;
}

.hranilisha-card__separator {
  opacity: 0.6;
}
</style>
