import { fail, ok } from "../support/api";
import { tokenDataFor } from "../support/session";
import { expect, test } from "../support/fixtures";

test.describe("Аутентификация", () => {
  test("перенаправляет неавторизованного на /login", async ({
    page,
    session,
  }) => {
    await session.logout();

    await page.goto("/unit/list");

    await expect(page).toHaveURL(/\/login$/u);
    await expect(page.locator("#login-email")).toBeVisible();

    const tokenData = await page.evaluate(() =>
      JSON.parse(window.localStorage.getItem("tokenData") ?? "null"),
    );
    expect(tokenData).toBeNull();
  });

  test("показывает форму входа", async ({ page, session }) => {
    await session.logout();

    await page.goto("/login");

    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveAttribute("id", "login-email");
    await expect(page.getByLabel("Пароль")).toHaveAttribute(
      "id",
      "login-password",
    );
    await expect(
      page.getByRole("button", { name: "Вход", exact: true }),
    ).toBeVisible();
  });

  test("показывает ошибку при неудачном входе", async ({
    page,
    session,
    api,
  }) => {
    await session.logout();

    api.post("/login", fail("Неверный логин или пароль"));

    await page.goto("/login");
    await page.locator("#login-email").fill("admin@e2e.local");
    await page.locator("#login-password").fill("wrong-password");
    await page.getByRole("button", { name: "Вход", exact: true }).click();

    await expect(page.getByText("Ошибка входа", { exact: true })).toBeVisible();
    await expect(page.getByText("Неверный логин или пароль")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/u);

    const tokenData = await page.evaluate(() =>
      JSON.parse(window.localStorage.getItem("tokenData") ?? "null"),
    );
    expect(tokenData).toBeNull();
  });

  test("успешный вход сохраняет сессию и ведёт в юниты", async ({
    page,
    session,
    api,
  }) => {
    await session.logout();

    const tokenData = tokenDataFor("admin");
    let requestBody: unknown = null;

    api.post("/login", ({ body }: { body: unknown }) => {
      requestBody = body;

      return ok(tokenData);
    });

    await page.goto("/login");
    await page.locator("#login-email").fill("admin@e2e.local");
    await page.locator("#login-password").fill("secret");
    await page.getByRole("button", { name: "Вход", exact: true }).click();

    await expect(page).toHaveURL(/\/unit\/list$/u);
    await expect(
      page.getByRole("heading", { name: "Юниты", exact: true }),
    ).toBeVisible();

    expect(requestBody).toMatchObject({
      username: "admin@e2e.local",
      password: "secret",
    });

    const stored = await page.evaluate(() =>
      window.localStorage.getItem("tokenData"),
    );
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored ?? "{}")).toMatchObject({
      token: tokenData.token,
      user: { email: "admin@e2e.local" },
    });
  });

  test("возвращает на исходный защищённый URL", async ({
    page,
    session,
    api,
  }) => {
    await session.logout();

    api.post("/login", ok(tokenDataFor("admin")));
    api.post("/project/list", ok([]));

    await page.goto("/unit/projects");
    await expect(page).toHaveURL(/\/login$/u);

    await page.locator("#login-email").fill("admin@e2e.local");
    await page.locator("#login-password").fill("secret");
    await page.getByRole("button", { name: "Вход", exact: true }).click();

    await expect(page).toHaveURL(/\/unit\/projects$/u);
    await expect(
      page.getByRole("heading", { name: "Проекты", exact: true }),
    ).toBeVisible();
  });

  test("показывает состояние уже авторизованного", async ({
    page,
    session,
  }) => {
    await session.loginAs("admin");

    await page.goto("/login");

    await expect(page.getByText("Уже авторизован", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Выйти", exact: true }),
    ).toBeVisible();
    await expect(page.locator("#login-email")).toHaveCount(0);
  });

  test("выход очищает сессию", async ({ page, session }) => {
    await session.loginAs("admin");

    await page.goto("/login");
    await page.getByRole("button", { name: "Выйти", exact: true }).click();

    await expect(page.locator("#login-email")).toBeVisible();

    const tokenData = await page.evaluate(() =>
      window.localStorage.getItem("tokenData"),
    );
    expect(tokenData).toBeNull();
  });
});
