import type { BrowserContext, Page, Request, Route } from "@playwright/test";

/**
 * Мини-сервер моков HTTP API для e2e-тестов.
 *
 * Перехватывает все запросы к `/api/**` и отвечает заранее заданными
 * конвертами. Неизвестный запрос получает `status: "fail"` — так пропущенный
 * мок сразу виден в отчёте и не маскируется пустым успешным ответом.
 */

/** Конверт успешного ответа бэкенда. */
export type SuccessEnvelope = {
  status: "success";
  data: unknown;
};

/** Конверт прикладной ошибки (`400/403/404/422` в терминах бэкенда). */
export type FailEnvelope = {
  status: "fail";
  data: { message: string };
};

/** Конверт инфраструктурной ошибки. */
export type ErrorEnvelope = {
  status: "error";
  message: string;
  code: string;
};

export type ApiEnvelope = SuccessEnvelope | FailEnvelope | ErrorEnvelope;

/** Успешный ответ с произвольными данными. */
export function ok(data: unknown): SuccessEnvelope {
  return { status: "success", data };
}

/** Прикладная ошибка с сообщением, которое увидит пользователь. */
export function fail(message: string): FailEnvelope {
  return { status: "fail", data: { message } };
}

/** Инфраструктурная ошибка. */
export function errorEnvelope(
  message: string,
  code = "e2e.error",
): ErrorEnvelope {
  return { status: "error", message, code };
}

/** Контекст, который получает обработчик мока. */
export type ApiHandlerContext = {
  method: string;
  /** Путь без префикса `/api`, например `/unit/list`. */
  path: string;
  url: URL;
  body: unknown;
  route: Route;
};

/** Описание HTTP-ответа. `status` — числовой HTTP-статус. */
export type ApiReply = {
  status?: number;
  body?: unknown;
  rawBody?: string;
  delayMs?: number;
  headers?: Record<string, string>;
};

export type ApiHandler = (
  context: ApiHandlerContext,
) => ApiReply | unknown | Promise<ApiReply | unknown>;

export type ApiCall = {
  method: string;
  path: string;
  body: unknown;
  search: string;
};

type MockDefinition = {
  method: string;
  path: string | RegExp;
  handler: ApiHandler;
};

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "authorization,content-type,accept",
};

/** Проверяет, является ли значение описанием ответа, а не телом. */
function isReplySpec(value: unknown): value is ApiReply {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record["rawBody"] === "string" ||
    typeof record["delayMs"] === "number" ||
    typeof record["status"] === "number"
  );
}

/** Нормализует путь: убирает `/api` и хвостовой слэш. */
function normalizePath(pathname: string): string {
  const bezPrefiksa = pathname.startsWith("/api/")
    ? pathname.slice("/api".length)
    : pathname;
  const bezHvosta =
    bezPrefiksa.length > 1 && bezPrefiksa.endsWith("/")
      ? bezPrefiksa.slice(0, -1)
      : bezPrefiksa;

  return bezHvosta === "" ? "/" : bezHvosta;
}

function matchesPath(pattern: string | RegExp, path: string): boolean {
  if (pattern instanceof RegExp) {
    return pattern.test(path);
  }

  return pattern === path;
}

async function readRequestBody(request: Request): Promise<unknown> {
  const raw = request.postData();

  if (raw === null || raw === "") {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export class ApiMock {
  private readonly definitions: MockDefinition[] = [];

  readonly calls: ApiCall[] = [];

  /**
   * Устанавливает перехват на контекст, а не на страницу: так мок действует
   * и после полной перезагрузки/HMR нового документа в том же тесте.
   */
  async install(target: Page | BrowserContext): Promise<void> {
    // Функция вместо глоба: `**/api/**` перехватывает и модули Vite
    // (`/src/api/types.ts`), из-за чего приложение получает JSON вместо JS.
    await target.route(
      (url) => url.pathname.startsWith("/api/"),
      async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const method = request.method().toUpperCase();
      const path = normalizePath(url.pathname);
      const body = await readRequestBody(request);

      this.calls.push({
        method,
        path,
        body,
        search: url.search,
      });

      if (method === "OPTIONS") {
        await route.fulfill({
          status: 204,
          headers: CORS_HEADERS,
        });
        return;
      }

      // Ищем с конца: мок, зарегистрированный позже, перекрывает дефолтный.
      const definition = [...this.definitions]
        .reverse()
        .find(
          (item) =>
            item.method === method && matchesPath(item.path, path),
        );

      if (definition === undefined) {
        await this.fulfill(route, {
          body: fail(`E2E: не замокан ${method} ${path}`),
        });
        return;
      }

      const result = await definition.handler({
        method,
        path,
        url,
        body,
        route,
      });

      const reply: ApiReply = isReplySpec(result)
        ? result
        : { body: result };

      if (reply.delayMs !== undefined) {
        await new Promise((resolve) => setTimeout(resolve, reply.delayMs));
      }

        await this.fulfill(route, reply);
      },
    );
  }

  /** Регистрирует мок для метода и точного пути/регулярного выражения. */
  on(
    method: string,
    path: string | RegExp,
    handler: ApiHandler | unknown,
  ): this {
    // Статичный ответ (конверт) оборачивается в обработчик: вызывающий код
    // может передать как функцию, так и готовое тело. Возвращается ровно
    // переданное значение — `install` сам решит, тело это или описание ответа.
    const normalized: ApiHandler =
      typeof handler === "function"
        ? (handler as ApiHandler)
        : () => handler;

    this.definitions.push({
      method: method.toUpperCase(),
      path,
      handler: normalized,
    });

    return this;
  }

  get(path: string | RegExp, handler: ApiHandler | unknown): this {
    return this.on("GET", path, handler);
  }

  post(path: string | RegExp, handler: ApiHandler | unknown): this {
    return this.on("POST", path, handler);
  }

  put(path: string | RegExp, handler: ApiHandler | unknown): this {
    return this.on("PUT", path, handler);
  }

  delete(path: string | RegExp, handler: ApiHandler): this {
    return this.on("DELETE", path, handler);
  }

  /** Все вызовы метода по пути. */
  callsFor(method: string, path: string | RegExp): ApiCall[] {
    const upper = method.toUpperCase();

    return this.calls.filter(
      (call) =>
        call.method === upper && matchesPath(path, call.path),
    );
  }

  /** Количество вызовов метода по пути. */
  countCalls(method: string, path: string | RegExp): number {
    return this.callsFor(method, path).length;
  }

  /** Последний вызов метода по пути (или `null`). */
  lastCall(method: string, path: string | RegExp): ApiCall | null {
    const calls = this.callsFor(method, path);

    return calls.length === 0 ? null : calls[calls.length - 1];
  }

  reset(): void {
    this.definitions.length = 0;
    this.calls.length = 0;
  }

  private async fulfill(route: Route, reply: ApiReply): Promise<void> {
    const status = reply.status ?? 200;

    if (status === 204) {
      await route.fulfill({
        status,
        headers: { ...CORS_HEADERS, ...reply.headers },
      });
      return;
    }

    const rawBody =
      reply.rawBody !== undefined
        ? reply.rawBody
        : JSON.stringify(reply.body ?? null);

    await route.fulfill({
      status,
      contentType: "application/json",
      headers: { ...CORS_HEADERS, ...reply.headers },
      body: rawBody,
    });
  }
}
