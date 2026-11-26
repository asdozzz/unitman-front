import type { Page } from "@playwright/test";

/**
 * Сидирование сессии без реального логина.
 *
 * Auth-стор читает `localStorage.tokenData` при создании, а guard проверяет
 * срок действия JWT. Поэтому тесты кладут в хранилище настоящий по форме JWT
 * с далёким `exp` — приложение считает пользователя авторизованным и не
 * дёргает `/account/refreshToken`.
 */

export type UserRole = "admin" | "user";

export type SessionOverrides = {
  id?: string;
  email?: string;
  locale?: "ru" | "en";
  roles?: string[];
  tokenExpiresInSeconds?: number;
  activationPending?: boolean;
  emailVerified?: boolean;
};

export type SessionUser = {
  id: string;
  email: string;
  roles: string[];
  locale: "ru" | "en";
  activationPending?: boolean;
  emailVerified?: boolean;
};

export type TokenData = {
  token: string;
  refreshToken: string;
  user: SessionUser;
  expired: string | null;
};

/** Ключи фильтров и настроек, которые сбрасываются перед каждым тестом. */
export const STORAGE_KEYS_TO_RESET = [
  "tokenData",
  "FILTER_UNITOV_STORAGE_KEY",
  "FILTER_PROEKTOV_STORAGE_KEY",
  "FILTER_HRANILISH_STORAGE_KEY",
  "FILTER_POLZOVATELEI_STORAGE_KEY",
  "AppSettings",
] as const;

function base64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replace(/=+$/u, "")
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_");
}

/** JWT-подобная строка с произвольным payload (подпись не проверяется). */
export function fakeJwt(payload: Record<string, unknown>): string {
  return [
    base64url({ alg: "none", typ: "JWT" }),
    base64url(payload),
    "e2e-signature",
  ].join(".");
}

/** Собирает `tokenData` для администратора или обычного пользователя. */
export function tokenDataFor(
  role: UserRole,
  overrides: SessionOverrides = {},
): TokenData {
  const isAdmin = role === "admin";
  const user: SessionUser = {
    id:
      overrides.id ??
      (isAdmin
        ? "00000000-0000-4000-8000-000000000001"
        : "00000000-0000-4000-8000-000000000002"),
    email:
      overrides.email ??
      (isAdmin ? "admin@e2e.local" : "user@e2e.local"),
    roles:
      overrides.roles ?? (isAdmin ? ["ROLE_ADMIN", "ROLE_USER"] : ["ROLE_USER"]),
    locale: overrides.locale ?? "ru",
    activationPending: overrides.activationPending,
    emailVerified: overrides.emailVerified,
  };

  const exp =
    Math.floor(Date.now() / 1000) +
    (overrides.tokenExpiresInSeconds ?? 3600);

  return {
    token: fakeJwt({
      sub: user.id,
      email: user.email,
      roles: user.roles,
      exp,
    }),
    refreshToken: "e2e-refresh-token",
    user,
    expired: null,
  };
}

/**
 * Кладёт сессию в `localStorage` до загрузки приложения.
 *
 * `addInitScript` выполняется на каждой новой навигации, поэтому состояние
 * фильтров не протекает из предыдущего теста.
 */
export async function seedSession(
  page: Page,
  role: UserRole,
  overrides: SessionOverrides = {},
): Promise<TokenData> {
  const data = tokenDataFor(role, overrides);

  await page.addInitScript(
    (payload: { tokenData: TokenData; keys: readonly string[] }) => {
      try {
        payload.keys.forEach((key) => window.localStorage.removeItem(key));
        window.localStorage.setItem(
          "tokenData",
          JSON.stringify(payload.tokenData),
        );
        window.localStorage.setItem(
          "AppSettings",
          JSON.stringify({
            leftDrawerOpen: false,
            sidebarCollapsed: false,
            darkMode: false,
          }),
        );
      } catch {
        // `about:blank` и другие opaque-origin документы не имеют storage.
      }
    },
    { tokenData: data, keys: STORAGE_KEYS_TO_RESET },
  );

  return data;
}

/** Полностью очищает сессию и локальное состояние приложения. */
export async function clearSession(page: Page): Promise<void> {
  await page.addInitScript((keys: readonly string[]) => {
    try {
      keys.forEach((key) => window.localStorage.removeItem(key));
      window.localStorage.removeItem("tokenData");
      window.localStorage.setItem(
        "AppSettings",
        JSON.stringify({
          leftDrawerOpen: false,
          sidebarCollapsed: false,
          darkMode: false,
        }),
      );
    } catch {
      // См. комментарий в `seedSession`.
    }
  }, STORAGE_KEYS_TO_RESET);
}
