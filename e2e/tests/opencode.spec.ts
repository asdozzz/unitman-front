import { expect, test } from "../support/fixtures";

test.describe("OpenCode", () => {
  test.beforeEach(async ({ session }) => {
    await session.loginAs("admin");
  });

  test("показывает пустой список unit-сессий", async ({ page }) => {
    await page.goto("/opencode/unit-sessions");

    await expect(
      page.getByText("Сессии юнитов", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Сессий пока нет", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Откройте карточку юнита и нажмите «Сессия»."),
    ).toBeVisible();
  });
});
