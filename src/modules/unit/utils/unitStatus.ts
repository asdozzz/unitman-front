import type {StatusProzesa, StatusZadachi} from "@/modules/unit/store/SpisokUnitov/model/UnitEnums";
import type {Unit} from "@/modules/unit/store/SpisokUnitov/model/Unit";

/**
 * Процесс и задача в том виде, в каком они приходят в `UnitListItem.prozesi`
 * (схемы `UnitProcess` и `UnitProcessJob`). Отдельные алиасы нужны, чтобы
 * функции работали и с данными списка, и с ответом `obnovit`.
 */
export type ProzesUnitaSpiska = Unit["prozesi"][number];
export type ZadachaProzesaUnitaSpiska = ProzesUnitaSpiska["jobs"][number];

/** Команда, которую бэкенд разрешает юниту в текущем состоянии. */
export type UnitCommand = Unit["commands"][number];

/** Визуальное состояние карточки, вычисленное из данных юнита. */
export type UnitUiStatus = "running" | "busy" | "prepared" | "stopped" | "error" | "broken";

/**
 * Терминальные состояния задачи: дальше задача не перейдёт.
 *
 * `CANCLED` тоже терминален: отменённый процесс не должен держать лоадер
 * «в работе» бесконечно.
 */
export const ZAVERSHENNIE_STATUSI_ZADACHI: readonly StatusZadachi[] = [
    "SUCCESS",
    "ERROR",
    "CANCLED",
];

/**
 * Терминальные состояния процесса.
 *
 * `NEW`, `ZADACHI_DOBAVLENI` и `PENDING` означают незавершённую работу.
 */
export const ZAVERSHENNIE_STATUSI_PROZESA: readonly StatusProzesa[] = [
    "SUCCESS",
    "ERROR",
    "CANCLED",
];

/** Прогресс активного процесса: сколько задач завершено из общего числа. */
export type UnitProcessProgress = {
    vsego: number;
    zaversheno: number;
};

/** Задача завершилась и больше не держит процесс «в работе». */
export function zavershenaZadacha(state: StatusZadachi): boolean {
    return ZAVERSHENNIE_STATUSI_ZADACHI.includes(state);
}

/** Процесс завершён (успех, ошибка или отмена). */
export function zavershenProzes(state: StatusProzesa): boolean {
    return ZAVERSHENNIE_STATUSI_PROZESA.includes(state);
}

/**
 * Активен ли хотя бы один процесс юнита.
 *
 * Правило: процесс «в работе», пока хотя бы одна его задача не завершена.
 * Если задач ещё нет (процесс только создан), ориентируемся на состояние
 * процесса — иначе между созданием процесса и добавлением задач лоадер
 * на мгновение пропадал бы.
 */
export function estAktivniyProzes(prozesi: ProzesUnitaSpiska[]): boolean {
    return prozesi.some((prozes: ProzesUnitaSpiska) => {
        if (prozes.jobs.length === 0) {
            return !zavershenProzes(prozes.state);
        }

        return prozes.jobs.some((zadacha: ZadachaProzesaUnitaSpiska) => {
            return !zavershenaZadacha(zadacha.state);
        });
    });
}

/**
 * Тип первой незавершённой задачи среди всех процессов.
 * `null`, если незавершённых задач нет.
 */
export function nazvanieAktivnoiZadachi(prozesi: ProzesUnitaSpiska[]): string | null {
    for (const prozes of prozesi) {
        for (const zadacha of prozes.jobs) {
            if (!zavershenaZadacha(zadacha.state)) {
                return zadacha.type;
            }
        }
    }

    return null;
}

/**
 * Прогресс первого активного процесса.
 * `null`, если активных процессов нет.
 */
export function progressProzesa(prozesi: ProzesUnitaSpiska[]): UnitProcessProgress | null {
    const aktivniy = prozesi.find((prozes: ProzesUnitaSpiska) => {
        return prozes.jobs.some((zadacha: ZadachaProzesaUnitaSpiska) => {
            return !zavershenaZadacha(zadacha.state);
        });
    });

    if (aktivniy === undefined) {
        return null;
    }

    return {
        vsego: aktivniy.jobs.length,
        zaversheno: aktivniy.jobs.filter((zadacha: ZadachaProzesaUnitaSpiska) => {
            return zavershenaZadacha(zadacha.state);
        }).length,
    };
}

/**
 * Флаги, которые карточка получает из помощников стора.
 *
 * Отдельный объект позволяет держать вычисление состояния чистой функцией
 * и не дублировать условия `zapushen` / `esliJdemRunner` в компонентах.
 */
export type UnitStatusSource = {
    zapushen: boolean;
    error: boolean;
    /** Внешняя занятость: захват OpenCode и другие причины помимо процесса. */
    zanyat: boolean;
    /** Есть незавершённый процесс — источник лоадера «в работе». */
    prozesAktiven: boolean;
    tekushayaZadacha: string | null;
    progress: UnitProcessProgress | null;
    commands: UnitCommand[];
};

export type UnitUiState = {
    status: UnitUiStatus;
    labelKey: string;
    busyText: string | null;
    prozesAktiven: boolean;
    progress: UnitProcessProgress | null;
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
    // Процесс и внешний захват одинаково блокируют действия, поэтому
    // для визуального статуса они равнозначны.
    const zanyat = source.zanyat || source.prozesAktiven;

    let status: UnitUiStatus;
    let labelKey: string;

    if (source.error) {
        status = "error";
        labelKey = "unit.spisok_unitov.card.status.error";
    } else if (zanyat) {
        status = "busy";
        labelKey = "unit.spisok_unitov.card.status.busy";
    } else if (source.zapushen) {
        status = "running";
        labelKey = "unit.spisok_unitov.card.status.running";
    } else if (source.commands.includes("nachatZapusk")) {
        status = "prepared";
        labelKey = "unit.spisok_unitov.card.status.prepared";
    } else {
        status = "stopped";
        labelKey = "unit.spisok_unitov.card.status.stopped";
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
        prozesAktiven: source.prozesAktiven,
        progress: source.prozesAktiven ? source.progress : null,
        canOpenLinks: source.zapushen,
        primaryCommand,
        menuCommands: source.commands.filter((command: UnitCommand) => {
            return command !== primaryCommand;
        }),
    };
}
