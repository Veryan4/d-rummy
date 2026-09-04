import { expect, test } from "@playwright/test";
import {
  clickButton,
  loginAndPick,
  uniqueName,
  waitForGame,
} from "./helpers";

test("crazy eights public queue matches two players", async ({ browser }) => {
  test.setTimeout(120_000);
  const aCtx = await browser.newContext();
  const bCtx = await browser.newContext();
  const a = await aCtx.newPage();
  const b = await bCtx.newPage();

  try {
    await loginAndPick(a, uniqueName("Elena"), /Crazy Eights/i);
    await clickButton(a, /Play with strangers/i);
    await expect(a.getByText(/Waiting for other players/i)).toBeVisible();

    await loginAndPick(b, uniqueName("Frank"), /Crazy Eights/i);
    await clickButton(b, /Play with strangers/i);

    await Promise.race([
      waitForGame(a, /Current suit/i, 60_000),
      waitForGame(b, /Current suit/i, 60_000),
    ]);
    await waitForGame(a, /Current suit/i, 30_000);
    await waitForGame(b, /Current suit/i, 30_000);
    await expect(a).toHaveURL(/\/crazy-eights/);
    await expect(b).toHaveURL(/\/crazy-eights/);
  } finally {
    await aCtx.close();
    await bCtx.close();
  }
});
