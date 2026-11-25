<script setup lang="ts">
/**
 * Отдельный экран списка сессий AI-чата.
 *
 * Источник истины — серверный список: пустые сессии скрыты, превью ровно
 * одно на карточку, пагинация и поиск выполняются на бэкенде. Активную
 * сессию можно архивировать, архивную — открыть или удалить.
 */
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import {
    GhBanner,
    GhButton,
    GhDialog,
    GhEmptyState,
    GhInput,
    GhPageHeader,
} from "@/components/ui";
import { useStorSessiyAiChata } from "@/modules/ai-chat/store/StorSessiyAiChata";
import type {
    AiChatServiceResult,
    AiChatSession,
} from "@/modules/ai-chat/model/types";
import KartaSessiiAiChata from "@/modules/ai-chat/view/components/KartaSessiiAiChata.vue";

const { t } = useI18n();
const router = useRouter();
const store = useStorSessiyAiChata();

const {
    items,
    total,
    limit,
    offset,
    hasMore,
    loaderSpiska,
    oshibkaSpiska,
    udalyayemiId,
} = storeToRefs(store);

const poisk = ref<string>("");
const includeArchived = ref<boolean>(false);
const oshibkaDeystviya = ref<string | null>(null);
const kUdaleniyu = ref<AiChatSession | null>(null);

const pokazatUdalenie = computed<boolean>({
    get: () => kUdaleniyu.value !== null,
    set: (value: boolean) => {
        if (!value) {
            kUdaleniyu.value = null;
        }
    },
});

const pervayaStranica = computed<number>(() => (total.value === 0 ? 0 : offset.value + 1));
const poslednyayaStranica = computed<number>(
    () => Math.min(offset.value + limit.value, total.value),
);

const pustSpisok = computed<boolean>(
    () => !loaderSpiska.value && items.value.length === 0,
);

onMounted(() => {
    store.sbrositSpisok();
    poisk.value = "";
    includeArchived.value = false;
    void store.zagruzitSpisok({ includeArchived: false, offset: 0 });
});

function izmenitPoisk(value: string | number | null): void {
    poisk.value = value === null ? "" : String(value);
    store.zadatPoiskSDebounce(poisk.value);
}

function izmenitArhiv(event: Event): void {
    const target = event.target as HTMLInputElement | null;

    includeArchived.value = target?.checked === true;
    store.sbrositPaginaciyu();
    void store.zagruzitSpisok({
        includeArchived: includeArchived.value,
        offset: 0,
    });
}

function otkryt(session: AiChatSession): void {
    void router.push({
        name: "ai_chat_session",
        params: { id: session.id },
    });
}

function novayaSessiya(): void {
    void router.push({ name: "ai_chat" });
}

function tekstOshibki(result: AiChatServiceResult<unknown>): string {
    if (result.errorDetails !== null && result.errorDetails !== "") {
        return result.errorDetails;
    }

    return result.errorKey === null ? t("aiChat.errors.title") : t(result.errorKey);
}

async function arhivirovat(session: AiChatSession): Promise<void> {
    oshibkaDeystviya.value = null;

    const result = await store.arhivirovatSessiyu(session.id);

    if (!result.ok) {
        oshibkaDeystviya.value = tekstOshibki(result);
    }
}

function zaprositUdalenie(session: AiChatSession): void {
    if (!session.archived) {
        return;
    }

    oshibkaDeystviya.value = null;
    kUdaleniyu.value = session;
}

async function podtverditUdalenie(): Promise<void> {
    const session = kUdaleniyu.value;

    if (session === null) {
        return;
    }

    const result = await store.udalitSessiyu(session.id);

    if (result.ok) {
        kUdaleniyu.value = null;

        return;
    }

    oshibkaDeystviya.value = tekstOshibki(result);
}

function sleduyushaya(): void {
    void store.sleduyushayaStranica();
}

function predidushaya(): void {
    void store.predidushayaStranica();
}
</script>

<template>
    <div class="ai-sessions">
        <GhPageHeader
            :title="t('aiChat.sessions.title')"
            :description="t('aiChat.sessions.subtitle')"
        >
            <template #actions>
                <GhButton
                    variant="primary"
                    icon="plus"
                    :label="t('aiChat.sessions.new_session')"
                    @click="novayaSessiya"
                />
            </template>
        </GhPageHeader>

        <div class="ai-sessions__toolbar">
            <GhInput
                :model-value="poisk"
                type="search"
                icon="search"
                :placeholder="t('aiChat.sessions.search_placeholder')"
                @update:model-value="izmenitPoisk"
            />

            <label class="ai-sessions__toggle">
                <input
                    type="checkbox"
                    :checked="includeArchived"
                    @change="izmenitArhiv"
                />
                <span>{{ t("aiChat.sessions.include_archived") }}</span>
            </label>
        </div>

        <GhBanner
            v-if="oshibkaSpiska"
            variant="danger"
            :title="t('aiChat.sessions.load_error_title')"
            class="ai-sessions__banner"
        >
            {{ oshibkaSpiska }}
        </GhBanner>

        <GhBanner
            v-if="oshibkaDeystviya"
            variant="danger"
            :title="t('aiChat.errors.title')"
            class="ai-sessions__banner"
        >
            {{ oshibkaDeystviya }}
        </GhBanner>

        <div v-if="loaderSpiska" class="ai-sessions__loading">
            {{ t("aiChat.sessions.loading") }}
        </div>

        <GhEmptyState
            v-else-if="pustSpisok"
            icon="comment-discussion"
            :title="t('aiChat.sessions.empty_title')"
            :description="t('aiChat.sessions.empty_description')"
        >
            <template #actions>
                <GhButton
                    variant="primary"
                    icon="plus"
                    :label="t('aiChat.sessions.new_session')"
                    @click="novayaSessiya"
                />
            </template>
        </GhEmptyState>

        <div v-else class="ai-sessions__list">
            <KartaSessiiAiChata
                v-for="session in items"
                :key="session.id"
                :session="session"
                @open="otkryt(session)"
                @archive="arhivirovat(session)"
                @delete="zaprositUdalenie(session)"
            />
        </div>

        <footer v-if="total > 0" class="ai-sessions__pagination">
            <span class="ai-sessions__range">
                {{ t("aiChat.sessions.range", { from: pervayaStranica, to: poslednyayaStranica, total }) }}
            </span>

            <div class="ai-sessions__pagination-actions">
                <GhButton
                    size="sm"
                    icon="arrow-left"
                    :label="t('aiChat.sessions.previous')"
                    :disabled="offset === 0 || loaderSpiska"
                    @click="predidushaya"
                />
                <GhButton
                    size="sm"
                    icon-right="arrow-right"
                    :label="t('aiChat.sessions.next')"
                    :disabled="!hasMore || loaderSpiska"
                    @click="sleduyushaya"
                />
            </div>
        </footer>

        <GhDialog
            v-model="pokazatUdalenie"
            :title="t('aiChat.sessions.delete_confirm_title')"
            width="420px"
        >
            <p class="ai-sessions__dialog-text">
                {{ t("aiChat.sessions.delete_confirm_description", { title: kUdaleniyu?.title }) }}
            </p>
            <p class="ai-sessions__dialog-warning">
                {{ t("aiChat.sessions.delete_confirm_warning") }}
            </p>

            <template #footer>
                <GhButton
                    :label="t('common.buttons.cancel')"
                    @click="pokazatUdalenie = false"
                />
                <GhButton
                    variant="danger"
                    icon="trash"
                    :label="t('aiChat.sessions.delete')"
                    :loading="udalyayemiId !== null"
                    @click="podtverditUdalenie"
                />
            </template>
        </GhDialog>
    </div>
</template>

<style scoped>
.ai-sessions {
    display: flex;
    flex-direction: column;
    gap: 16px;
    font-family: var(--fontStack-system);
}

.ai-sessions__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
}

.ai-sessions__toolbar :deep(.gh-input) {
    flex: 1 1 260px;
}

.ai-sessions__toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--fgColor-default);
    font-size: var(--fontSize-body);
    cursor: pointer;
}

.ai-sessions__banner {
    flex-shrink: 0;
}

.ai-sessions__loading {
    padding: 24px;
    color: var(--fgColor-muted);
    text-align: center;
}

.ai-sessions__list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.ai-sessions__pagination {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-top: 4px;
}

.ai-sessions__range {
    color: var(--fgColor-muted);
    font-size: var(--fontSize-caption);
}

.ai-sessions__pagination-actions {
    display: flex;
    gap: 8px;
}

.ai-sessions__dialog-text {
    margin: 0;
    font-size: var(--fontSize-body);
}

.ai-sessions__dialog-warning {
    margin: 8px 0 0;
    color: var(--fgColor-danger);
    font-size: var(--fontSize-caption);
}
</style>
