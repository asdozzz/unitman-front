/**
 * Чистые функции нормализации ошибок AI-чата.
 *
 * Модуль намеренно не содержит runtime-импортов (только типы), чтобы его
 * логику можно было проверить отдельным Node-скриптом без сборки всего
 * приложения и без новых зависимостей. Извлечение текста ошибки upstream
 * отделено от `AiChatService`, потому что это единственная часть, которую
 * нужно покрывать тестами детально.
 */

import type {AiChatErrorKey} from '@/modules/ai-chat/model/types';

/**
 * Ключи ошибок по HTTP-статусу бэкенда — запасной вариант, если в теле ответа
 * не пришёл `code`. Значения соответствуют контроллеру
 * `AiChatController::oshibka()`; это ключи, а не готовые фразы.
 */
const FALLBACK_ERROR_KEYS: Record<number, AiChatErrorKey> = {
    401: 'account.not_authenticated',
    422: 'ai.chat.invalid_payload',
    502: 'ai.chat.upstream_unavailable',
};

/** Ключ для прочих ответов `4xx/5xx` без распознанного кода. */
const UPSTREAM_ERROR_KEY: AiChatErrorKey = 'ai.chat.upstream_error';

/** Проверка «обычный» объект (не `null` и не массив). */
function estObektom(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Возвращает непустую строку без обрамляющих пробелов либо `null`. */
function prochitatNepustuyuStroku(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();

    return trimmed === '' ? null : trimmed;
}

/**
 * Извлекает текст ошибки upstream из тела ответа.
 *
 * Приоритет полей:
 * 1. `error.message` — канонический формат OpenAI-совместимых провайдеров;
 * 2. `message` — плоское сообщение бэкенда;
 * 3. `data.message` — сообщение внутри конверта бэкенда;
 * 4. `data.error.message` — ошибка провайдера внутри конверта.
 *
 * Не-строковые значения, пустые строки и строки из одних пробелов
 * игнорируются. Для не-объектного тела (включая строку) возвращается `null`.
 */
export function izvlechDetaliOshibki(data: unknown): string | null {
    if (!estObektom(data)) {
        return null;
    }

    const dataEnvelope = estObektom(data.data) ? data.data : null;

    const kandidaty: unknown[] = [
        estObektom(data.error) ? data.error.message : null,
        data.message,
        dataEnvelope !== null ? dataEnvelope.message : null,
        dataEnvelope !== null && estObektom(dataEnvelope.error)
            ? dataEnvelope.error.message
            : null,
    ];

    for (const kandidat of kandidaty) {
        const stroka = prochitatNepustuyuStroku(kandidat);

        if (stroka !== null) {
            return stroka;
        }
    }

    return null;
}

/**
 * Извлекает стабильный ключ ошибки из тела ответа.
 *
 * Поддерживает три формы: конверт бэкенда `{data: {code}}`, плоский
 * `{code}` и ошибку upstream `{error: {code}}`.
 */
function prochitatKlyuchOshibki(data: unknown): AiChatErrorKey | null {
    if (!estObektom(data)) {
        return null;
    }

    if (estObektom(data.data) && typeof data.data.code === 'string' && data.data.code !== '') {
        return data.data.code;
    }

    if (typeof data.code === 'string' && data.code !== '') {
        return data.code;
    }

    if (estObektom(data.error) && typeof data.error.code === 'string' && data.error.code !== '') {
        return data.error.code;
    }

    return null;
}

/** Результат нормализации ошибочного ответа AI-чата. */
export interface NormalizedAiChatError {
    errorKey: AiChatErrorKey | null;
    errorDetails: string | null;
}

/**
 * Нормализует ошибочный ответ: ключ для перевода и текст провайдера.
 *
 * Ключ выбирается так: `code` из тела → известный статус (`401/422/502`) →
 * `ai.chat.upstream_error` для прочих `4xx/5xx` → `null`.
 */
export function normalizovatOshibkuChat(
    status: number,
    data: unknown,
): NormalizedAiChatError {
    const klyuchIzTela = prochitatKlyuchOshibki(data);
    const klyuchIzStatusa = FALLBACK_ERROR_KEYS[status] ?? null;
    const zapasnoyKlyuch = status >= 400 ? UPSTREAM_ERROR_KEY : null;

    return {
        errorKey: klyuchIzTela ?? klyuchIzStatusa ?? zapasnoyKlyuch,
        errorDetails: izvlechDetaliOshibki(data),
    };
}
