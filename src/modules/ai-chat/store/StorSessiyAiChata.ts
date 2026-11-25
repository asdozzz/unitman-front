/**
 * Pinia-стор сессий AI-чата.
 *
 * Стор — единственный владелец списка и открытой сессии на клиенте. Он не
 * реализует агентный цикл: A5 вызывает {@link applyTurnResult} после каждого
 * хода, чтобы обновить сводку сессии и ленту сообщений.
 *
 * Контракт с бэкендом:
 * - список содержит только сессии с сообщениями; пустая сессия после
 *   `createSession` в список не добавляется;
 * - превью — ровно одна строка на карточку, её отдаёт бэкенд;
 * - удалять можно только архивную сессию; стор проверяет это на клиенте, но
 *   окончательное решение остаётся за бэкендом (`ai.chat.session_not_archived`).
 */

import {defineStore} from 'pinia';
import aiChatService from '@/modules/ai-chat/services/AiChatService';
import type {
    AiChatErrorKey,
    AiChatRole,
    AiChatServiceResult,
    AiChatSession,
    AiChatSessionCreateRequest,
    AiChatSessionDetail,
    AiChatSessionList,
    AiChatSessionListQuery,
    AiChatSessionMessage,
    AiChatSessionToolCall,
    AiChatToolResult,
    AiChatTurnResult,
} from '@/modules/ai-chat/model/types';

/** Лимит страницы по умолчанию совпадает с бэкендом. */
const LIMIT_PO_D_UMOLCHANIYU = 50;

/** Задержка склейки ввода поиска. */
const ZADERZHKA_POISKA_MS = 300;

/** Таймер отложенного поиска; один на модуль (стор синглтон). */
let tajmerPoiskа: ReturnType<typeof setTimeout> | null = null;

/** Синтетическое описание сообщения, добавляемого локально после хода. */
interface LokalnoeSoobshenie {
    role: AiChatRole;
    content: string | null;
    toolCalls?: AiChatSessionToolCall[];
    toolCallId?: string | null;
    name?: string | null;
}

/** Дополнение к результату хода: что пользователь отправил в этом ходе. */
export interface DopolnenieHoda {
    /** Текст нового сообщения пользователя (для хода с `message`). */
    userMessage?: string;
    /** Результаты инструментов (для хода с `toolResults`). */
    toolResults?: AiChatToolResult[];
}

export type StorSessiyAiChataState = {
    /* Список сессий. */
    items: AiChatSession[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    search: string;
    includeArchived: boolean;
    loaderSpiska: boolean;
    oshibkaSpiska: string | null;

    /* Открытая сессия. */
    session: AiChatSession | null;
    messages: AiChatSessionMessage[];
    providerSessionExpiresAt: number | null;
    loaderSessii: boolean;
    oshibkaSessii: string | null;

    /* Идентификаторы выполняемых операций. */
    arhiviruemiId: string | null;
    udalyayemiId: string | null;
};

/** Результат-заглушка для клиентского отказа без обращения к серверу. */
function otkaz<T>(
    errorKey: AiChatErrorKey,
    errorDetails: string | null = null,
): AiChatServiceResult<T> {
    return {
        ok: false,
        status: 0,
        data: null,
        errorKey,
        errorDetails,
    };
}

export const useStorSessiyAiChata = defineStore('StorSessiyAiChata', {
    state: (): StorSessiyAiChataState => ({
        items: [],
        total: 0,
        limit: LIMIT_PO_D_UMOLCHANIYU,
        offset: 0,
        hasMore: false,
        search: '',
        includeArchived: false,
        loaderSpiska: false,
        oshibkaSpiska: null,

        session: null,
        messages: [],
        providerSessionExpiresAt: null,
        loaderSessii: false,
        oshibkaSessii: null,

        arhiviruemiId: null,
        udalyayemiId: null,
    }),

    getters: {
        /** Список пуст после загрузки. */
        pustSpisok: (state): boolean => state.items.length === 0,

        /** Есть ли среди загруженных сессий хотя бы одна активная. */
        estAktivnie: (state): boolean => state.items.some((item) => !item.archived),

        /** Открытая сессия существует, но уже истекла по `expiresAt`. */
        aktivnayaIstekla: (state): boolean => {
            const session = state.session;

            if (session === null || session.archived) {
                return false;
            }

            return session.expiresAt * 1000 <= Date.now();
        },

        /** Открытая сессия архивная (только чтение). */
        arhivnaya: (state): boolean => state.session !== null && state.session.archived,

        /** Можно ли удалить сессию: только архивную и только не в процессе. */
        mozhnoUdalit: (state) => {
            return (id: string): boolean => {
                const session = state.session !== null && state.session.id === id
                    ? state.session
                    : state.items.find((item) => item.id === id) ?? null;

                return session !== null
                    && session.archived
                    && state.udalyayemiId === null;
            };
        },
    },

    actions: {
        /* ------------------------------ Список ------------------------------ */

        /**
         * Загружает страницу списка. Переданные `params` обновляют фильтры
         * перед запросом; отсутствующие — берутся из состояния.
         */
        async zagruzitSpisok(
            params: AiChatSessionListQuery = {},
        ): Promise<AiChatServiceResult<AiChatSessionList>> {
            if (params.search !== undefined) {
                this.search = params.search ?? '';
            }
            if (params.includeArchived !== undefined) {
                this.includeArchived = params.includeArchived;
            }
            if (params.limit !== undefined) {
                this.limit = params.limit;
            }
            if (params.offset !== undefined) {
                this.offset = params.offset;
            }

            this.loaderSpiska = true;
            this.oshibkaSpiska = null;

            const poisk = this.search.trim();

            const response = await aiChatService.listSessions({
                includeArchived: this.includeArchived,
                search: poisk === '' ? null : poisk,
                limit: this.limit,
                offset: this.offset,
            });

            if (response.ok && response.data !== null) {
                this.items = response.data.items;
                this.total = response.data.total;
                this.limit = response.data.limit;
                this.offset = response.data.offset;
                this.hasMore = response.data.hasMore;
            } else {
                this.oshibkaSpiska = response.errorDetails ?? response.errorKey ?? '';
            }

            this.loaderSpiska = false;

            return response;
        },

        /** Явный поиск: сбрасывает страницу и загружает заново. */
        zadatPoisk(search: string): void {
            this.search = search;
            this.offset = 0;
            void this.zagruzitSpisok({search, offset: 0});
        },

        /** Отложенный поиск для поля ввода. */
        zadatPoiskSDebounce(search: string, zaderzhkaMs: number = ZADERZHKA_POISKA_MS): void {
            this.search = search;

            if (tajmerPoiskа !== null) {
                clearTimeout(tajmerPoiskа);
            }

            tajmerPoiskа = setTimeout(() => {
                tajmerPoiskа = null;
                this.offset = 0;
                void this.zagruzitSpisok({search: this.search, offset: 0});
            }, zaderzhkaMs);
        },

        /** Следующая страница, если бэкенд сообщил `hasMore`. */
        async sleduyushayaStranica() {
            if (!this.hasMore) {
                return;
            }

            this.offset += this.limit;

            return this.zagruzitSpisok({offset: this.offset});
        },

        /** Предыдущая страница. */
        async predidushayaStranica() {
            if (this.offset === 0) {
                return;
            }

            this.offset = Math.max(0, this.offset - this.limit);

            return this.zagruzitSpisok({offset: this.offset});
        },

        /** Сбрасывает смещение без запроса (например, перед новой загрузкой). */
        sbrositPaginaciyu(): void {
            this.offset = 0;
        },

        /* ------------------------------- CRUD ------------------------------- */

        /** Открывает сессию и её полную историю сообщений. */
        async otkrytSessiyu(id: string): Promise<AiChatServiceResult<AiChatSessionDetail>> {
            this.loaderSessii = true;
            this.oshibkaSessii = null;

            const response = await aiChatService.getSession(id);

            if (response.ok && response.data !== null) {
                this.session = response.data.session;
                this.messages = response.data.messages;
                this.providerSessionExpiresAt = null;
                this.obnovitKartochkuVSpiske(response.data.session);
            } else {
                this.oshibkaSessii = response.errorDetails ?? response.errorKey ?? '';
            }

            this.loaderSessii = false;

            return response;
        },

        /**
         * Создаёт сессию и делает её открытой.
         *
         * В список она не добавляется: бэкенд исключает сессии без сообщений,
         * а карточка без превью нарушила бы правило «одно превью на сессию».
         */
        async sozdatSessiyu(
            payload: AiChatSessionCreateRequest = {},
        ): Promise<AiChatServiceResult<AiChatSession>> {
            this.loaderSessii = true;
            this.oshibkaSessii = null;

            const response = await aiChatService.createSession(payload);

            if (response.ok && response.data !== null) {
                this.session = response.data;
                this.messages = [];
                this.providerSessionExpiresAt = null;
            } else {
                this.oshibkaSessii = response.errorDetails ?? response.errorKey ?? '';
            }

            this.loaderSessii = false;

            return response;
        },

        /** Архивирует сессию и обновляет её карточку в списке. */
        async arhivirovatSessiyu(id: string): Promise<AiChatServiceResult<AiChatSession>> {
            this.arhiviruemiId = id;

            const response = await aiChatService.archiveSession(id);

            if (response.ok && response.data !== null) {
                this.obnovitKartochkuVSpiske(response.data);

                if (this.session !== null && this.session.id === id) {
                    this.session = response.data;
                }
            }

            this.arhiviruemiId = null;

            return response;
        },

        /**
         * Удаляет сессию. Клиентская проверка: только архивную. Бэкенд всё
         * равно остаётся авторитетным и может вернуть `session_not_archived`.
         */
        async udalitSessiyu(id: string): Promise<AiChatServiceResult<null>> {
            const kandidat = this.session !== null && this.session.id === id
                ? this.session
                : this.items.find((item) => item.id === id) ?? null;

            if (kandidat === null || !kandidat.archived) {
                return otkaz<null>(
                    'ai.chat.session_not_archived',
                    'Удалить можно только архивную сессию.',
                );
            }

            this.udalyayemiId = id;

            const response = await aiChatService.deleteSession(id);

            if (response.ok) {
                this.items = this.items.filter((item) => item.id !== id);
                this.total = Math.max(0, this.total - 1);

                if (this.session !== null && this.session.id === id) {
                    this.sbrosit();
                }
            }

            this.udalyayemiId = null;

            return response;
        },

        /* ---------------------------- Ход диалога ---------------------------- */

        /**
         * Применяет результат хода: обновляет сводку сессии и добавляет
         * сообщения, которые UI должен показать сразу.
         *
         * Агентный цикл (инструменты, подтверждения) этому методу не
         * принадлежит — его ведёт A5.
         */
        applyTurnResult(result: AiChatTurnResult, dopolnenie: DopolnenieHoda = {}): void {
            const summary = result.session;

            this.providerSessionExpiresAt = summary.providerSessionExpiresAt;

            if (this.session !== null && this.session.id === summary.id) {
                this.session = {
                    ...this.session,
                    title: summary.title,
                    archived: summary.archived,
                    updatedAt: summary.updatedAt,
                };
            }

            this.obnovitKartochkuVSpiske({
                id: summary.id,
                title: summary.title,
                archived: summary.archived,
                updatedAt: summary.updatedAt,
            });

            if (typeof dopolnenie.userMessage === 'string' && dopolnenie.userMessage !== '') {
                this.dobavitSoobshenie({
                    role: 'user',
                    content: dopolnenie.userMessage,
                });
            }

            for (const toolResult of dopolnenie.toolResults ?? []) {
                this.dobavitSoobshenie({
                    role: 'tool',
                    content: toolResult.content ?? '',
                    toolCallId: toolResult.toolCallId,
                    name: toolResult.name ?? null,
                });
            }

            this.dobavitSoobshenie({
                role: 'assistant',
                content: result.assistant.content,
                toolCalls: result.assistant.toolCalls,
            });
        },

        /** Псевдоним для A5: обновление после хода. */
        obnovitPosleHoda(result: AiChatTurnResult, dopolnenie: DopolnenieHoda = {}): void {
            this.applyTurnResult(result, dopolnenie);
        },

        /**
         * Добавляет локальное сообщение в ленту.
         *
         * Tool-сообщения с тем же `toolCallId` заменяются, а не дублируются:
         * повторный ход с теми же результатами не должен размножать ленту.
         */
        dobavitSoobshenie(
            soobshenie: LokalnoeSoobshenie,
        ): AiChatSessionMessage {
            const toolCallId = soobshenie.toolCallId ?? null;

            if (soobshenie.role === 'tool' && toolCallId !== null) {
                const index = this.messages.findIndex(
                    (message) => message.role === 'tool' && message.toolCallId === toolCallId,
                );

                if (index !== -1) {
                    this.messages[index] = {
                        ...this.messages[index],
                        content: soobshenie.content,
                        name: soobshenie.name ?? null,
                    };

                    return this.messages[index];
                }
            }

            const last = this.messages[this.messages.length - 1];
            const seq = last === undefined ? 0 : last.seq + 1;

            const message: AiChatSessionMessage = {
                id: `local-${seq}-${Date.now()}`,
                seq,
                role: soobshenie.role,
                content: soobshenie.content,
                toolCalls: soobshenie.toolCalls ?? [],
                toolCallId,
                name: soobshenie.name ?? null,
                createdAt: Math.floor(Date.now() / 1000),
            };

            this.messages.push(message);

            return message;
        },

        /* ------------------------------- Сброс ------------------------------- */

        /** Закрывает открытую сессию, не трогая список. */
        sbrosit(): void {
            this.session = null;
            this.messages = [];
            this.providerSessionExpiresAt = null;
            this.loaderSessii = false;
            this.oshibkaSessii = null;
        },

        /** Очищает список и сбрасывает пагинацию/поиск. */
        sbrositSpisok(): void {
            if (tajmerPoiskа !== null) {
                clearTimeout(tajmerPoiskа);
                tajmerPoiskа = null;
            }

            this.items = [];
            this.total = 0;
            this.offset = 0;
            this.hasMore = false;
            this.search = '';
            this.includeArchived = false;
            this.oshibkaSpiska = null;
        },

        /** Полный сброс — например, при смене аккаунта. */
        sbrositVse(): void {
            this.sbrositSpisok();
            this.sbrosit();
            this.arhiviruemiId = null;
            this.udalyayemiId = null;
        },

        /* ----------------------------- Служебное ---------------------------- */

        /**
         * Обновляет карточку сессии в списке, не добавляя отсутствующих.
         * Пустая сессия не должна появляться в списке без превью, а
         * отсутствующие в патче поля не должны затирать превью/провайдера.
         */
        obnovitKartochkuVSpiske(session: Partial<AiChatSession> & {id: string}): void {
            const index = this.items.findIndex((item) => item.id === session.id);

            if (index === -1) {
                return;
            }

            const patch = Object.fromEntries(
                Object.entries(session).filter(([, value]) => value !== undefined),
            );

            this.items[index] = {
                ...this.items[index],
                ...patch,
            } as AiChatSession;
        },
    },
});

export default useStorSessiyAiChata;
