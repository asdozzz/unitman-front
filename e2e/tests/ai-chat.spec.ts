import { expect, test } from "../support/fixtures";

test.describe("AI-чат", () => {
  test.beforeEach(async ({ session }) => {
    await session.loginAs("admin");
  });

  test("показывает чат без реквизитов OpenCode", async ({ page }) => {
    await page.goto("/ai/chat");

    await expect(
      page.getByRole("heading", { name: "AI-помощник", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Реквизиты OpenCode не настроены", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Начните диалог", { exact: true }),
    ).toBeVisible();
  });

  test("показывает пустой список сессий", async ({ page }) => {
    await page.goto("/ai/chat/sessions");

    await expect(
      page.getByRole("heading", { name: "Сессии AI-чата", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Сессий пока нет", { exact: true }),
    ).toBeVisible();
  });
});
