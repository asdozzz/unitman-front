import { ok } from "../support/api";
import { account } from "../support/data";
import { expect, test } from "../support/fixtures";

const AKKAUNTY = [
  account({
    id: "00000000-0000-4000-8000-000000000001",
    email: "admin@e2e.local",
    nickname: "E2E Admin",
    roles: "ROLE_ADMIN,ROLE_USER",
  }),
  account(),
  account({
    id: "00000000-0000-4000-8000-000000000003",
    email: "blocked@e2e.local",
    nickname: "Blocked User",
    isBlocked: true,
  }),
];

const PUT_AKKAUNTOV =
  "/account/poluchitVsehPolzovateleiDlyAdministrorovaniya";

test.describe("Аккаунты", () => {
  test.beforeEach(async ({ session }) => {
    await session.loginAs("admin");
  });

  test("показывает список аккаунтов", async ({ page, api }) => {
    api.post(PUT_AKKAUNTOV, ok(AKKAUNTY));

    await page.goto("/account/list");

    await expect(
      page.getByRole("heading", { name: "Аккаунты", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("admin@e2e.local", { exact: true })).toBeVisible();
    await expect(page.getByText("user@e2e.local", { exact: true })).toBeVisible();
    await expect(
      page.getByText("blocked@e2e.local", { exact: true }),
    ).toBeVisible();
  });

  test("фильтрует заблокированные аккаунты", async ({ page, api }) => {
    api.post(PUT_AKKAUNTOV, ok(AKKAUNTY));

    await page.goto("/account/list");

    await expect(page.getByText("user@e2e.local", { exact: true })).toBeVisible();

    await page
      .locator(".status-filter__chip")
      .filter({ hasText: "Заблокирован" })
      .click();

    await expect(
      page.getByText("blocked@e2e.local", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("user@e2e.local", { exact: true })).toHaveCount(0);
  });

  test("показывает пустое состояние", async ({ page, api }) => {
    api.post(PUT_AKKAUNTOV, ok([]));

    await page.goto("/account/list");

    await expect(
      page.getByText("Пока нет ни одного аккаунта", { exact: true }),
    ).toBeVisible();
  });

  test("открывает форму регистрации", async ({ page, api }) => {
    api.post(PUT_AKKAUNTOV, ok(AKKAUNTY));

    await page.goto("/account/list");

    await page
      .getByRole("button", { name: "Добавить", exact: true })
      .first()
      .click();

    const dialog = page.locator(".q-dialog").last();

    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText("Добавить учетную запись", { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByText(
        "Система сгенерирует временный пароль и отправит его на email пользователя.",
        { exact: true },
      ),
    ).toBeVisible();
  });
});
