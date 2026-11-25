import { test as base, expect, type Page } from "@playwright/test";
import { ApiMock } from "./api";
import { installDefaultMocks } from "./defaults";
import {
  clearSession,
  seedSession,
  type SessionOverrides,
  type UserRole,
} from "./session";

/** Хелперы для управления тестовой сессией. */
export type SessionApi = {
  loginAs(role: UserRole, overrides?: SessionOverrides): Promise<void>;
  logout(): Promise<void>;
};

export type E2EFixtures = {
  /** Мок HTTP API, привязанный к странице теста. */
  api: ApiMock;
  /** Сидирование/сброс авторизации до загрузки приложения. */
  session: SessionApi;
};

/**
 * Тестовая фикстура Playwright.
 *
 * Подменяет `/env-config.js`, чтобы приложение гарантированно ходило в
 * относительный `/api` независимо от переменных сборки, и мокает WebSocket
 * Centrifugo: e2e не проверяют realtime-доставку.
 */
export const test = base.extend<E2EFixtures>({
  // `auto: true` — базовые моки ставятся всегда, даже если тест не запросил
  // фикстуру `api` (например, AI-чат проверяет только тексты без override).
  api: [
    async ({ context, page }, use) => {
      const api = new ApiMock();

    await page.route("**/env-config.js", async (route) => {
      await route.fulfill({
        contentType: "application/javascript",
        body: [
          "window._env_ = {",
          '  VITE_API_HOST: "/api",',
          '  VITE_CENTRIFUGE_HOST: "ws://127.0.0.1:5180/connection/websocket",',
          '  VITE_DEBUG_PROGRESS: "false"',
          "};",
        ].join("\n"),
      });
    });

      await api.install(context);

      await routeWebSocket(page, /connection\/websocket/);

      installDefaultMocks(api);

      await use(api);

      api.reset();
    },
    { auto: true },
  ],

  session: async ({ page }, use) => {
    const session: SessionApi = {
      async loginAs(role, overrides) {
        await seedSession(page, role, overrides);
      },
      async logout() {
        await clearSession(page);
      },
    };

    await use(session);
  },
});

/**
 * Гасит WebSocket-соединение Centrifugo.
 *
 * Если версия Playwright не поддерживает `routeWebSocket`, соединение просто
 * не установится (адрес указывает на закрытый порт); тесты от этого не зависят.
 */
async function routeWebSocket(page: Page, url: RegExp): Promise<void> {
  const pageWithWebSocket = page as Page & {
    routeWebSocket?: (
      pattern: RegExp,
      handler: () => void,
    ) => Promise<void>;
  };

  if (typeof pageWithWebSocket.routeWebSocket !== "function") {
    return;
  }

  await pageWithWebSocket.routeWebSocket(url, () => {
    // Сообщения не пересылаются: для UI это «тихий» сокет без событий.
  });
}

export { expect };
