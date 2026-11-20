import apiClient from "@/bootstrap/apiClient";
import type { ApiResponse } from "@/bootstrap/apiClient/ApiResponse";
import type { ApiQuery, Schema } from "@/api/types";
import type {
    UvedomleniyaOpenCodeResponse,
    ZahvatUvedomleniyResponse,
} from "@/modules/opencode/model/UvedomlenieOpenCode";

/**
 * Сервис сессий и ходов OpenCode (`/opencode/*`).
 *
 * Реквизиты (API-ключи) живут в аккаунте — см.
 * `@/modules/account/services/OpenCodeCredentialService`.
 *
 * Тела запросов и типы ответов выводятся из сгенерированной OpenAPI-схемы
 * (`yarn gen:api`).
 */
/**
 * Query-параметры списка сессий.
 *
 * Тип выводится из сгенерированной схемы, чтобы фильтр не расходился
 * с контрактом при добавлении новых параметров.
 */
export type FiltrSessiyOpenCode = ApiQuery<"/opencode/spisokSessiy", "get">;

class OpenCodeService {
    /**
     * Список сессий текущего пользователя. Ответ — `OpenCodeSession[]`.
     *
     * Архивные сессии тоже приходят: у них `archived: true`. Чтобы получить
     * только активные, передайте `{onlyActive: true}`.
     */
    spisokSessiy(params?: FiltrSessiyOpenCode): Promise<ApiResponse<Schema<"OpenCodeSession">[]>> {
        return apiClient.get<'/opencode/spisokSessiy'>('/opencode/spisokSessiy', params);
    }

    /**
     * Создание сессии под выбранные реквизиты.
     *
     * `credentialId` обязателен: ключ выбирает пользователь, сервер сам его не
     * подставляет.
     *
     * Юниты можно указать двумя взаимоисключающими способами:
     * - `unitIds` — идентификаторы уже существующих юнитов; первый становится
     *   рабочей директорией, остальные подключаются дополнительными корнями;
     * - `unit` — описание юнита «на лету» (проект, ветка, лимиты и переменные).
     *
     * Передавать оба поля одновременно нельзя.
     */
    sozdatSessiyu(params: Schema<"SozdatSessiyu">) {
        return apiClient.post('/opencode/sozdatSessiyu', params);
    }

    /**
     * Привязать сессию к существующим юнитам.
     *
     * Идемпотентно: уже привязанные юниты не дублируются, новые дописываются
     * в конец списка сессии. Привязка доступна и для сессии «в процессе» —
     * рабочая директория при этом не меняется, юниты подключаются как
     * дополнительные корни. Ответ — `data: null`, поэтому список/чат нужно
     * перезапросить.
     */
    privezatKUnitu(params: Schema<"PrivezatKUnitu">) {
        return apiClient.post('/opencode/privezatKUnitu', params);
    }

    /**
     * Состояние сессии и её юнитов.
     *
     * Позволяет отличить «юнит привязан, но ещё готовится» от «готов к работе»:
     * по `ready`/`group` можно блокировать отправку промпта до готовности
     * окружения и показывать причину блокировки.
     */
    sostoyanieSessii(params: Schema<"PoluchitSostoyanieSessii">) {
        return apiClient.post('/opencode/sostoyanieSessii', params);
    }

    /** История ходов сессии по порядку (`seq`). Ответ — `OpenCodeTurn[]`. */
    istoriyaSessii(params: Schema<"PoluchitIstoriyuSessii">) {
        return apiClient.post('/opencode/istoriyaSessii', params);
    }

    /**
     * Запуск нового хода по промпту.
     *
     * Ответ — `OpenCodeTurnLaunch`: клиент подписывается на `progressChannel` и
     * опрашивает `poluchitResultatHoda` по `turnId`.
     */
    prompt(params: Schema<"NachatPrompt">) {
        return apiClient.post('/opencode/prompt', params);
    }

    /**
     * Ответы на вопросы предыдущего хода.
     *
     * Запускает **новый** ход: ответ приходит в виде `OpenCodeTurnLaunch`, а не
     * как обновление прежнего.
     */
    otvetit(params: Schema<"OtvetitNaVopros">) {
        return apiClient.post('/opencode/otvetit', params);
    }

    /** Текущее состояние хода; терминальный статус определяется по `status`. */
    poluchitResultatHoda(params: Schema<"PoluchitResultatHoda">) {
        return apiClient.post('/opencode/poluchitResultatHoda', params);
    }

    /**
     * Дозагрузка снапшота шагов.
     *
     * `data: null` — снапшот ещё не опубликован; это нормальное ожидание, а не
     * ошибка.
     */
    poluchitProgressHoda(params: Schema<"PoluchitProgressHoda">) {
        return apiClient.post('/opencode/poluchitProgressHoda', params);
    }

    /**
     * Архивирование сессии (пользовательское «удаление»).
     *
     * На бэкенде полное удаление заменено архивацией: ходы и история остаются,
     * сессия продолжает возвращаться в `spisokSessiy` с `archived: true` и
     * `archiveReason: "manual"`, но новые ходы для неё запрещены. Ответ —
     * `data: null`, поэтому список нужно перезапросить.
     *
     * Устаревший алиас `udalitSessiyu` не используется осознанно: он помечен
     * `deprecated` и делает ровно то же самое.
     */
    arhivirovatSessiyu(params: Schema<"ArhivirovatSessiyu">) {
        return apiClient.post('/opencode/arhivirovatSessiyu', params);
    }

    /**
     * Непрочитанные уведомления текущего аккаунта и имя канала Centrifugo.
     *
     * Канал вычисляет только бэкенд, поэтому клиент не строит его сам.
     * Ответ типизирован локальной моделью: до регенерации OpenAPI этого
     * endpoint-а нет в `unitman.d.ts`.
     */
    uvedomleniya(params?: { limit?: number }) {
        return apiClient.get<UvedomleniyaOpenCodeResponse>('/opencode/uvedomleniya', params);
    }

    /**
     * Атомарно захватить уведомления и пометить их прочитанными.
     *
     * В ответе `ids` — только те уведомления, которые этот запрос реально
     * перевёл из непрочитанных в прочитанные. Именно их и нужно показывать:
     * так исключаются дубли между вкладками.
     */
    otmetitUvedomleniyaProchitannimi(params: { ids: string[] }) {
        return apiClient.post<ZahvatUvedomleniyResponse>('/opencode/otmetitUvedomleniyaProchitannimi', params);
    }
}

export default new OpenCodeService();
