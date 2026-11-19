import type {Unit} from "@/modules/unit/store/SpisokUnitov/model/Unit";

/** Команда, которую бэкенд разрешает юниту в текущем состоянии. */
export type UnitCommand = Unit["commands"][number];

/** Визуальное состояние карточки, вычисленное из данных юнита. */
export type UnitUiStatus = "running" | "busy" | "prepared" | "stopped" | "error" | "broken";

/**
 * Флаги, которые карточка получает из помощников стора.
 *
 * Отдельный объект позволяет держать вычисление состояния чистой функцией
 * и не дублировать условия `zapushen` / `esliJdemRunner` в компонентах.
 */
export type UnitStatusSource = {
    zapushen: boolean;
    error: boolean;
    zanyat: boolean;
    tekushayaZadacha: string;
    commands: UnitCommand[];
};

export type UnitUiState = {
    status: UnitUiStatus;
    labelKey: string;
    busyText: string | null;
    canOpenLinks: boolean;
    primaryCommand: UnitCommand | null;
    menuCommands: UnitCommand[];
};

/**
 * Порядок важен: остановка и запуск — самые частые операции,
 * сборка и подготовка идут после них, обновление кода — последним.
 */
const PRIORITET_OSNOVNOI_KOMMANDI: UnitCommand[] = [
    "nachatOstanovku",
    "nachatZapusk",
    "nachatSborku",
    "nachatPodgotovku",
    "nachatObnovleniePosleZapuska",
    "nachatObnovlenie",
];

/**
 * Собирает единое визуальное состояние юнита.
 *
 * `zapushen`, `zanyat` и `tekushayaZadacha` приходят из помощников стора,
 * поэтому карточка и список используют ту же логику, что и действия.
 */
export function deriveUnitUiState(source: UnitStatusSource): UnitUiState {
    let status: UnitUiStatus;
    let labelKey: string;

    if (source.error) {
        status = "error";
        labelKey = "unit.spisok_unitov.status.error";
    } else if (source.zanyat) {
        status = "busy";
        labelKey = "unit.spisok_unitov.status.busy";
    } else if (source.zapushen) {
        status = "running";
        labelKey = "unit.spisok_unitov.status.running";
    } else if (source.commands.includes("nachatZapusk")) {
        status = "prepared";
        labelKey = "unit.spisok_unitov.status.prepared";
    } else {
        status = "stopped";
        labelKey = "unit.spisok_unitov.status.stopped";
    }

    // Пока идёт процесс, основного действия нет: сначала нужно дождаться
    // результата, а доступные команды остаются в меню.
    const primaryCommand = status === "busy"
        ? null
        : PRIORITET_OSNOVNOI_KOMMANDI.find((command: UnitCommand) => {
            return source.commands.includes(command);
        }) ?? null;

    return {
        status,
        labelKey,
        busyText: status === "busy" && source.tekushayaZadacha ? source.tekushayaZadacha : null,
        canOpenLinks: source.zapushen,
        primaryCommand,
        menuCommands: source.commands.filter((command: UnitCommand) => {
            return command !== primaryCommand;
        }),
    };
}
