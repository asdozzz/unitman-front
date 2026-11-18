/**
 * Доступ к настройкам, которые можно задать при запуске контейнера.
 *
 * На сборке Vite инлайнит значения в `import.meta.env`, а `entry.sh` при старте
 * контейнера генерирует `/env-config.js` и заполняет `window._env_`. Приоритет
 * у runtime-значений: один и тот же образ подключается к разным бэкендам без
 * пересборки.
 */

/** Ключи, которые поддерживаются в `env-config.js`. */
export type RuntimeEnvKey =
    | 'VITE_API_HOST'
    | 'VITE_CENTRIFUGE_HOST'
    | 'VITE_DEBUG_PROGRESS';

/**
 * Значение из `window._env_`.
 *
 * Строка приходит из контейнера, `null` — из шаблона `env-config.js`, который
 * используется dev-сервером. Флаг отладки допускает boolean в шаблоне.
 */
export type RuntimeEnvValue = string | boolean | null;

/** Запечённые при сборке значения. */
const BUILD_ENV: Record<RuntimeEnvKey, string | undefined> = {
    VITE_API_HOST: import.meta.env.VITE_API_HOST,
    VITE_CENTRIFUGE_HOST: import.meta.env.VITE_CENTRIFUGE_HOST,
    VITE_DEBUG_PROGRESS: import.meta.env.VITE_DEBUG_PROGRESS,
};

/**
 * Значение настройки: runtime-переопределение, затем значение сборки.
 *
 * Пустая строка считается отсутствующим значением: `entry.sh` не пишет
 * незаполненные ключи, а шаблон может содержать `null`.
 */
export function runtimeEnv(key: RuntimeEnvKey): string | undefined {
    if (typeof window !== 'undefined') {
        const izOkruzheniya = window._env_?.[key];

        if (typeof izOkruzheniya === 'string' && izOkruzheniya !== '') {
            return izOkruzheniya;
        }

        if (typeof izOkruzheniya === 'boolean') {
            return String(izOkruzheniya);
        }
    }

    return BUILD_ENV[key];
}

/**
 * Базовый URL API для axios и ссылок в интерфейсе.
 *
 * Пустая строка означает относительные запросы к тому же origin — это рабочий
 * сценарий, когда API проксируется тем же nginx.
 */
export function apiHost(): string {
    return runtimeEnv('VITE_API_HOST') ?? '';
}

/** Адрес Centrifugo. */
export function centrifugeHost(): string {
    return runtimeEnv('VITE_CENTRIFUGE_HOST') ?? '';
}

/** Включён ли диагностический лог прогресса задачи. */
export function debugProgress(): boolean {
    return runtimeEnv('VITE_DEBUG_PROGRESS') !== 'false';
}
