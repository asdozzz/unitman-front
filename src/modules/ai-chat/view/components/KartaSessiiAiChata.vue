<script setup lang="ts">
/**
 * Карточка сессии AI-чата для отдельного экрана списка.
 *
 * Показывает ровно одно серверное превью, метаданные провайдера/модели и
 * действия, разрешённые состоянием сессии: активную можно архивировать,
 * архивную — открыть или удалить.
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import dayjs from "dayjs";
import { GhButton, GhIcon, GhLabel } from "@/components/ui";
import type { AiChatSession } from "@/modules/ai-chat/model/types";

const props = defineProps<{
    session: AiChatSession;
}>();

const emit = defineEmits<{
    (e: "open"): void;
    (e: "archive"): void;
    (e: "delete"): void;
}>();

const { t } = useI18n();

const istekla = computed<boolean>(
    () => !props.session.archived && props.session.expiresAt * 1000 <= Date.now(),
);

const zagolovok = computed<string>(
    () => props.session.title.trim() || t("aiChat.sessions.untitled"),
);

const preview = computed<string>(
    () => props.session.preview.trim() || t("aiChat.sessions.preview_fallback"),
);

const obnovleno = computed<string>(
    () => dayjs.unix(props.session.updatedAt).format("DD.MM.YYYY HH:mm"),
);

const prichinaArhiva = computed<string>(() => {
    if (!props.session.archived) {
        return "";
    }

    const reason = props.session.archiveReason;

    if (reason === null) {
        return t("aiChat.sessions.archived_badge");
    }

    return t(`aiChat.sessions.archive_reason.${reason}`);
});
</script>

<template>
    <article class="session-card primer" :class="{ 'session-card--archived': session.archived }">
        <header class="session-card__header">
            <div class="session-card__title-row">
                <h3 class="session-card__title">{{ zagolovok }}</h3>

                <GhLabel
                    v-if="session.archived"
                    variant="neutral"
                    icon="archive"
                    :label="prichinaArhiva"
                />
                <GhLabel
                    v-else-if="istekla"
                    variant="attention"
                    icon="clock"
                    :label="t('aiChat.sessions.expired_badge')"
                />
                <GhLabel
                    v-if="session.credentialDeleted"
                    variant="danger"
                    icon="key"
                    :label="t('aiChat.sessions.credential_deleted_badge')"
                />
            </div>

            <p class="session-card__meta">
                <span>{{ session.provider }}</span>
                <span class="session-card__separator">/</span>
                <span>{{ session.model }}</span>
                <span class="session-card__separator">·</span>
                <span>{{ t("aiChat.sessions.updated_at", { date: obnovleno }) }}</span>
            </p>
        </header>

        <p class="session-card__preview">{{ preview }}</p>

        <footer class="session-card__footer">
            <span class="session-card__count">
                <GhIcon name="comment" :size="14" />
                {{ t("aiChat.sessions.messages_count", { count: session.messageCount }) }}
            </span>

            <div class="session-card__actions">
                <GhButton
                    size="sm"
                    icon="comment-discussion"
                    :label="t('aiChat.sessions.open')"
                    @click="emit('open')"
                />
                <GhButton
                    v-if="!session.archived"
                    size="sm"
                    icon="archive"
                    :label="t('aiChat.sessions.archive')"
                    @click="emit('archive')"
                />
                <GhButton
                    v-else
                    size="sm"
                    variant="danger"
                    icon="trash"
                    :label="t('aiChat.sessions.delete')"
                    @click="emit('delete')"
                />
            </div>
        </footer>
    </article>
</template>

<style scoped>
.session-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border: 1px solid var(--borderColor-default);
    border-radius: var(--borderRadius-medium);
    background-color: var(--bgColor-default);
    color: var(--fgColor-default);
    font-family: var(--fontStack-system);
}

.session-card--archived {
    background-color: var(--bgColor-muted);
}

.session-card__header {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.session-card__title-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
}

.session-card__title {
    margin: 0;
    font-size: var(--fontSize-title);
    font-weight: var(--fontWeight-semibold);
    line-height: var(--lineHeight-tight);
}

.session-card__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin: 0;
    color: var(--fgColor-muted);
    font-size: var(--fontSize-caption);
}

.session-card__separator {
    color: var(--fgColor-muted);
}

.session-card__preview {
    display: -webkit-box;
    margin: 0;
    overflow: hidden;
    color: var(--fgColor-default);
    font-size: var(--fontSize-body);
    line-height: var(--lineHeight-normal);
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
}

.session-card__footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.session-card__count {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--fgColor-muted);
    font-size: var(--fontSize-caption);
}

.session-card__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}
</style>
