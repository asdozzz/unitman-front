import type {Schema} from "@/api/types";
import {StatusProzesa, StatusZadachi, TipProzesa, TipZadachi} from "@/modules/unit/store/SpisokUnitov/model/UnitEnums";
import type {FaylTipaToma} from "@/modules/unit/store/SpisokProektov/model/TipToma";

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

/**
 * Связь переменной конфига юнита с юнитом, выбранным через помощник.
 *
 * Отправляется в `ZapolnitPeremenieUnita.svyazi`: непустой список полностью
 * заменяет набор связей юнита, пустой — оставляет связи без изменений.
 */
export type SvyazPeremenoi = Schema<"SvyazPeremenoi">;

/**
 * Связь юнита с другим юнитом, выбранным через помощник переменной
 * (проекция `svyazi_unitov`).
 *
 * Приходит в read-модели списка юнитов (`UnitListItem.svyazi`). Одна связь
 * описывает одну переменную конфига: несколько переменных могут указывать
 * на один и тот же целевой юнит, поэтому для бейджей связи группируются
 * по `targetUnitId`.
 */
export type SvyazUnita = Schema<"UnitSvyaz">;

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
    /**
     * Юнит, зафиксированный при подстановке значения из помощника.
     *
     * Уходит на бэкенд как `ZnacheniePeremenoi.targetUnitId` (создание юнита
     * и заполнение переменных), поэтому по нему строятся связи юнитов
     * в read-модели списка.
     */
    targetUnitId: string | null;
    /**
     * Имя зафиксированного юнита — только для подписи в форме,
     * на бэкенд не отправляется.
     */
    targetUnitName: string | null;
    /**
     * Пользователь изменил связь в текущей сессии формы.
     *
     * Нужно, чтобы отправить `targetUnitId: null` при снятии связи:
     * `svyazi: []` на бэкенде означает «связи не меняются», поэтому
     * удаление последней связи иначе до бэкенда не дойдёт.
     */
    svyazIzmenena: boolean;

    constructor(
        konfig: KonfigPeremenoi,
        value: string = "",
        targetUnitId: string | null = null,
        targetUnitName: string | null = null,
    ) {
        this.konfig = konfig;
        this.value = value.length > 0 ? value : konfig.defaultValue;
        this.targetUnitId = targetUnitId;
        this.targetUnitName = targetUnitName;
        this.svyazIzmenena = false;
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
 *
 * `faylyProekta` — архивы каталога типов томов проекта, у которых `code`
 * совпадает с `dir` тома: их можно подставить в том нажатием на бейдж.
 * `izProekta` — выбран именно архив проекта: такой файл принадлежит
 * проекту, поэтому его нельзя удалить, но можно очистить поле.
 */
export type TomUnita = {
    volume: TomKonfiga;
    zagruzka: boolean;
    oshibka: string | null;
    faylyProekta: FaylTipaToma[];
    izProekta: boolean;
};

/** Создать строку тома для формы. */
export function sozdatTomUnita(volume: TomKonfiga, faylyProekta: FaylTipaToma[] = []): TomUnita {
    return {
        volume,
        zagruzka: false,
        oshibka: null,
        faylyProekta,
        izProekta: false,
    };
}
