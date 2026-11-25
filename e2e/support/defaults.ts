import { fail, ok, type ApiMock } from "./api";

/**
 * Базовые моки, без которых приложение шумит ошибками на каждом экране:
 * счётчик уведомлений, реквизиты OpenCode, угрозы раннеров и пустые списки.
 *
 * Тесты перекрывают нужные пути своими моками: обработчик, зарегистрированный
 * позже, имеет приоритет.
 */
export function installDefaultMocks(api: ApiMock): void {
  /* Фоновые запросы оболочки. */
  api.get("/notifications/unread-count", ok({ count: 0 }));
  api.get("/notifications", ok({ items: [], unreadCount: 0 }));
  api.get("/notifications/preferences", ok([]));
  api.get("/notifications/push/public-key", fail("e2e: push disabled"));
  api.get("/opencode/uvedomleniya", fail("e2e: websocket disabled"));
  api.get(
    "/opencode/unit-session/uvedomleniya",
    fail("e2e: websocket disabled"),
  );
  api.get(
    "/runner/threats",
    ok({
      hasThreats: false,
      worstLevel: "ok",
      count: 0,
      runners: [],
      registeredCount: 0,
    }),
  );

  /* Списки, которые страницы грузят при открытии. */
  api.post("/unit/list", ok([]));
  api.post("/project/list", ok([]));
  api.post("/project/my", ok([]));
  api.post("/project/statistikaPoProektam", ok([]));
  api.post("/repo/list", ok([]));
  api.post("/repo/activeList", ok([]));
  api.post("/repo/type/list", ok([]));
  api.post("/project/activeList", ok([]));
  api.get("/runner/list", ok([]));
  api.post(
    "/account/poluchitVsehPolzovateleiDlyAdministrorovaniya",
    ok([]),
  );
  api.post("/lichniyToken/spisok", ok([]));

  /* Настройки аккаунта. */
  api.get(
    "/account/poluchitNastroikiPolzovatelya",
    ok({ nickname: "E2E Admin" }),
  );
  api.post("/account/changeMyNickname", ok(null));
  api.post("/account/changeMyPassword", ok(null));
  api.post("/account/changeMyLocale", ok(null));
  api.get("/account/opencode/spisokRekvizitov", ok([]));
  api.get("/account/opencode/providers", ok([]));

  /* AI-чат и OpenCode. */
  api.get("/ai/chat/sessions", ok(emptySessionPage()));
  api.get("/opencode/unit-session/spisok", ok([]));
  api.get("/opencode/workspace/spisok", ok([]));
}

function emptySessionPage() {
  return {
    items: [],
    limit: 50,
    offset: 0,
    total: 0,
    hasMore: false,
  };
}
