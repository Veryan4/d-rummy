import { expect, test } from "@playwright/test";
import {
  drawFromDeck,
  startPrivateGame,
  uniqueName,
  waitForGame,
} from "./helpers";

test("crazy eights private lobby deals a two-player game", async ({
  browser,
}) => {
  const { host, guest, hostCtx, guestCtx } = await startPrivateGame(
    browser,
    uniqueName("Alice"),
    uniqueName("Bobby"),
    /Crazy Eights/i,
  );

  try {
    await waitForGame(host, /Current suit/i);
    await waitForGame(guest, /Current suit/i);
    await expect(host).toHaveURL(/\/crazy-eights/);
    await expect(guest).toHaveURL(/\/crazy-eights/);
    await expect(host.getByText(/Your Sets/i)).toHaveCount(0);
    await expect(host.locator(".pile game-card")).toHaveCount(1, {
      timeout: 20_000,
    });
    await expect(host.locator("card-hand game-card")).toHaveCount(7);
    await expect(guest.locator("card-hand game-card")).toHaveCount(7);

    await host.getByText("Menu", { exact: true }).click();
    await host.getByRole("menuitem", { name: /^help$/i }).click();
    await expect(host).toHaveURL(/\/crazy-eights/);
    await expect(host.getByText(/Playing a Queen skips/i)).toBeVisible();
    await expect(host.getByText(/Current suit/i)).toBeVisible();
    await host.getByRole("button", { name: /^close$/i }).click();
    await expect(host.getByText(/Playing a Queen skips/i)).toHaveCount(0);

    const actor = (await host
      .getByRole("heading", { name: /It's your turn/i })
      .isVisible())
      ? host
      : guest;
    await drawFromDeck(actor);
    await expect(actor.locator("card-hand game-card")).toHaveCount(8, {
      timeout: 20_000,
    });
  } finally {
    await hostCtx.close();
    await guestCtx.close();
  }
});

test("rummy private lobby deals a two-player game", async ({ browser }) => {
  const { host, guest, hostCtx, guestCtx } = await startPrivateGame(
    browser,
    uniqueName("Carla"),
    uniqueName("Diego"),
    /^Rummy$/,
  );

  try {
    await waitForGame(host, /Your Sets/i);
    await waitForGame(guest, /Your Sets/i);
    await expect(host).toHaveURL(/\/rummy/);
    await expect(guest).toHaveURL(/\/rummy/);
    await expect(host.getByText(/Current suit/i)).toHaveCount(0);
    await expect(host.locator("card-hand game-card")).toHaveCount(7);
    await expect(guest.locator("card-hand game-card")).toHaveCount(7);
  } finally {
    await hostCtx.close();
    await guestCtx.close();
  }
});
