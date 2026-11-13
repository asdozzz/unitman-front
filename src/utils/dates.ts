import dayjs from "dayjs";
import {format, fromUnixTime} from "date-fns";
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

/**
 * Верхняя граница unix-времени в секундах — ровно предел диапазона `Date`.
 * Всё, что больше, уже не дата, а мусор в данных.
 */
const MAKSIMALNIY_UNIXTIME = 8.64e12;

/** Всё, что может прийти в поле времени с бэкенда: число, числовая строка либо пустое значение. */
export type UnixTimeVhod = number | string | null | undefined;

/**
 * Приводит пришедшее время к корректному unix-времени в секундах.
 *
 * Бэкенд может прислать `null`, отсутствующее поле, `0`, `NaN`, числовую строку
 * или совсем постороннее значение. Любое из них должно превращаться в `null`,
 * а не падать при форматировании: `fromUnixTime(NaN)` бросает `RangeError`
 * и ломает рендер всего списка.
 *
 * @param unixtime исходное значение из API
 * @returns unix-секунды либо `null`, если значение непригодно
 */
export function normalizovatUnixTime(unixtime: UnixTimeVhod): number | null {
    if (unixtime === null || unixtime === undefined) {
        return null;
    }

    const chislo = typeof unixtime === 'number' ? unixtime : Number(String(unixtime).trim());

    if (!Number.isFinite(chislo)) {
        return null;
    }

    // `0` и отрицательные значения трактуются как «время не задано».
    if (chislo <= 0 || chislo > MAKSIMALNIY_UNIXTIME) {
        return null;
    }

    return chislo;
}

/**
 * Относительное время («5 минут назад»).
 *
 * @param unixtime unix-секунды из API
 * @returns текст либо пустая строка, если дата невалидна
 */
export function convertDate(unixtime: UnixTimeVhod): string {
    const sekundi = normalizovatUnixTime(unixtime);

    if (sekundi === null) {
        return '';
    }

    return dayjs(fromUnixTime(sekundi)).fromNow();
}

/**
 * Дата и время в формате `dd.MM.yyyy H:mm:ss`.
 *
 * @param unixtime unix-секунды из API
 * @returns текст либо пустая строка, если дата невалидна
 */
export function convertDateTime(unixtime: UnixTimeVhod): string {
    const sekundi = normalizovatUnixTime(unixtime);

    if (sekundi === null) {
        return '';
    }

    return format(fromUnixTime(sekundi), 'dd.MM.yyyy H:mm:ss');
}

/**
 * Только время в формате `H:mm:ss`.
 *
 * @param unixtime unix-секунды из API
 * @returns текст либо пустая строка, если дата невалидна
 */
export function convertTime(unixtime: UnixTimeVhod): string {
    const sekundi = normalizovatUnixTime(unixtime);

    if (sekundi === null) {
        return '';
    }

    return format(fromUnixTime(sekundi), 'H:mm:ss');
}

/** Минимум полей шага, нужный для расчёта длительности. */
export type ShagSDlitelnostyu = {
    /** Время окончания шага, unix-секунды. */
    unixtime: number;
    /** Время начала шага, unix-секунды. Отсутствует у старых записей и у старого раннера. */
    unixtimeStart?: number | null;
};

/**
 * Длительность шага в секундах.
 *
 * Основной источник — `unixtimeStart`: длительность равна `unixtime - unixtimeStart`
 * и не включает паузы между шагами. Если поле отсутствует (старые записи в БД,
 * старый раннер), используется прежний алгоритм — разница с `unixtime`
 * предыдущего шага. Для первого шага без `unixtimeStart` вернётся `null`:
 * посчитать длительность не из чего.
 *
 * @param shag текущий шаг
 * @param preidushiy предыдущий шаг (нужен только для обратной совместимости)
 * @returns длительность в секундах (не меньше нуля) либо `null`
 */
export function dlitelnostShaga(
    shag: ShagSDlitelnostyu,
    preidushiy?: ShagSDlitelnostyu | null,
): number | null {
    if (!Number.isFinite(shag.unixtime)) {
        return null;
    }

    const nachalo = shag.unixtimeStart;

    // `0` считаем отсутствующим значением: так же трактуется `updatedAt` в прогрессе.
    if (typeof nachalo === 'number' && Number.isFinite(nachalo) && nachalo > 0) {
        // Отрицательная разница возможна при рассинхроне часов — не показываем её.
        return Math.max(0, Math.round(shag.unixtime - nachalo));
    }

    const konecPreidushego = preidushiy?.unixtime;

    if (typeof konecPreidushego === 'number' && Number.isFinite(konecPreidushego) && konecPreidushego > 0) {
        return Math.max(0, Math.round(shag.unixtime - konecPreidushego));
    }

    return null;
}
