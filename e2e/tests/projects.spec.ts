import { ok } from "../support/api";
import { project } from "../support/data";
import { expect, test } from "../support/fixtures";

const PROEKTY = [
  project(),
  project({
    id: "88888888-8888-4888-8888-888888888888",
    code: "second-project",
    name: "Second Project",
    repoId: "99999999-9999-4999-8999-999999999999",
  }),
];

test.describe("Проекты", () => {
  test.beforeEach(async ({ session }) => {
    await session.loginAs("admin");
  });

  test("показывает список проектов", async ({ page, api }) => {
    api.post("/project/list", ok(PROEKTY));

    await page.goto("/unit/projects");

    await expect(
      page.getByRole("heading", { name: "Проекты", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("E2E Project", { exact: true })).toBeVisible();
    await expect(page.getByText("Second Project", { exact: true })).toBeVisible();
  });

  test("показывает пустое состояние", async ({ page, api }) => {
    api.post("/project/list", ok([]));

    await page.goto("/unit/projects");

    await expect(page.getByText("Проектов пока нет", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Создайте проект из репозитория, чтобы собирать юниты."),
    ).toBeVisible();
  });

  test("фильтрует проекты по названию", async ({ page, api }) => {
    api.post("/project/list", ok(PROEKTY));

    await page.goto("/unit/projects");

    await expect(page.getByText("E2E Project", { exact: true })).toBeVisible();

    await page
      .locator('input[placeholder="Название или код проекта"]')
      .fill("second");

    await expect(page.getByText("Second Project", { exact: true })).toBeVisible();
    await expect(page.getByText("E2E Project", { exact: true })).toHaveCount(0);
  });

  test("открывает форму создания проекта", async ({ page, api }) => {
    api.post("/project/list", ok([]));

    await page.goto("/unit/projects");

    await page
      .getByRole("button", { name: "Создать проект", exact: true })
      .first()
      .click();

    const dialog = page.locator(".q-dialog").last();

    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Добавить проект", { exact: true })).toBeVisible();
    await expect(
      dialog.getByText("Код проекта из репозитория", { exact: true }),
    ).toBeVisible();
  });
});
