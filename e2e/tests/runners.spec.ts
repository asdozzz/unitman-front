import { fail, ok } from "../support/api";
import { runner } from "../support/data";
import { expect, test } from "../support/fixtures";

const PUT_RANNEROV = "/runner/list";

test.describe("Раннеры", () => {
  test.beforeEach(async ({ session }) => {
    await session.loginAs("admin");
  });

  test("показывает карточку раннера", async ({ page, api }) => {
    api.get(PUT_RANNEROV, ok([runner()]));

    await page.goto("/runner/list");

    const karta = page.locator(".runner-card").first();

    await expect(karta).toBeVisible();
    await expect(karta).toContainText("runner-e2e-1");
    await expect(karta).toContainText("В работе");
    await expect(karta).toContainText("Память");
    await expect(karta).toContainText("CPU");
  });

  test("показывает пустой реестр", async ({ page, api }) => {
    api.get(PUT_RANNEROV, ok([]));

    await page.goto("/runner/list");

    await expect(
      page.getByText("Раннеры не зарегистрированы", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Как зарегистрировать раннер", { exact: true }),
    ).toBeVisible();
  });

  test("показывает ошибку загрузки", async ({ page, api }) => {
    api.get(PUT_RANNEROV, fail("backend down"));

    await page.goto("/runner/list");

    await expect(
      page.getByText("Не удалось получить список раннеров", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("backend down")).toBeVisible();
  });
});
