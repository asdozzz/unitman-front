/**
 * Отладочный логгер событий прогресса задачи runner'а.
 *
 * События канала `unit_progress#<jobId>` приходят асинхронно и на каждом шаге
 * обработки могут быть «тихо» отброшены: форма payload'а не совпала,
 * `jobId` оказался чужим, `updatedAt` не новее применённого, наблюдение уже
 * закрыто после `finished`. Без лога невозможно отличить «событие не дошло»
 * от «дошло, но было отброшено», поэтому все точки ветвления пишут сюда.
 *
 * Логи включены по умолчанию. Выключить можно переменной окружения
 * `VITE_DEBUG_PROGRESS=false` — в `.env` (`import.meta.env`) или при запуске
 * контейнера (`docker run -e`, `window._env_`).
 */
import { debugProgress } from '@/utils/runtimeEnv';

const PREFIX = '[unit_progress]';

/** Максимальная длина значения в логе: payload может быть очень большим. */
const MAKSIMALNAYA_DLINA_ZNACHENIYA = 400;

/**
 * Проверка флага отладки.
 *
 * Читается лениво (в момент записи): `window._env_` заполняется скриптом
 * `env-config.js` уже после загрузки модуля, а `runtimeEnv` смотрит в него
 * при каждом вызове.
 */
function otladkaViklyuchena(): boolean {
    return !debugProgress();
}

/** Обрезать длинное значение, чтобы лог оставался читаемым. */
export function obrezatDlinnoe(znachenie: string, maksimum = MAKSIMALNAYA_DLINA_ZNACHENIYA): string {
    if (znachenie.length <= maksimum) {
        return znachenie;
    }

    return `${znachenie.slice(0, maksimum)}… (всего ${znachenie.length} символов)`;
}

/** Информационная запись: штатное прохождение события. */
export function logProgressa(soobshenie: string, dannie?: unknown): void {
    if (otladkaViklyuchena()) {
        return;
    }

    if (dannie === undefined) {
        console.info(`${PREFIX} ${soobshenie}`);

        return;
    }

    console.info(`${PREFIX} ${soobshenie}`, dannie);
}

/** Предупреждение: событие дошло, но было отброшено (самая частая причина «стор не обновляется»). */
export function logProgressaPreduprezhdenie(soobshenie: string, dannie?: unknown): void {
    if (otladkaViklyuchena()) {
        return;
    }

    if (dannie === undefined) {
        console.warn(`${PREFIX} ${soobshenie}`);

        return;
    }

    console.warn(`${PREFIX} ${soobshenie}`, dannie);
}

/** Ошибка: событие не удалось даже разобрать. */
export function logProgressaOshibka(soobshenie: string, dannie?: unknown): void {
    if (otladkaViklyuchena()) {
        return;
    }

    if (dannie === undefined) {
        console.error(`${PREFIX} ${soobshenie}`);

        return;
    }

    console.error(`${PREFIX} ${soobshenie}`, dannie);
}

/**
 * Короткое описание формы payload'а.
 *
 * Нужно, чтобы по логу было видно не только «payload не подошёл», но и что
 * именно пришло: `updatedAt` строкой, `finished` числом `0/1`, отсутствие
 * `steps` и т.п.
 */
export function opisatPayload(dannie: unknown): Record<string, unknown> {
    if (dannie === null) {
        return {tip: 'null'};
    }

    if (typeof dannie !== 'object') {
        return {
            tip: typeof dannie,
            znachenie: typeof dannie === 'string' ? obrezatDlinnoe(dannie) : String(dannie),
        };
    }

    const zapis = dannie as Record<string, unknown>;
    const shagi = zapis['steps'];

    return {
        kluchi: Object.keys(zapis),
        jobId: zapis['jobId'],
        finished: zapis['finished'],
        success: zapis['success'],
        updatedAt: zapis['updatedAt'],
        tipUpdatedAt: typeof zapis['updatedAt'],
        kolichestvoShagov: Array.isArray(shagi) ? shagi.length : null,
        tipShagov: Array.isArray(shagi) ? 'array' : typeof shagi,
    };
}
