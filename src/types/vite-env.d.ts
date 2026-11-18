import type { RuntimeEnvKey, RuntimeEnvValue } from '@/utils/runtimeEnv';

declare global {
    interface Window {
        /**
         * Настройки, которые entry.sh записывает в `/env-config.js` при старте
         * контейнера. Ключи, не заданные в окружении, отсутствуют или равны
         * `null` (шаблон для dev-сервера).
         */
        _env_?: Partial<Record<RuntimeEnvKey, RuntimeEnvValue>>;
    }
}

export {};
