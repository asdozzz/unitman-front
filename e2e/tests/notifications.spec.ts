import { ok } from "../support/api";
import { notification } from "../support/data";
import { expect, test } from "../support/fixtures";

test.describe("Уведомления", () => {
  test.beforeEach(async ({ session }) => {
    await session.loginAs("admin");
  });

  test("показывает список уведомлений", async ({ page, api }) => {
    api.get(
      "/notifications",
      ok({ items: [notification()], unreadCount: 1 }),
    );

    await page.goto("/notifications");

    await expect(
      page.getByRole("heading", { name: "Уведомления", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Юнит feature/e2e-1 запущен", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Инфо", { exact: true })).toBeVisible();
  });

  test("показывает пустое состояние", async ({ page, api }) => {
    api.get("/notifications", ok({ items: [], unreadCount: 0 }));

    await page.goto("/notifications");

    await expect(
      page.getByText("Уведомлений пока нет", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Здесь появятся события по вашим юнитам и раннерам."),
    ).toBeVisible();
  });
});
