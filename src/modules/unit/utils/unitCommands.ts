import type {UnitCommand} from "@/modules/unit/utils/unitStatus";

/**
 * Минимальный контракт стора, нужный реестру команд.
 *
 * Отдельный тип позволяет не тянуть весь стор списка в утилиту
 * и использовать реестр в карточке и в строке действий.
 */
export type DeistviyaNadUnitom = {
    sobratMoiUnit: (id: string) => Promise<unknown>;
    obnovitKodMoegoUnita: (id: string) => Promise<unknown>;
    podgotovitMoiUnit: (id: string) => Promise<unknown>;
    sbrositPodgotovkuMoegoUnita: (id: string) => Promise<unknown>;
    zapustitMoiUnit: (id: string) => Promise<unknown>;
    ostanovitMoiUnit: (id: string) => Promise<unknown>;
    proveritKonteinerUnita: (id: string) => Promise<unknown>;
};

/** Описание пункта меню/кнопки команды. */
export type KnopkaKomandi = {
    icon: string;
    labelKey: string;
    run: () => void | Promise<unknown>;
};

/**
 * Порядок команд жизненного цикла в меню.
 *
 * Порядок важен для сканируемости: сначала сборка и обновление кода,
 * затем подготовка, запуск/остановка и в конце проверка контейнера.
 */
export const POROZHDOK_KOMAND_ZHIZNENNOGO_CIKLA: readonly UnitCommand[] = [
    "nachatSborku",
    "nachatObnovlenie",
    "nachatObnovleniePosleZapuska",
    "nachatPodgotovku",
    "nachatSbrosPodgotovki",
    "nachatZapusk",
    "nachatOstanovku",
    "proveritKonteinerUnita",
];

/**
 * Единый реестр поддерживаемых команд.
 *
 * Команды, которых здесь нет (`ustanovitResultat…`, `nachatUdalenie…`),
 * не показываются — ровно как в прежней реализации действий.
 */
export function sozdatReestrKomand(
    deistviya: DeistviyaNadUnitom,
    unitId: string,
): Partial<Record<UnitCommand, KnopkaKomandi>> {
    return {
        nachatSborku: {
            icon: "build",
            labelKey: "unit.spisok_unitov.card.buttons.build",
            run: () => deistviya.sobratMoiUnit(unitId),
        },
        nachatObnovlenie: {
            icon: "update",
            labelKey: "unit.spisok_unitov.card.buttons.fetch_changes",
            run: () => deistviya.obnovitKodMoegoUnita(unitId),
        },
        nachatObnovleniePosleZapuska: {
            icon: "update",
            labelKey: "unit.spisok_unitov.card.buttons.fetch_changes",
            run: () => deistviya.obnovitKodMoegoUnita(unitId),
        },
        nachatPodgotovku: {
            icon: "done_all",
            labelKey: "unit.spisok_unitov.card.buttons.preparing",
            run: () => deistviya.podgotovitMoiUnit(unitId),
        },
        nachatSbrosPodgotovki: {
            icon: "remove_done",
            labelKey: "unit.spisok_unitov.card.buttons.remove_preparing",
            run: () => deistviya.sbrositPodgotovkuMoegoUnita(unitId),
        },
        nachatZapusk: {
            icon: "play_arrow",
            labelKey: "unit.spisok_unitov.card.buttons.up",
            run: () => deistviya.zapustitMoiUnit(unitId),
        },
        nachatOstanovku: {
            icon: "stop",
            labelKey: "unit.spisok_unitov.card.buttons.down",
            run: () => deistviya.ostanovitMoiUnit(unitId),
        },
        proveritKonteinerUnita: {
            icon: "sync",
            labelKey: "unit.spisok_unitov.card.buttons.check_container",
            run: () => deistviya.proveritKonteinerUnita(unitId),
        },
    };
}
