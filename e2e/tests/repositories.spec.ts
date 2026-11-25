import { ok } from "../support/api";
import { repo } from "../support/data";
import { expect, test } from "../support/fixtures";

const REPOZITORII = [
  repo(),
  repo({
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "other-repo",
    repoUrl: "https://github.com/example/other.git",
    type: "github",
    confirmed: false,
  }),
];

test.describe("Репозитории", () => {
  test.beforeEach(async ({ session }) => {
    await session.loginAs("admin");
  });

  test("показывает список репозиториев", async ({ page, api }) => {
    api.post("/repo/list", ok(REPOZITORII));

    await page.goto("/unit/repositories");

    await expect(
      page.getByRole("heading", { name: "Репозитории", exact: true }),
    ).toBeVisible();

    const karta = page.locator(".hranilisha-card").first();

    await expect(karta).toContainText("e2e-repo");
    await expect(karta).toContainText("gitlab");
    await expect(karta).toContainText(
      "https://gitlab.example.com/group/e2e-repo.git",
    );
  });

  test("показывает пустое состояние", async ({ page, api }) => {
    api.post("/repo/list", ok([]));

    await page.goto("/unit/repositories");

    await expect(
      page.getByText("Репозиториев пока нет", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Добавьте хранилище, чтобы создавать проекты и юниты."),
    ).toBeVisible();
  });

  test("фильтрует по имени или URL", async ({ page, api }) => {
    api.post("/repo/list", ok(REPOZITORII));

    await page.goto("/unit/repositories");

    await expect(page.getByText("e2e-repo", { exact: true })).toBeVisible();

    await page
      .locator('input[placeholder="Название или URL репозитория"]')
      .fill("other");

    await expect(page.getByText("other-repo", { exact: true })).toBeVisible();
    await expect(page.getByText("e2e-repo", { exact: true })).toHaveCount(0);
  });
});
