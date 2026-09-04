import { expect, test } from "@playwright/test";
import { login, loginAndPick, openAbout, uniqueName } from "./helpers";

test("help for crazy eights shows eights-specific rules", async ({ page }) => {
  await loginAndPick(page, uniqueName("Rules"), /Crazy Eights/i);
  await openAbout(page);
  await expect(page).toHaveURL(/\/about/);
  await expect(page.getByText(/Playing a Queen skips/i)).toBeVisible();
  await expect(page.getByText(/forces the next player to draw two cards/i)).toBeVisible();
  await expect(page.getByText(/ADDING TO SETS/i)).toHaveCount(0);
});

test("help for rummy shows rummy rules only", async ({ page }) => {
  await loginAndPick(page, uniqueName("Rules"), /^Rummy$/);
  await openAbout(page);
  await expect(page.getByText(/ADDING TO SETS/i)).toBeVisible();
  await expect(page.getByText(/Playing a Queen skips/i)).toHaveCount(0);
});

test("help with no game selected shows both rule sets", async ({ page }) => {
  await page.goto("/");
  await login(page, uniqueName("Help"));
  await expect(page.getByText(/Choose a game/i)).toBeVisible();
  await openAbout(page);
  await expect(page).toHaveURL(/\/about/);
  await expect(page.getByText(/Peer-to-peer card games/i)).toBeVisible();
  await expect(page.getByText(/Playing a Queen skips/i)).toBeVisible();
  await expect(page.getByText(/ADDING TO SETS/i)).toBeVisible();
});
