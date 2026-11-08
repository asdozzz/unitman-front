import apiClient from "@/bootstrap/apiClient";
import type {ApiResponse} from "@/bootstrap/apiClient/ApiResponse";
import {buildPath} from "@/api/paths";
import type {Schema} from "@/api/types";

/**
 * Сервис медиатеки (файлы юнитов).
 *
 * Файлы — zip-архивы, привязанные к томам (`unitman_volumes`). Чтобы
 * приложить файл к юниту, которого ещё нет (форма создания юнита), архив
 * загружается как черновик: `unitId` не передаётся. Затем ид черновика
 * уходит в `SozdatUnit.volumes[].fileId` — бэкенд сам привяжет файл к
 * созданному юниту. В форме заполнения юнит уже существует, поэтому архив
 * грузится сразу к нему, а ид уходит в `ZapolnitPeremenieUnita.volumes[].fileId`.
 */
class MediatekaService {
    /**
     * Загрузить zip-архив.
     *
     * `unitId` не передаётся — файл сохраняется как черновик и становится
     * доступен для привязки к создаваемому юниту.
     */
    zagruzitChernovik(file: File, name?: string): Promise<ApiResponse<ChernovikFayla>> {
        const body = this.sobratFormuZagruzki(file, {}, name);

        return apiClient.post<ChernovikFayla>("/mediateka/upload", body);
    }

    /** Загрузить zip-архив сразу к существующему юниту. */
    zagruzitDlyaUnita(file: File, unitId: string, name?: string): Promise<ApiResponse<ChernovikFayla>> {
        const body = this.sobratFormuZagruzki(file, {unitId}, name);

        return apiClient.post<ChernovikFayla>("/mediateka/upload", body);
    }

    /**
     * Загрузить zip-архив как файл проекта (каталог типов томов).
     *
     * Владелец файла — проект: архив общий для всех юнитов и не привязан
     * к конкретному юниту. Ид файла затем привязывается к типу тома
     * через `/volumeType/file/add`.
     */
    zagruzitFaylProekta(file: File, projectId: string, name?: string): Promise<ApiResponse<ChernovikFayla>> {
        const body = this.sobratFormuZagruzki(file, {projectId}, name);

        return apiClient.post<ChernovikFayla>("/mediateka/upload", body);
    }

    /**
     * Собрать тело multipart-запроса.
     *
     * Тело передаётся как `FormData`, поэтому типизированный overload
     * apiClient (он ожидает JSON-схему тела) не применим — в вызывающих
     * методах тип ответа задаётся параметром `post<T>`.
     *
     * Владелец файла ровно один: `unitId` (файл юнита, в том числе черновик)
     * либо `projectId` (общий архив каталога типов томов проекта).
     */
    private sobratFormuZagruzki(
        file: File,
        vladelec: { unitId?: string; projectId?: string },
        name?: string,
    ): FormData {
        const body: FormData = new FormData();
        body.append("file", file);
        if (vladelec.unitId) {
            body.append("unitId", vladelec.unitId);
        }
        if (vladelec.projectId) {
            body.append("projectId", vladelec.projectId);
        }
        if (name) {
            body.append("name", name);
        }

        return body;
    }

    /** Файлы юнита. */
    poluchitFaylyUnita(unitId: string) {
        return apiClient.get(buildPath("/mediateka/unit/{unitId}", {unitId}));
    }

    /** Информация о файле со ссылкой на скачивание. */
    poluchitFayl(fileId: string) {
        return apiClient.get(buildPath("/mediateka/file/{id}", {id: fileId}));
    }

    /** Удалить файл (в том числе черновик). */
    udalitFayl(fileId: string) {
        return apiClient.delete(buildPath("/mediateka/file/{id}/udalit", {id: fileId}));
    }
}

/** Черновик, загруженный в рамках формы (ещё не привязан к юниту). */
export type ChernovikFayla = Schema<"MediatekaFaylUnita">;

export default new MediatekaService();
