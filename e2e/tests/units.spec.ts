import { fail, ok } from "../support/api";
import { project, unit } from "../support/data";
import { expect, test } from "../support/fixtures";

test.describe("Юниты", () => {
  test.beforeEach(async ({ session }) => {
    await session.loginAs("admin");
  });

  test("отрисовывает карточку юнита", async ({ page, api }) => {
    api.post("/unit/list", ok([unit()]));
    api.post("/project/my", ok([project()]));

    await page.goto("/unit/list");

    const karta = page.locator(".unit-card").first();

    await expect(karta).toBeVisible();
    await expect(karta).toContainText("feature/e2e-1");
    await expect(karta).toContainText("E2E Project");
    await expect(karta).toContainText("admin@e2e.local");
  });

  test("показывает пустое состояние", async ({ page, api }) => {
    api.post("/unit/list", ok([]));

    await page.goto("/unit/list");

    await expect(page.getByText("У вас пока нету юнитов")).toBeVisible();
    await expect(
      page.getByText("Создайте первый юнит из ветки проекта."),
    ).toBeVisible();
  });

  test("показывает ошибку и повторяет загрузку", async ({ page, api }) => {
    let zaprosov = 0;

    api.post("/unit/list", () => {
      zaprosov += 1;

      return zaprosov === 1 ? fail("backend down") : ok([unit()]);
    });

    await page.goto("/unit/list");

    await expect(
      page.getByText("Не удалось загрузить список юнитов", { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Повторить" }).click();

    await expect.poll(() => zaprosov).toBe(2);
  });

  test("передаёт поиск в API и URL", async ({ page, api }) => {
    api.post("/unit/list", ok([unit()]));

    await page.goto("/unit/list");

    const poisk = page.locator('input[placeholder="Название или ветка"]');

    await poisk.fill("feature/e2e");

    await expect(page).toHaveURL(/search=feature(\/|%2F)e2e/u);
    await expect
      .poll(() => api.lastCall("POST", "/unit/list")?.body)
      .toMatchObject({ filter: { search: "feature/e2e" } });
  });

  test("открывает форму создания юнита", async ({ page, api }) => {
    api.post("/unit/list", ok([]));
    api.post("/project/my", ok([project()]));

    await page.goto("/unit/list");

    await page.getByRole("button", { name: "Добавить юнит" }).click();

    const dialog = page.locator(".q-dialog").last();

    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Имя юнита")).toBeVisible();
  });

  test("обновляет список по кнопке", async ({ page, api }) => {
    api.post("/unit/list", ok([unit()]));

    await page.goto("/unit/list");

    await expect.poll(() => api.countCalls("POST", "/unit/list")).toBe(1);

    await page
      .locator(".gh-page-header__actions button")
      .first()
      .click();

    await expect
      .poll(() => api.countCalls("POST", "/unit/list"))
      .toBeGreaterThan(1);
  });
});
