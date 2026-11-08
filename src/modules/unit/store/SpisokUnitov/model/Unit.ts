import type {Schema} from "@/api/types";
import {StatusProzesa, StatusZadachi, TipProzesa, TipZadachi} from "@/modules/unit/store/SpisokUnitov/model/UnitEnums";

/**
 * Модели юнита — тонкие алиасы над схемами OpenAPI.
 * Отдельные классы не нужны: apiClient возвращает уже готовые объекты.
 */

export type Unit = Schema<"UnitListItem">;

export type Deistviye = Schema<"UnitAction">;

/**
 * Параметры выбора переменной-коллекции (CollectionOptions::toArray).
 * В спецификации `options` объявлен как произвольный объект, поэтому здесь
 * он уточняется до фактической структуры, которую отдаёт бэкенд.
 */
export type CollectionOptions = {
    options?: { id: string; name: string }[];
};

/**
 * Помощник подстановки ссылки на сервис другого юнита
 * (ConfigVariableHelper / PomoschnikSsylki::toArray).
 *
 * Поля могут быть `null`, если помощник задан не полностью.
 */
export type PomoschnikSsylki = Schema<"ConfigVariableHelper">;

type SOptions<T> = Omit<T, "options"> & { options: CollectionOptions | null };

/**
 * Переменная конфигурации юнита (UnitConfigVariable).
 *
 * `helper` в спецификации объявлен как произвольный объект, поэтому здесь
 * он уточняется до фактической структуры `ConfigVariableHelper`.
 */
export type KonfigPeremenoi = Omit<SOptions<Schema<"UnitConfigVariable">>, "helper"> & {
    helper: PomoschnikSsylki | null;
};

/** Переменная действия юнита (UnitActionVariable); помощник ей не предусмотрен. */
export type KonfigDeistviya = SOptions<Schema<"UnitActionVariable">>;

export type Peremenaya = Schema<"UnitVariableValue">;

export type Statistika = Schema<"ContainerStats">;

export type Link = Schema<"UnitLink">;

export type ZadachaUnitaBezShagov = Schema<"UnitProcessBriefJob">;

export type ProzesUnitaBezShagov = Schema<"UnitProcessBrief">;

export type {StatusProzesa, StatusZadachi, TipProzesa, TipZadachi};

/**
 * Значение переменной в форме заполнения.
 * Чисто UI-модель: хранит выбранную конфигурацию и текущее значение.
 */
export class PeremenayaKonfiga {
    konfig: KonfigPeremenoi;
    value: string;

    constructor(konfig: KonfigPeremenoi, value: string = "") {
        this.konfig = konfig;
        this.value = value.length > 0 ? value : konfig.defaultValue;
    }
}

/**
 * Том юнита из блока конфига `unitman_volumes` плюс привязанный файл медиатеки.
 *
 * `dir` — уникальный ключ тома, `name` — имя каталога, `fileId` — ид
 * zip-архива в медиатеке (`null`, пока файл не загружен). Тома больше не
 * связаны с переменными конфига: ид файла передаётся бэкенду в `volumes`.
 */
export type TomKonfiga = Schema<"UnitVolume">;

/**
 * Том в форме: описание из конфига и состояние загрузки файла.
 *
 * Чисто UI-модель. Хранится в состоянии Pinia, поэтому это обычный объект,
 * а не класс: у реактивного прокси экземпляров классов теряются методы.
 *
 * `volume.fileId` — ид файла в медиатеке (`null`, пока файл не загружен),
 * `zagruzka` и `oshibka` — состояние запроса к медиатеке.
 */
export type TomUnita = {
    volume: TomKonfiga;
    zagruzka: boolean;
    oshibka: string | null;
};

/** Создать строку тома для формы. */
export function sozdatTomUnita(volume: TomKonfiga): TomUnita {
    return {
        volume,
        zagruzka: false,
        oshibka: null,
    };
}
