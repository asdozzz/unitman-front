/**
 * Утилиты разбора JWT.
 *
 * Токен нужен только для того, чтобы понять, истёк ли срок действия,
 * поэтому подпись не проверяется — это задача бэкенда. Payload (claims)
 * читается из base64url-сегмента без внешних зависимостей.
 */

/** Полезная нагрузка JWT с полями, которые использует фронтенд. */
export type JwtPayload = {
    /** Время истечения, unix-время в секундах. */
    exp?: number;
    /** Время выпуска, unix-время в секундах. */
    iat?: number;
    [claim: string]: unknown;
}

/**
 * Декодирование payload JWT.
 *
 * Возвращает `null`, если токен не похож на JWT или payload не является
 * корректным JSON-объектом.
 */
export function decodeJwtPayload(token: string | null | undefined): JwtPayload | null {
    if (!token) {
        return null;
    }

    const parts = token.split('.');

    if (parts.length !== 3) {
        return null;
    }

    try {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
        // atob возвращает «binary string»; для UTF-8 claims его нужно перекодировать.
        const binary = atob(padded);
        const bytes = Uint8Array.from(binary, (char: string): number => char.charCodeAt(0));
        const json = new TextDecoder('utf-8').decode(bytes);
        const payload: unknown = JSON.parse(json);

        if (typeof payload !== 'object' || payload === null) {
            return null;
        }

        return payload as JwtPayload;
    } catch {
        return null;
    }
}

/**
 * Момент истечения токена в миллисекундах или `null`, если токен
 * не содержит `exp` / не разбирается.
 */
export function getTokenExpiresAt(token: string | null | undefined): number | null {
    const payload = decodeJwtPayload(token);

    if (!payload || typeof payload.exp !== 'number') {
        return null;
    }

    return payload.exp * 1000;
}

/**
 * Проверка, истёк ли токен.
 *
 * @param token JWT
 * @param leewayMs Допустимый запас в миллисекундах: токен считается истёкшим
 *                 заблаговременно, чтобы не отправить запрос со «свежим»,
 *                 но уже просроченным на момент обработки токеном.
 *
 * Токены без разбираемого `exp` считаются валидными: решение принимает бэкенд,
 * а `apiClient` дополнительно повторит запрос после 401.
 */
export function isTokenExpired(token: string | null | undefined, leewayMs = 0): boolean {
    const expiresAt = getTokenExpiresAt(token);

    if (expiresAt === null) {
        return false;
    }

    return expiresAt - leewayMs <= Date.now();
}
