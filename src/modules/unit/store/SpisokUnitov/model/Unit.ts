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

type SOptions<T> = Omit<T, "options"> & { options: CollectionOptions | null };

/** Переменная конфигурации юнита (UnitConfigVariable). */
export type KonfigPeremenoi = SOptions<Schema<"UnitConfigVariable">>;

/** Переменная действия юнита (UnitActionVariable). */
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
