/**
 * Имя канала Centrifugo, в который бэкенд публикует события юнитов
 * (создан, обновлён, изменил состояние, удалён).
 */
export const KANAL_SOBITIY_UNITOV = 'spisok_unitov';

/**
 * Событие websocket-канала списка юнитов.
 *
 * События отдаются не по REST, поэтому в OpenAPI-спецификации их нет.
 * Структура повторяет бэкендовскую `WebsocketUnitEventReadModel`
 * (`src/Unitman/Business/ReadModel/Unit/WebsocketUnitEventReadModel.php`).
 */
export type ModelForChannelSpisokUnitov = {
    id: string;
    eventType: string;
    userId: string;
    userEmail: string;
    unitName: string;
}
