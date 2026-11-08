import apiClient from "@/bootstrap/apiClient";
import type {Schema} from "@/api/types";

/**
 * Сервис типов томов проекта (каталог архивов).
 *
 * Тип тома описывается парой `code`/`name`. `code` должен совпадать с `dir`
 * тома в блоке `unitman_volumes` конфига юнита — по нему форма создания юнита
 * подбирает архивы проекта для конкретного тома.
 *
 * Архивы загружаются в медиатеку как файлы проекта (`projectId`), после чего
 * привязываются к типу через `/volumeType/file/add`.
 */
class VolumeTypesService {
    /** Типы томов проекта вместе с привязанными архивами. */
    list(projectId: string) {
        return apiClient.post('/volumeType/list', {projectId});
    }

    /** Добавить тип тома. */
    add(params: Schema<"AddVolumeType">) {
        return apiClient.post('/volumeType/add', params);
    }

    /**
     * Удалить тип тома.
     *
     * Бэкенд запрещает удаление, если к типу привязаны архивы, — поэтому
     * ошибку нужно показывать пользователю.
     */
    udalit(params: Schema<"DeleteVolumeType">) {
        return apiClient.post('/volumeType/delete', params);
    }

    /** Прикрепить ранее загруженный архив проекта к типу тома. */
    dobavitFayl(params: Schema<"AddVolumeTypeFile">) {
        return apiClient.post('/volumeType/file/add', params);
    }

    /**
     * Открепить архив от типа тома.
     *
     * `udalitFayl` дополнительно удаляет архив из медиатеки, если он не
     * привязан к другим типам.
     */
    udalitFayl(params: Schema<"DeleteVolumeTypeFile">) {
        return apiClient.post('/volumeType/file/delete', params);
    }
}

export default new VolumeTypesService();
