import { fail, ok, type ApiHandlerContext, type ApiMock } from "../support/api";
import { expect, test } from "../support/fixtures";
import { tokenDataFor } from "../support/session";

/**
 * Совместный чат workspace: два пользователя и наблюдатель.
 *
 * Стенд e2e полностью мокает `/api/**` (см. `playwright.config.cjs`), поэтому
 * раннер и контейнер IDE не поднимаются. Тест проверяет UI-контракт, который
 * от этого не зависит:
 * 1. владелец приглашает редактора через диалог участников;
 * 2. редактор видит бейдж «Общий», авторство чужих ходов и выбирает свои
 *    реквизиты для промпта;
 * 3. наблюдатель видит историю, но композер заблокирован;
 * 4. после удаления участника его доступ к чату исчезает.
 *
 * Состояние бэкенда хранится в замыкании теста: переключение пользователя —
 * это смена `tokenData` в localStorage и перезагрузка страницы, как при
 * повторном входе.
 */

type Rol = "owner" | "writer" | "viewer";

type Akkaunt = {
  id: string;
  email: string;
  name: string;
};

type Uchastnik = {
  accountId: string;
  role: Rol;
  owner: boolean;
  defaultCredentialId: string | null;
  defaultModel: string | null;
  createdAt: number;
  updatedAt: number;
};

type Hod = {
  id: string;
  sessionId: string;
  seq: number;
  model: string | null;
  status: "ANSWERED";
  requestText: string;
  answers: unknown[];
  result: { Kind: string; Answer: string; Attachments: unknown[] };
  errorKey: null;
  createdAt: number;
  finishedAt: number;
  progressChannel: string;
  authorAccountId: string;
  authorDisplayName: string;
};

const A: Akkaunt = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "alice@e2e.local",
  name: "Алиса",
};

const B: Akkaunt = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "boris@e2e.local",
  name: "Борис",
};

const C: Akkaunt = {
  id: "33333333-3333-4333-8333-333333333333",
  email: "clara@e2e.local",
  name: "Клара",
};

const WORKSPACE_ID = "ws-shared-e2e";
const WORKSPACE_NAME = "shared-e2e";
const CRED_A = "cred-a-1";
const CRED_B_1 = "cred-b-1";
const CRED_B_2 = "cred-b-2";

/** Ответ, который получает пользователь без доступа к workspace. */
const NET_DOSTUPA = "Workspace не найден";

function sozdatRekvizity(id: string, name: string) {
  return {
    id,
    name,
    url: "https://opencode.local",
    provider: "openai",
    model: "gpt-4o",
    models: ["gpt-4o"],
    defaultModel: "gpt-4o",
    apiKeyHint: "****1234",
    cipherVersion: 1,
    createdAt: 1_730_000_000,
    updatedAt: 1_730_000_000,
  };
}

test.describe("Совместный чат workspace", () => {
  // Сценарий намеренно длинный: три пользователя, приглашение, смена роли,
  // промпт и удаление. Держим один связный кейс вместо набора независимых,
  // чтобы моки состояния не расходились с реальным порядком действий.
  test.describe.configure({ timeout: 120_000 });

  test("приглашение, общий чат, наблюдатель и потеря доступа", async ({
    page,
    api,
  }) => {
    /** Текущий пользователь, от лица которого отвечают моки. */
    let tekushchiy: Akkaunt = A;

    const uchastniki: Uchastnik[] = [
      {
        accountId: A.id,
        role: "owner",
        owner: true,
        defaultCredentialId: CRED_A,
        defaultModel: "gpt-4o",
        createdAt: 1_730_000_000,
        updatedAt: 1_730_000_000,
      },
    ];

    const rekvizityPoAkkauntu: Record<string, unknown[]> = {
      [A.id]: [sozdatRekvizity(CRED_A, "Ключ Алисы")],
      [B.id]: [
        sozdatRekvizity(CRED_B_1, "Ключ Бориса 1"),
        sozdatRekvizity(CRED_B_2, "Ключ Бориса 2"),
      ],
      [C.id]: [],
    };

    const hody: Hod[] = [
      {
        id: "turn-1",
        sessionId: WORKSPACE_ID,
        seq: 1,
        model: "gpt-4o",
        status: "ANSWERED",
        requestText: "Начальный промпт Алисы",
        answers: [],
        result: { Kind: "ANSWER", Answer: "Готово", Attachments: [] },
        errorKey: null,
        createdAt: 1_730_000_000,
        finishedAt: 1_730_000_010,
        progressChannel: "",
        authorAccountId: A.id,
        authorDisplayName: A.name,
      },
    ];

    function uchastnik(accountId: string): Uchastnik | undefined {
      return uchastniki.find((item) => item.accountId === accountId);
    }

    function rolTekuschego(): Rol | null {
      return uchastnik(tekushchiy.id)?.role ?? null;
    }

    function spisokElement() {
      const rol = rolTekuschego();

      if (rol === null) {
        return null;
      }

      return {
        id: WORKSPACE_ID,
        name: WORKSPACE_NAME,
        model: "gpt-4o",
        branch: "feature/shared",
        status: "RUNNING",
        readOnly: false,
        archived: false,
        archiveReason: null,
        errorKey: null,
        projects: [
          {
            projectId: "project-1",
            projectName: "api",
            projectCode: "services/api",
            canPush: true,
            positionIndex: 0,
            branch: "feature/shared",
          },
        ],
        ideLink: "https://47000.shared-e2e.workspaces.example.test",
        createdAt: 1_730_000_000,
        updatedAt: 1_730_000_100,
        myRole: rol,
        ownerAccountId: A.id,
        participantsCount: uchastniki.length,
        shared: uchastniki.length > 1,
      };
    }

    function sostoyanieElement() {
      const rol = rolTekuschego();

      if (rol === null) {
        return null;
      }

      const svoi = uchastnik(tekushchiy.id);

      return {
        id: WORKSPACE_ID,
        name: WORKSPACE_NAME,
        branch: "feature/shared",
        status: "RUNNING",
        readOnly: false,
        archived: false,
        archiveReason: null,
        errorKey: null,
        projects: [
          {
            projectId: "project-1",
            projectName: "api",
            projectCode: "services/api",
            canPush: true,
            positionIndex: 0,
            branch: "feature/shared",
          },
        ],
        ideLink: "https://47000.shared-e2e.workspaces.example.test",
        canAcceptMessages: rol !== "viewer",
        lastTurnId: "turn-1",
        lastTurnStatus: "ANSWERED",
        myRole: rol,
        canManage: rol === "owner",
        participants: uchastniki,
        myDefaultCredentialId: svoi?.defaultCredentialId ?? null,
        myDefaultModel: svoi?.defaultModel ?? null,
      };
    }

    /** Мок бэкенда участников и чата. */
    function installWorkspaceMocks(mock: ApiMock): void {
      mock.get("/opencode/workspace/spisok", () => {
        const element = spisokElement();

        return ok(element === null ? [] : [element]);
      });

      mock.post("/opencode/workspace-session/sostoyanie", () => {
        const sostoyanie = sostoyanieElement();

        return sostoyanie === null ? fail(NET_DOSTUPA) : ok(sostoyanie);
      });

      mock.post("/opencode/workspace-session/istoriya", () => {
        if (rolTekuschego() === null) {
          return fail(NET_DOSTUPA);
        }

        return ok(hody);
      });

      mock.post("/opencode/workspace-session/prompt", (context: ApiHandlerContext) => {
        if (rolTekuschego() === null) {
          return fail(NET_DOSTUPA);
        }

        const dannye = context.body as {
          text?: unknown;
          credentialId?: unknown;
        };
        const seq = hody.length + 1;

        hody.push({
          id: `turn-${seq}`,
          sessionId: WORKSPACE_ID,
          seq,
          model: "gpt-4o",
          status: "ANSWERED",
          requestText: typeof dannye.text === "string" ? dannye.text : "",
          answers: [],
          result: { Kind: "ANSWER", Answer: "Ответ агента", Attachments: [] },
          errorKey: null,
          createdAt: 1_730_000_100 + seq,
          finishedAt: 1_730_000_110 + seq,
          progressChannel: "",
          authorAccountId: tekushchiy.id,
          authorDisplayName: tekushchiy.name,
        });

        return ok({
          turnId: `turn-${seq}`,
          status: "ANSWERED",
          progressChannel: "",
        });
      });

      mock.get("/account/opencode/spisokRekvizitov", () =>
        ok(rekvizityPoAkkauntu[tekushchiy.id] ?? []),
      );

      mock.post("/opencode/workspace/uchastniki/spisok", () => {
        if (rolTekuschego() === null) {
          return fail(NET_DOSTUPA);
        }

        return ok({ items: uchastniki });
      });

      mock.post("/opencode/workspace/uchastniki/dobavit", (context: ApiHandlerContext) => {
        const dannye = context.body as { accountId?: unknown; role?: unknown };
        const accountId =
          typeof dannye.accountId === "string" ? dannye.accountId : "";
        const role = dannye.role === "viewer" ? "viewer" : "writer";

        if (rolTekuschego() !== "owner" || accountId === "") {
          return { status: 500, body: { status: "fail", data: { message: "opencode.session.forbidden" } } };
        }

        if (uchastnik(accountId) === undefined) {
          uchastniki.push({
            accountId,
            role,
            owner: false,
            defaultCredentialId: null,
            defaultModel: null,
            createdAt: 1_730_000_050,
            updatedAt: 1_730_000_050,
          });
        }

        return ok({ added: true });
      });

      mock.post("/opencode/workspace/uchastniki/izmenit", (context: ApiHandlerContext) => {
        const dannye = context.body as { accountId?: unknown; role?: unknown };
        const accountId =
          typeof dannye.accountId === "string" ? dannye.accountId : "";
        const zapis = uchastnik(accountId);

        if (rolTekuschego() !== "owner" || zapis === undefined || zapis.owner) {
          return {
            status: 500,
            body: {
              status: "fail",
              data: { message: "opencode.participant.owner_role_immutable" },
            },
          };
        }

        zapis.role = dannye.role === "viewer" ? "viewer" : "writer";
        zapis.updatedAt = 1_730_000_060;

        return ok({ updated: true });
      });

      mock.post("/opencode/workspace/uchastniki/udalit", (context: ApiHandlerContext) => {
        const dannye = context.body as { accountId?: unknown };
        const accountId =
          typeof dannye.accountId === "string" ? dannye.accountId : "";
        const indeks = uchastniki.findIndex(
          (item) => item.accountId === accountId,
        );

        if (rolTekuschego() !== "owner" || indeks < 0) {
          return { status: 500, body: { status: "fail", data: { message: "opencode.participant.not_found" } } };
        }

        uchastniki.splice(indeks, 1);

        return ok({ removed: true });
      });
    }

    installWorkspaceMocks(api);

    /** Вход под другим пользователем без реального логина. */
    async function kak(target: Akkaunt): Promise<void> {
      tekushchiy = target;

      const tokenData = tokenDataFor("user", {
        id: target.id,
        email: target.email,
      });

      // На первом шаге страница ещё `about:blank` — сначала открываем origin,
      // чтобы получить доступ к `localStorage`.
      if (page.url() === "about:blank") {
        await page.goto("/");
      }

      await page.evaluate((data) => {
        window.localStorage.setItem("tokenData", JSON.stringify(data));
      }, tokenData);

      await page.goto("/opencode/workspaces");
    }

    await kak(A);

    /* Шаг 1: у Алисы есть workspace, карточка ещё не «общая». */
    await expect(page.getByText(WORKSPACE_NAME, { exact: true })).toBeVisible();
    await expect(page.getByText("Участников: 1", { exact: true })).toBeVisible();

    /* Шаг 2: Алиса приглашает Бориса редактором через диалог. */
    await page.getByRole("button", { name: "Открыть чат" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/opencode/workspaces/${WORKSPACE_ID}(\\?.*)?$`),
    );
    await expect(page.getByText("Владелец", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Участники" }).click();

    const dialog = page.getByRole("dialog");

    await expect(
      dialog.getByText("Участники workspace", { exact: true }),
    ).toBeVisible();

    await dialog
      .getByPlaceholder("Например, 7d4b1c2a-…")
      .fill(B.id);
    await dialog.getByRole("button", { name: "Пригласить" }).click();

    const strokaBorisVSpiske = dialog.locator("li").filter({ hasText: B.id });

    await expect(strokaBorisVSpiske).toBeVisible();
    await expect(
      strokaBorisVSpiske.getByText("Редактор", { exact: true }).first(),
    ).toBeVisible();

    await dialog.getByRole("button", { name: "Закрыть" }).last().click();

    /* Шаг 3: Борис видит «Общий», авторство Алисы и шлёт промпт своими реквизитами. */
    await kak(B);

    await expect(page.getByText(WORKSPACE_NAME, { exact: true })).toBeVisible();
    await expect(page.getByText("Общий", { exact: true })).toBeVisible();
    await expect(page.getByText("Редактор", { exact: true })).toBeVisible();
    await expect(page.getByText("Участников: 2", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Открыть чат" }).click();

    await expect(
      page.getByText("Начальный промпт Алисы", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(A.name, { exact: true })).toBeVisible();

    const vyborRekvizitov = page
      .locator(".workspace-chat__credential-select input")
      .first();

    await expect(vyborRekvizitov).toHaveValue("Ключ Бориса 1");
    await vyborRekvizitov.click();
    await page
      .locator(".gh-select__option-label", { hasText: "Ключ Бориса 2" })
      .click();
    await expect(vyborRekvizitov).toHaveValue("Ключ Бориса 2");

    await page
      .getByPlaceholder("Опишите задачу для OpenCode")
      .fill("Промпт от Бориса");
    await page.getByRole("button", { name: "Отправить" }).click();

    await expect(page.getByText("Промпт от Бориса", { exact: true })).toBeVisible();
    await expect(page.getByText("Вы", { exact: true })).toBeVisible();

    const vyzovPrompta = api.lastCall("POST", "/opencode/workspace-session/prompt");

    expect(vyzovPrompta).not.toBeNull();
    expect(
      (vyzovPrompta?.body as { credentialId?: string } | null)?.credentialId,
    ).toBe(CRED_B_2);

    /* Шаг 4: Алиса приглашает Клару наблюдателем. */
    await kak(A);
    await page.goto(`/opencode/workspaces/${WORKSPACE_ID}`);
    await page.getByRole("button", { name: "Участники" }).click();

    const dialogC = page.getByRole("dialog");

    await dialogC.getByPlaceholder("Например, 7d4b1c2a-…").fill(C.id);
    await dialogC.getByRole("button", { name: "Пригласить" }).click();

    const strokaKlary = dialogC.locator("li").filter({ hasText: C.id });

    await expect(strokaKlary).toBeVisible();

    // Понижаем Клару до наблюдателя селектом роли в строке участника.
    // Портал меню Quasar может закрыть диалог, поэтому после выбора
    // переоткрываем его и проверяем сохранённую роль.
    await strokaKlary.locator(".gh-select input").first().click();
    await page
      .locator(".gh-select__option-label", { hasText: "Наблюдатель" })
      .click();

    await expect
      .poll(
        () =>
          api.countCalls("POST", "/opencode/workspace/uchastniki/izmenit"),
        { message: "смена роли должна уйти на бэкенд" },
      )
      .toBe(1);

    // После успешного `izmenit` стор перечитывает список участников —
    // дожидаемся обновлённой роли в той же строке диалога.
    await expect(
      strokaKlary.getByText("Наблюдатель", { exact: true }).first(),
    ).toBeVisible();

    await dialogC.getByRole("button", { name: "Закрыть" }).last().click();

    /* Наблюдатель видит чат, но композер недоступен. */
    await kak(C);
    await expect(page.getByText("Общий", { exact: true })).toBeVisible();
    await expect(page.getByText("Наблюдатель", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Открыть чат" }).click();

    await expect(
      page.getByText("Начальный промпт Алисы", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Опишите задачу для OpenCode"),
    ).toBeDisabled();
    await expect(page.getByRole("button", { name: "Отправить" })).toBeDisabled();
    await expect(
      page.getByText(
        "Роль «наблюдатель»: отправлять сообщения может только автор или редактор",
        { exact: true },
      ),
    ).toBeVisible();

    /* Шаг 5: владелец удаляет Бориса — доступ к чату исчезает. */
    await kak(A);
    await page.goto(`/opencode/workspaces/${WORKSPACE_ID}`);
    await page.getByRole("button", { name: "Участники" }).click();

    const dialogUdalit = page.getByRole("dialog");
    const strokaBoris = dialogUdalit
      .locator("li")
      .filter({ hasText: B.id });

    await strokaBoris
      .getByRole("button", { name: "Удалить участника" })
      .click();
    await expect(dialogUdalit.getByText(B.id, { exact: true })).toHaveCount(0);

    await dialogUdalit.getByRole("button", { name: "Закрыть" }).last().click();

    await kak(B);
    await expect(
      page.getByText("Workspace пока нет. Создайте первый, выбрав проекты и ветку.", {
        exact: true,
      }),
    ).toBeVisible();

    await page.goto(`/opencode/workspaces/${WORKSPACE_ID}`);

    await expect(page.getByText(NET_DOSTUPA, { exact: true })).toBeVisible();
    await expect(
      page.getByPlaceholder("Опишите задачу для OpenCode"),
    ).toBeDisabled();
  });
});
