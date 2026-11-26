import { ok } from "../support/api";
import { tokenDataFor } from "../support/session";
import { expect, test } from "../support/fixtures";

test.describe("OAuth-вход", () => {
  test("успешный exchange сохраняет сессию и ведёт в приложение", async ({
    page,
    session,
    api,
  }) => {
    await session.logout();

    api.post("/oauth/exchange", ok(tokenDataFor("admin")));

    await page.goto("/oauth/callback?code=one-time-code");

    await expect(page).toHaveURL(/\/unit\/list$/u);

    const stored = await page.evaluate(() =>
      window.localStorage.getItem("tokenData"),
    );
    expect(stored).not.toBeNull();
  });

  test("ошибка провайдера показывается на странице входа", async ({
    page,
    session,
  }) => {
    await session.logout();

    await page.goto("/login?oauthError=oauth.account.blocked");

    await expect(page.getByText("Аккаунт заблокирован.")).toBeVisible();
  });
});
