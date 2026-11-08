import type {Schema} from "@/api/types";

/**
 * Тип тома проекта с привязанными архивами (`VolumeTypeList::toArray`).
 *
 * `code` совпадает с `dir` тома в конфиге юнита, `files` — архивы каталога
 * проекта, доступные для подстановки в том при создании юнита.
 */
export type TipToma = Schema<"VolumeTypeList">;

/** Архив, привязанный к типу тома (`VolumeTypeFileItem::toArray`). */
export type FaylTipaToma = Schema<"UnitmanVolumeTypeFile">;
