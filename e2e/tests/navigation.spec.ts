import { ok } from "../support/api";
import { expect, test } from "../support/fixtures";

test.describe("Навигация и доступ", () => {
  test.beforeEach(async ({ session }) => {
    await session.loginAs("admin");
  });

  test("показывает основную навигацию", async ({ page }) => {
    await page.goto("/unit/list");

    const navigaciya = page.locator(".gh-side-nav");

    await expect(navigaciya).toBeVisible();
    await expect(navigaciya.getByText("Главная", { exact: true })).toBeVisible();
    await expect(navigaciya.getByText("Юниты", { exact: true })).toBeVisible();
    await expect(
      navigaciya.getByText("ИИ-помощник", { exact: true }),
    ).toBeVisible();
    await expect(
      navigaciya.getByText("Настройки", { exact: true }),
    ).toBeVisible();
  });

  test("администратор видит раздел администрирования", async ({ page }) => {
    await page.goto("/unit/list");

    const navigaciya = page.locator(".gh-side-nav");

    await expect(navigaciya.getByText("Администрирование")).toBeVisible();
    await expect(navigaciya.getByText("Аккаунты", { exact: true })).toBeVisible();
    await expect(
      navigaciya.getByText("Репозитории", { exact: true }),
    ).toBeVisible();
    await expect(navigaciya.getByText("Проекты", { exact: true })).toBeVisible();
    await expect(navigaciya.getByText("Раннеры", { exact: true })).toBeVisible();
  });

  test("пользователь не видит раздел администрирования", async ({
    page,
    session,
  }) => {
    await session.loginAs("user");

    await page.goto("/unit/list");

    const navigaciya = page.locator(".gh-side-nav");

    await expect(navigaciya.getByText("Юниты", { exact: true })).toBeVisible();
    await expect(navigaciya.getByText("Администрирование")).toHaveCount(0);
    await expect(navigaciya.getByText("Аккаунты", { exact: true })).toHaveCount(0);
    await expect(navigaciya.getByText("Раннеры", { exact: true })).toHaveCount(0);
  });

  test("пользователь перенаправляется с админ-маршрута", async ({
    page,
    session,
  }) => {
    await session.loginAs("user");

    await page.goto("/account/list");

    await expect(page).toHaveURL(/\/unauthorized$/u);
    await expect(
      page.getByText(
        "У вас нет доступа к этой странице. Если это ошибка, обратитесь к администратору.",
      ),
    ).toBeVisible();
  });

  test("переходит по пункту сайдбара", async ({ page, api }) => {
    api.post("/project/list", ok([]));

    await page.goto("/unit/list");

    const navigaciya = page.locator(".gh-side-nav");

    await navigaciya
      .locator(".gh-side-nav__item")
      .filter({ hasText: "Проекты" })
      .click();

    await expect(page).toHaveURL(/\/unit\/projects$/u);
    await expect(
      page.getByRole("heading", { name: "Проекты", exact: true }),
    ).toBeVisible();
  });

  test("поиск в шапке ведёт в юниты с query", async ({ page, api }) => {
    api.post("/unit/list", ok([]));

    await page.goto("/unit/list");

    await page.locator("#app-header-search").fill("feature/e2e");
    await page.locator("#app-header-search").press("Enter");

    await expect(page).toHaveURL(
      /\/unit\/list\?search=feature(\/|%2F)e2e/u,
    );

    await expect
      .poll(() => {
        return api.lastCall("POST", "/unit/list")?.body;
      })
      .toMatchObject({ filter: { search: "feature/e2e" } });
  });

  test("переключает тему", async ({ page }) => {
    await page.goto("/unit/list");

    await page.getByRole("button", { name: "Тёмная тема" }).click();

    await expect(page.locator(".app-shell").first()).toHaveAttribute(
      "data-color-mode",
      "dark",
    );
    await expect(
      page.getByRole("button", { name: "Светлая тема" }),
    ).toBeVisible();
  });

  test("переключает язык интерфейса", async ({ page, api }) => {
    api.post("/account/changeMyLocale", ok(null));

    await page.goto("/unit/list");

    const pereklyuchatel = page.getByRole("radiogroup", { name: "Язык" });
    await pereklyuchatel.getByRole("radio", { name: "EN" }).click();

    await expect
      .poll(() => {
        return api.lastCall("POST", "/account/changeMyLocale")?.body;
      })
      .toMatchObject({ locale: "en" });

    const navigaciya = page.locator(".gh-side-nav");
    await expect(navigaciya.getByText("Units", { exact: true })).toBeVisible();
  });

  test("показывает 404", async ({ page }) => {
    await page.goto("/definitely-missing-page");

    await expect(
      page.getByText("Возможно, адрес устарел или страница была перемещена."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "На главную" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "К списку юнитов" }),
    ).toBeVisible();
  });

  test("показывает страницу недостаточно прав", async ({ page }) => {
    await page.goto("/unauthorized");

    await expect(
      page.getByText(
        "У вас нет доступа к этой странице. Если это ошибка, обратитесь к администратору.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "К списку юнитов" }),
    ).toBeVisible();
  });
});
