import apiClient from "@/bootstrap/apiClient";
import type { components } from "@/api/generated/unitman";
import type {
    RannerKarta,
    UgrozyRannerov,
} from "@/modules/runner/model/ResursiServera";

/** Сохранённый публичный адрес раннера (схема бэкенда `RunnerPublicAddress`). */
export type SohranennyPublicAddress = components["schemas"]["RunnerPublicAddress"];

/** Результат advisory-проверки публичного адреса (схема бэкенда `RunnerPublicAddressCheck`). */
export type RezultatProverkiPublicAddress = components["schemas"]["RunnerPublicAddressCheck"];

/**
 * Сервис раннеров.
 *
 * Ответ `{active: boolean}` приходит без конверта, apiClient возвращает его целиком.
 * `GET /runner/list` и `GET /runner/threats` отвечают конвертом `{status, data}`;
 * их типы описаны вручную: модель карточки содержит структурированные ресурсы,
 * которых нет в `RannerKartaReadModel` OpenAPI-схемы.
 *
 * Ошибки валидации (400), недостатка прав (403) и неизвестного раннера (404)
 * приходят как `status: "fail"` с текстом бэкенда — компонент показывает его
 * пользователю, не прерывая работу списка.
 */
class RunnerService {
    /** Карточки всех раннеров (только администратор). */
    getRunners() {
        return apiClient.get<RannerKarta[]>('/runner/list');
    }

    /** Краткая сводка угроз для шапки (все авторизованные). */
    getThreats() {
        return apiClient.get<UgrozyRannerov>('/runner/threats');
    }

    /** Задать публичный адрес раннера (только администратор). */
    savePublicAddress(runnerId: string, publicAddress: string) {
        return apiClient.put<SohranennyPublicAddress>(
            `/runner/${encodeURIComponent(runnerId)}/public-address`,
            { publicAddress },
        );
    }

    /** Очистить публичный адрес раннера (только администратор). Ответ — 204 без тела. */
    deletePublicAddress(runnerId: string) {
        return apiClient.delete<null>(
            `/runner/${encodeURIComponent(runnerId)}/public-address`,
        );
    }

    /** Advisory-проверка доступности публичного адреса (только администратор). */
    checkPublicAddress(runnerId: string, publicAddress: string) {
        return apiClient.post<RezultatProverkiPublicAddress>(
            `/runner/${encodeURIComponent(runnerId)}/public-address/check`,
            { publicAddress },
        );
    }
}

export default new RunnerService();
