import { expect, test } from "@playwright/test";
import { clickButton, login, loginAndPick, uniqueName } from "./helpers";

test("username, game picker, and change-game flow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Pick a username/i)).toBeVisible();
  await login(page, uniqueName("Smoke"));
  await expect(page.getByText(/Choose a game/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Rummy$/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Crazy Eights/i }),
  ).toBeVisible();

  await clickButton(page, /Crazy Eights/i);
  await expect(
    page.getByRole("heading", { name: /Crazy Eights/i }),
  ).toBeVisible();
  await expect(page.getByText(/How do you want to play/i)).toBeVisible();

  await clickButton(page, /Change game/i);
  await expect(page.getByText(/Choose a game/i)).toBeVisible();
  await clickButton(page, /^Rummy$/);
  await expect(page.getByText(/^Rummy$/)).toBeVisible();
  await expect(page.getByText(/Play with friends/i)).toBeVisible();
  await expect(page.getByText(/Play with strangers/i)).toBeVisible();
});

test("navigating home shows the game picker again", async ({ page }) => {
  await loginAndPick(page, uniqueName("Home"), /Crazy Eights/i);
  await expect(page.getByText(/How do you want to play/i)).toBeVisible();
  await page.locator("a.logo").click();
  await expect(page.getByText(/Choose a game/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Rummy$/ })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Crazy Eights/i }),
  ).toBeVisible();
});

test("private invite URL includes the selected game type", async ({ page }) => {
  await loginAndPick(page, uniqueName("Host"), /Crazy Eights/i);
  await clickButton(page, /Play with friends/i);
  await clickButton(page, /Create Game/i);
  await expect(page.getByText(/You are the host/i)).toBeVisible();
  await expect(page).toHaveURL(/\/private\?game=.+&type=crazy-eights/);
});
