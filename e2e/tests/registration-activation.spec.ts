import { ok } from "../support/api";
import { tokenDataFor } from "../support/session";
import { expect, test } from "../support/fixtures";

test.describe("Регистрация и активация", () => {
  test("регистрация ведёт на страницу подтверждения email", async ({
    page,
    session,
    api,
  }) => {
    await session.logout();

    let requestBody: unknown = null;

    api.post("/account/requestRegistration", ({ body }: { body: unknown }) => {
      requestBody = body;

      return ok({ id: "acc-pending-1" });
    });

    await page.goto("/register");

    await page.locator("#register-email").fill("new@e2e.local");
    await page.locator("#register-password").fill("secret123");
    await page.locator("#register-password-repeat").fill("secret123");
    await page
      .getByRole("button", { name: "Зарегистрироваться", exact: true })
      .click();

    await expect(page).toHaveURL(/\/verify-email/u);
    await expect(page.locator("#verify-email")).toHaveValue("new@e2e.local");

    expect(requestBody).toMatchObject({
      email: "new@e2e.local",
      password: "secret123",
    });
  });

  test("код из письма подтверждает email", async ({ page, session, api }) => {
    await session.logout();

    api.post("/account/verifyEmail", ok(null));

    await page.goto("/verify-email?email=new@e2e.local");
    await page.locator("#verify-code").fill("123456");
    await page.getByRole("button", { name: "Подтвердить", exact: true }).click();

    await expect(page.getByText("Email подтверждён", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Аккаунт ожидает активации администратором."),
    ).toBeVisible();
  });

  test("неактивированный пользователь видит только страницу ожидания", async ({
    page,
    session,
  }) => {
    await session.loginAs("user", {
      roles: ["ROLE_PENDING"],
      activationPending: true,
    });

    await page.goto("/unit/list");

    await expect(page).toHaveURL(/\/pending$/u);
    await expect(
      page.getByText("Аккаунт ожидает активации", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Добро пожаловать в Unitman" }),
    ).toBeVisible();
  });

  test("вход неактивированного пользователя ведёт на страницу ожидания", async ({
    page,
    session,
    api,
  }) => {
    await session.logout();

    api.post(
      "/login",
      ok(
        tokenDataFor("user", {
          roles: ["ROLE_PENDING"],
          activationPending: true,
        }),
      ),
    );

    await page.goto("/login");
    await page.locator("#login-email").fill("pending@e2e.local");
    await page.locator("#login-password").fill("secret");
    await page.getByRole("button", { name: "Вход", exact: true }).click();

    await expect(page).toHaveURL(/\/pending$/u);
    await expect(
      page.getByText("Аккаунт ожидает активации", { exact: true }),
    ).toBeVisible();
  });
});
