import { fail, ok } from "../support/api";
import { projectStatistics } from "../support/data";
import { expect, test } from "../support/fixtures";

const PROEKTY = [
  projectStatistics(),
  projectStatistics({
    projectId: "88888888-8888-4888-8888-888888888888",
    projectName: "Second",
    total: 3,
    active: 1,
    deleted: 0,
  }),
];

test.describe("Дашборд", () => {
  test.beforeEach(async ({ session }) => {
    await session.loginAs("admin");
  });

  test("показывает статистику и таблицу", async ({ page, api }) => {
    api.post("/project/statistikaPoProektam", ok(PROEKTY));

    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Главная", exact: true }),
    ).toBeVisible();

    const vsego = page.getByRole("link", { name: /Всего юнитов/u });
    await expect(vsego).toContainText("8");

    const aktivnie = page.getByRole("link", { name: /^Активные/u });
    await expect(aktivnie).toContainText("3");

    await expect(page.getByText("E2E Project", { exact: true })).toBeVisible();
    await expect(page.getByText("Second", { exact: true })).toBeVisible();
  });

  test("показывает пустое состояние", async ({ page, api }) => {
    api.post("/project/statistikaPoProektam", ok([]));

    await page.goto("/");

    await expect(page.getByText("Пока нет проектов", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Создайте первый проект, чтобы увидеть статистику."),
    ).toBeVisible();
  });

  test("показывает ошибку и повторяет загрузку", async ({ page, api }) => {
    let zaprosov = 0;

    api.post("/project/statistikaPoProektam", () => {
      zaprosov += 1;

      return zaprosov === 1 ? fail("backend down") : ok(PROEKTY);
    });

    await page.goto("/");

    await expect(
      page.getByText("Не удалось загрузить статистику", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("backend down")).toBeVisible();

    await page.getByRole("button", { name: "Повторить" }).click();

    await expect.poll(() => zaprosov).toBe(2);
    await expect(
      page.getByText("Не удалось загрузить статистику", { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText("E2E Project", { exact: true })).toBeVisible();
  });

  test("фильтрует проекты по названию", async ({ page, api }) => {
    api.post("/project/statistikaPoProektam", ok(PROEKTY));

    await page.goto("/");

    await expect(page.getByText("E2E Project", { exact: true })).toBeVisible();

    await page
      .locator('input[placeholder="Фильтр по названию"]')
      .fill("second");

    await expect(page.getByText("Second", { exact: true })).toBeVisible();
    await expect(page.getByText("E2E Project", { exact: true })).toHaveCount(0);
  });

  test("переходит в юниты по плитке", async ({ page, api }) => {
    api.post("/project/statistikaPoProektam", ok(PROEKTY));
    api.post("/unit/list", ok([]));

    await page.goto("/");

    await page.getByRole("link", { name: /Всего юнитов/u }).click();

    await expect(page).toHaveURL(/\/unit\/list/u);
    await expect(
      page.getByRole("heading", { name: "Юниты", exact: true }),
    ).toBeVisible();
  });
});
