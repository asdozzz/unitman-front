import { fail, ok } from "../support/api";
import { expect, test } from "../support/fixtures";

test.describe("Настройки аккаунта", () => {
  test.beforeEach(async ({ session, api }) => {
    await session.loginAs("admin");
    api.get(
      "/account/poluchitNastroikiPolzovatelya",
      ok({ nickname: "E2E Admin" }),
    );
  });

  test("открывает вкладку из query", async ({ page }) => {
    await page.goto("/account/settings?tab=security");

    await expect(
      page.getByRole("heading", { name: "Настройки", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Смена пароля", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Новый пароль")).toBeVisible();
    await expect(page.getByLabel("Новый пароль")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
  });

  test("переключает вкладки и обновляет URL", async ({ page }) => {
    await page.goto("/account/settings");

    await page.getByRole("tab", { name: "Токены" }).click();

    await expect(page).toHaveURL(/tab=tokens/u);
    await expect(
      page.getByText("Личные токены доступа", { exact: true }),
    ).toBeVisible();
  });

  test("загружает и сохраняет профиль", async ({ page, api }) => {
    api.post("/account/changeMyNickname", ok(null));

    await page.goto("/account/settings");

    const pole = page.getByLabel("Ник");
    await expect(pole).toHaveValue("E2E Admin");

    await pole.fill("E2E Admin Updated");
    await page.getByRole("button", { name: "Сохранить" }).click();

    await expect(
      page.getByText("Изменения сохранены", { exact: true }),
    ).toBeVisible();
    await expect
      .poll(() => api.lastCall("POST", "/account/changeMyNickname")?.body)
      .toMatchObject({ newNickname: "E2E Admin Updated" });
  });

  test("показывает ошибку сохранения профиля", async ({ page, api }) => {
    api.post("/account/changeMyNickname", fail("Ник уже занят"));

    await page.goto("/account/settings");

    await page.getByLabel("Ник").fill("E2E Admin Busy");
    await page.getByRole("button", { name: "Сохранить" }).click();

    await expect(page.getByText("Ник уже занят")).toBeVisible();
  });

  test("показывает пустые состояния токенов и OpenCode", async ({ page }) => {
    await page.goto("/account/settings?tab=tokens");

    await expect(
      page.getByText("Пока нет личных токенов."),
    ).toBeVisible();

    await page.getByRole("tab", { name: "OpenCode" }).click();

    await expect(
      page.getByText("Пока нет реквизитов OpenCode.", { exact: true }),
    ).toBeVisible();
  });

  test("предупреждает о несохранённых изменениях", async ({ page }) => {
    await page.goto("/account/settings");

    await expect(page.getByLabel("Ник")).toHaveValue("E2E Admin");

    await page.getByLabel("Ник").fill("E2E Admin Dirty");
    await page.getByRole("tab", { name: "Безопасность" }).click();

    const dialog = page.locator(".q-dialog").last();

    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText("Отменить изменения?", { exact: true }),
    ).toBeVisible();

    await dialog.getByRole("button", { name: "Остаться" }).click();

    await expect(page).toHaveURL(/\/account\/settings(?:\?|$)/u);
    await expect(page.getByLabel("Ник")).toHaveValue("E2E Admin Dirty");
  });
});
