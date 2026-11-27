import { createHmac } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "../support/fixtures";

/**
 * Артефакты хода workspace: контракт загрузки от раннера и доступ к файлам.
 *
 * Базовый e2e-стенд (`playwright.config.cjs`) полностью подменяет `/api/**`
 * моками, поэтому проверить реальные 401/404/422 на нём невозможно. Эти тесты
 * запускаются только против живого стека и включаются переменной
 * `E2E_LIVE_STACK=1`; без неё каждый кейс честно помечается `skip` с
 * перечнем предусловий.
 *
 * Предусловия живого прогона:
 * - `E2E_LIVE_STACK=1`;
 * - `E2E_API_URL` — корень бэкенда (необязателен, по умолчанию `baseURL`);
 * - `E2E_USER_LOGIN`/`E2E_USER_PASSWORD` — пользователь A;
 * - `E2E_FOREIGN_TURN_ID`/`E2E_FOREIGN_FILE_ID` — ход и файл пользователя B;
 * - `E2E_RUNNER_ID` — зарегистрированный раннер;
 * - `E2E_RUNNER_SECRET` — его секрет для HMAC;
 * - `E2E_TURN_WORKFLOW_ID`/`E2E_TURN_WORKSPACE_ID` — выполняющийся
 *   (`RUNNING`) workspace-ход пользователя A.
 */

const LIVE_STACK = process.env.E2E_LIVE_STACK === "1";

const LIVE_REASON =
  "Требуется живой стек (E2E_LIVE_STACK=1): e2e-стенд по умолчанию мокает /api/** " +
  "и не может проверить реальные коды 401/404/422.";

const FOREIGN_REASON =
  "Требуются E2E_USER_LOGIN/E2E_USER_PASSWORD и E2E_FOREIGN_TURN_ID/E2E_FOREIGN_FILE_ID " +
  "хода, принадлежащего другому пользователю.";

const RUNNER_REASON =
  "Требуются E2E_RUNNER_ID и E2E_RUNNER_SECRET зарегистрированного раннера.";

const TURN_REASON =
  "Требуются E2E_RUNNER_ID/E2E_RUNNER_SECRET и E2E_TURN_WORKFLOW_ID/E2E_TURN_WORKSPACE_ID " +
  "выполняющегося workspace-хода.";

const API_BASE = (process.env.E2E_API_URL ?? "").replace(/\/+$/u, "");

/** Путь к бэкенду: абсолютный `E2E_API_URL` либо относительный `baseURL`. */
function apiPath(path: string): string {
  return `${API_BASE}${path}`;
}

/** Собирает URL загрузки артефакта с query-параметрами раннера. */
function artifactUrl(
  workflowId: string,
  workspaceId: string,
  name: string,
  contentType = "text/markdown",
): string {
  const params = new URLSearchParams({
    workflowId,
    workspaceId,
    name,
    contentType,
  });

  return apiPath(`/api/runner/opencode/artifact?${params.toString()}`);
}

/** hex(HMAC-SHA256(secret, workflowId + "\n" + name + "\n" + body)). */
function artifactSignature(
  secret: string,
  workflowId: string,
  name: string,
  body: string,
): string {
  return createHmac("sha256", secret)
    .update(`${workflowId}\n${name}\n${body}`, "utf8")
    .digest("hex");
}

/**
 * Логинится реальными кредами из окружения и возвращает JWT.
 * `null` означает, что креды не заданы — кейс должен быть пропущен.
 */
async function loginToken(
  request: APIRequestContext,
  loginEnv: string,
  passwordEnv: string,
): Promise<string | null> {
  const username = process.env[loginEnv];
  const password = process.env[passwordEnv];

  if (username === undefined || username === "" || password === undefined || password === "") {
    return null;
  }

  const response = await request.post(apiPath("/api/login"), {
    data: { username, password },
  });

  expect(response.ok(), `логин ${loginEnv} должен пройти`).toBe(true);

  const payload = (await response.json()) as {
    status?: string;
    data?: { token?: unknown };
  };
  const token = payload.data?.token;

  expect(typeof token, "ответ /api/login должен содержать data.token").toBe("string");

  return token as string;
}

test.describe("Артефакты workspace: контракт API", () => {
  test("загрузка артефакта без подписи отклоняется с 401", async ({ request }) => {
    test.skip(!LIVE_STACK, LIVE_REASON);

    const response = await request.post(
      artifactUrl("e2e-workflow", "e2e-workspace", "plan.md"),
      {
        headers: { "Content-Type": "application/octet-stream" },
        data: "# plan",
      },
    );

    expect(response.status()).toBe(401);
  });

  test("неверная подпись раннера отклоняется с 401", async ({ request }) => {
    test.skip(!LIVE_STACK, LIVE_REASON);
    test.skip(process.env.E2E_RUNNER_ID === undefined, RUNNER_REASON);

    const response = await request.post(
      artifactUrl("e2e-workflow", "e2e-workspace", "plan.md"),
      {
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Runner-Id": process.env.E2E_RUNNER_ID as string,
          "X-Runner-Signature": "00",
        },
        data: "# plan",
      },
    );

    expect(response.status()).toBe(401);
  });

  test("неизвестный раннер даёт 404", async ({ request }) => {
    test.skip(!LIVE_STACK, LIVE_REASON);

    const response = await request.post(
      artifactUrl("e2e-workflow", "e2e-workspace", "plan.md"),
      {
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Runner-Id": "e2e-unknown-runner",
          "X-Runner-Signature": "00",
        },
        data: "# plan",
      },
    );

    expect(response.status()).toBe(404);
  });

  test("ссылка без JWT требует авторизации", async ({ request }) => {
    test.skip(!LIVE_STACK, LIVE_REASON);

    const response = await request.post(apiPath("/api/opencode/fajl/ssylka"), {
      data: { turnId: "00000000-0000-4000-8000-000000000000", fileId: "00000000-0000-4000-8000-000000000000" },
    });

    expect(response.status()).toBe(401);
  });

  test("текст для preview без JWT требует авторизации", async ({ request }) => {
    test.skip(!LIVE_STACK, LIVE_REASON);

    const response = await request.post(apiPath("/api/opencode/fajl/tekst"), {
      data: { turnId: "00000000-0000-4000-8000-000000000000", fileId: "00000000-0000-4000-8000-000000000000" },
    });

    expect(response.status()).toBe(401);
  });

  test("чужой ход не раскрывается и даёт 404", async ({ request }) => {
    test.skip(!LIVE_STACK, LIVE_REASON);
    test.skip(
      process.env.E2E_USER_LOGIN === undefined ||
        process.env.E2E_FOREIGN_TURN_ID === undefined ||
        process.env.E2E_FOREIGN_FILE_ID === undefined,
      FOREIGN_REASON,
    );

    const token = await loginToken(request, "E2E_USER_LOGIN", "E2E_USER_PASSWORD");

    test.skip(token === null, FOREIGN_REASON);

    if (token === null) {
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };
    const body = {
      turnId: process.env.E2E_FOREIGN_TURN_ID as string,
      fileId: process.env.E2E_FOREIGN_FILE_ID as string,
    };

    const link = await request.post(apiPath("/api/opencode/fajl/ssylka"), {
      headers,
      data: body,
    });
    const preview = await request.post(apiPath("/api/opencode/fajl/tekst"), {
      headers,
      data: body,
    });

    expect(link.status()).toBe(404);
    expect(preview.status()).toBe(404);
  });

  test("запрещённое расширение отклоняется с 422", async ({ request }) => {
    test.skip(!LIVE_STACK, LIVE_REASON);
    test.skip(
      process.env.E2E_RUNNER_ID === undefined ||
        process.env.E2E_RUNNER_SECRET === undefined ||
        process.env.E2E_TURN_WORKFLOW_ID === undefined ||
        process.env.E2E_TURN_WORKSPACE_ID === undefined,
      TURN_REASON,
    );

    const runnerId = process.env.E2E_RUNNER_ID as string;
    const secret = process.env.E2E_RUNNER_SECRET as string;
    const workflowId = process.env.E2E_TURN_WORKFLOW_ID as string;
    const workspaceId = process.env.E2E_TURN_WORKSPACE_ID as string;
    const name = "x.html";
    const body = "<h1>nope</h1>";

    const response = await request.post(
      artifactUrl(workflowId, workspaceId, name, "text/html"),
      {
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Runner-Id": runnerId,
          "X-Runner-Signature": artifactSignature(secret, workflowId, name, body),
        },
        data: body,
      },
    );

    expect(response.status()).toBe(422);
  });
});

/**
 * UI-уровень.
 *
 * Сценарий требует настоящего хода агента: контейнера workspace, OpenCode CLI
 * и раннера, который выгрузит файлы. В CI раннера нет, поэтому блок закреплён
 * как `fixme`. Когда появится живой стенд, тесты должны:
 *
 * 1. открыть `/opencode/workspaces/<id>` и попросить план в чате;
 * 2. дождаться строки `.workspace-chat__attachment` с именем файла;
 * 3. открыть preview кнопкой с `aria-label` «Предпросмотр»;
 * 4. проверить, что внутри роли `dialog` есть `h1`/`h2` и `li`, а `script`
 *    и `iframe` отсутствуют;
 * 5. следующим ходом убедиться, что вложения первого хода сохранились;
 * 6. под пользователем B получить 404 на `/api/opencode/fajl/ssylka` и
 *    `/api/opencode/fajl/tekst`.
 */
test.describe("Артефакты workspace: интерфейс", () => {
  test.fixme(
    true,
    "Нужен живой стенд с раннером и контейнером workspace: реальный ход агента, " +
      "запись файла в outbox и выгрузка артефакта. В CI раннера нет.",
  );

  test("ответ агента показывает вложение, preview рендерит Markdown и санитайзит HTML", async () => {
    // Тело намеренно пустое: кейс зафиксирован как fixme до появления стенда.
  });

  test("вложения предыдущего хода сохраняются в следующем ходе", async () => {
    // Тело намеренно пустое: см. предусловия выше.
  });

  test("чужой пользователь не получает ссылку и preview", async () => {
    // Тело намеренно пустое: см. предусловия выше.
  });
});
