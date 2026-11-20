import type {Proekt} from "@/modules/unit/store/SpisokProektov/model/Proekt";

/** UI-состояние проекта: одно значение на все способы отображения. */
export type ProektUiStatus = "busy" | "success" | "new" | "error";

/** Результат вывода UI-состояния: сам статус и ключ его подписи. */
export type ProektUiState = {
    status: ProektUiStatus;
    labelKey: string;
};

/**
 * Приводит доменное состояние проекта к UI-статусу карточки.
 *
 * Приоритет отдан активным процессам: пока раннер не вернул результат,
 * карточка показывает `busy`, даже если предыдущая сборка завершилась
 * успешно.
 */
export function deriveProektUiStatus(proekt: Proekt): ProektUiState {
    if (
        proekt.waitResultRunner
        || proekt.state === "BUILD_PENDING"
        || proekt.state === "REMOVE_PENDING"
    ) {
        return {
            status: "busy",
            labelKey: "unit.spisok_proektov.card.status.busy",
        };
    }

    if (proekt.state === "BUILD_SUCCESS") {
        return {
            status: "success",
            labelKey: "unit.spisok_proektov.card.status.success",
        };
    }

    if (proekt.state === "BUILD_ERROR" || proekt.state === "REMOVE_ERROR") {
        return {
            status: "error",
            labelKey: "unit.spisok_proektov.card.status.error",
        };
    }

    return {
        status: "new",
        labelKey: "unit.spisok_proektov.card.status.new",
    };
}
