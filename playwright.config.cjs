/* eslint-disable */
/**
 * Конфигурация e2e-тестов интерфейса Unitman.
 *
 * Файл в формате CommonJS: `package.json` объявляет `"type": "module"`, а
 * Node.js 20 не умеет загружать `.ts`-конфиг в ESM-режиме. CJS-конфиг
 * загружается Playwright без транспиляции, тесты при этом остаются на TS.
 *
 * Тесты работают против Vite dev server, а бэкенд полностью заменён моками
 * HTTP API (см. `e2e/support/api.ts`). Это позволяет прогонять сценарии без
 * PostgreSQL, Temporal, RoadRunner и Centrifugo.
 *
 * Переменная `E2E_BASE_URL` позволяет направить тесты на уже поднятое
 * приложение (например, контейнер `unitman-front`) и отключить `webServer`.
 */
const { defineConfig, devices } = require("@playwright/test");

const PORT = Number(process.env.E2E_PORT || 5173);
const BASE_URL = process.env.E2E_BASE_URL || `http://127.0.0.1:${PORT}`;

module.exports = defineConfig({
  testDir: "./e2e/tests",
  outputDir: "./e2e/.artifacts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // Повторы включены и локально: Chromium в этом окружении периодически
  // прерывает загрузку модулей Vite с `ERR_NETWORK_CHANGED`. Детерминированные
  // ошибки повтором не маскируются — они падают все три раза.
  retries: 2,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["list"],
    ["html", { outputFolder: "e2e/report", open: "never" }],
  ],
  // Первый прогрев Vite может занимать больше 5 секунд: зависимости
  // предсобираются, а сеть контейнера иногда отдаёт ERR_NETWORK_CHANGED.
  // Даём приложению время догрузиться, не превращая это в flaky-тест.
  expect: { timeout: 15_000 },
  use: {
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    baseURL: BASE_URL,
    locale: "ru-RU",
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `yarn dev --host 127.0.0.1 --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
        env: {
          // Относительный baseURL: запросы идут на тот же origin, где живёт
          // dev server, а Playwright перехватывает `/api/**` до Vite.
          VITE_API_HOST: "/api",
          VITE_CENTRIFUGE_HOST:
            "ws://127.0.0.1:5180/connection/websocket",
          VITE_DEFAULT_LOCALE: "ru",
          VITE_FALLBACK_LOCALE: "en",
          VITE_DEBUG_PROGRESS: "false",
        },
      },
});
