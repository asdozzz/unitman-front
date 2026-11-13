/**
 * Имя канала Centrifugo, в который бэкенд публикует события проектов
 * (создан, обновлён, удалён).
 */
export const KANAL_SOBITIY_PROEKTOV = 'spisok_proektov';

/**
 * Событие websocket-канала списка проектов.
 *
 * События отдаются не по REST, поэтому в OpenAPI-спецификации их нет.
 * Структура повторяет бэкендовскую `WebsocketProjectEventReadModel`
 * (`src/Unitman/Business/ReadModel/Project/WebsocketProjectEventReadModel.php`).
 */
export type ModelForChannelSpisokProektov = {
    id: string;
    eventType: string;
    userId: string;
    userEmail: string;
    projectName: string;
}

/** Типы событий проекта, которые публикует бэкенд. */
export const SOZDANIE_PROEKTA = 'SOZDAN';
export const UDALENIE_PROEKTA = 'UDALEN';
export const OBNOVLENIE_PROEKTA = 'OBNOVLEN';
