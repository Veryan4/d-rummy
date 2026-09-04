import { expect, type Browser, type Page } from "@playwright/test";

export type GameLabel = RegExp;

export async function fillMdField(page: Page, id: string, value: string) {
  const host = page.locator(`md-filled-text-field#${id}`);
  await host.waitFor({ state: "attached", timeout: 15_000 });
  await host.evaluate((el, v) => {
    const inputHost = el as HTMLInputElement;
    inputHost.value = v;
    const inner = inputHost.shadowRoot?.querySelector("input");
    if (inner) {
      inner.value = v;
      inner.dispatchEvent(
        new Event("input", { bubbles: true, composed: true }),
      );
    }
    inputHost.dispatchEvent(
      new Event("input", { bubbles: true, composed: true }),
    );
  }, value);
}

export async function clickButton(page: Page, pattern: RegExp) {
  await page.getByRole("button", { name: pattern }).first().click();
}

export async function login(page: Page, username: string) {
  await expect(page.getByText(/Pick a username/i)).toBeVisible();
  await fillMdField(page, "username", username);
  const submit = page.getByRole("button", { name: /^Submit$/i });
  await expect(submit).toBeEnabled({ timeout: 10_000 });
  await submit.click();
}

export async function loginAndPick(
  page: Page,
  username: string,
  gameLabel: GameLabel,
) {
  await page.goto("/");
  await login(page, username);
  await expect(page.getByText(/Choose a game/i)).toBeVisible();
  await clickButton(page, gameLabel);
  await expect(page.getByText(/How do you want to play/i)).toBeVisible();
}

export async function openAbout(page: Page) {
  await page.getByText("Menu", { exact: true }).click();
  await page.getByRole("menuitem", { name: /^help$/i }).click();
  await expect(
    page.getByText("Peer-to-peer card games", { exact: true }),
  ).toBeVisible();
}

export async function readInviteUrl(page: Page): Promise<string> {
  const loc = page.locator(".invite-link");
  await loc.waitFor({ state: "visible", timeout: 15_000 });
  return (await loc.innerText()).trim();
}

export async function joinInvite(page: Page, invite: string, username: string) {
  await page.goto(invite);
  const loginPrompt = page.getByText(/Pick a username/i);
  const joinForm = page.getByText(/Join your friend's game/i);
  const waiting = page.getByText(/Players Waiting|Waiting on Host/i);
  await expect(loginPrompt.or(joinForm).or(waiting).first()).toBeVisible({
    timeout: 20_000,
  });
  if (await loginPrompt.isVisible()) {
    await login(page, username);
  }
  if (await joinForm.isVisible()) {
    const hostId = new URL(invite, page.url()).searchParams.get("game") ?? "";
    await fillMdField(page, "lobby", hostId);
    await clickButton(page, /Join Game|^Join$/i);
  }
}

export async function startPrivateGame(
  browser: Browser,
  hostName: string,
  guestName: string,
  gameLabel: GameLabel,
) {
  const hostCtx = await browser.newContext();
  const guestCtx = await browser.newContext();
  const host = await hostCtx.newPage();
  const guest = await guestCtx.newPage();

  await loginAndPick(host, hostName, gameLabel);
  await clickButton(host, /Play with friends/i);
  await expect(host.getByText(/Create or Join a Private Game/i)).toBeVisible();
  await clickButton(host, /Create Game/i);
  await expect(host.getByText(/You are the host/i)).toBeVisible();

  const invite = await readInviteUrl(host);
  await joinInvite(guest, invite, guestName);
  await expect(host.getByText(guestName)).toBeVisible({ timeout: 20_000 });
  await clickButton(host, /Start Game/i);

  return { host, guest, hostCtx, guestCtx, invite };
}

export function uniqueName(prefix: string): string {
  const suffix = Math.random()
    .toString(36)
    .replace(/[^a-z0-9]/g, "")
    .slice(2, 8);
  return `${prefix}${suffix}`.slice(0, 16);
}

export async function waitForGame(page: Page, hint: RegExp, timeout = 40_000) {
  await expect(page.getByText(hint)).toBeVisible({ timeout });
}

export async function playMatchingCrazyEightsCard(page: Page) {
  const result = await page.evaluate(() => {
    function walk(
      root: ParentNode | ShadowRoot,
      selector: string,
      out: Element[] = [],
    ) {
      root.querySelectorAll(selector).forEach((el) => out.push(el));
      root.querySelectorAll("*").forEach((el) => {
        if (el.shadowRoot) {
          walk(el.shadowRoot, selector, out);
        }
      });
      return out;
    }
    const suitEl = walk(document, ".current-suit")[0];
    const suit = (suitEl?.textContent || "").trim();
    const pileCard = walk(document, ".pile game-card")[0];
    const pileRank = pileCard?.getAttribute("rank") || "";
    const handHost = walk(document, "card-hand")[0];
    const cards = handHost?.shadowRoot
      ? [...handHost.shadowRoot.querySelectorAll("game-card")]
      : [];
    const playable = cards.find((card) => {
      const rank = card.getAttribute("rank");
      const symbol = card.getAttribute("symbol");
      return rank === "8" || symbol === suit || rank === pileRank;
    });
    if (!playable) {
      return { played: false, suit, pileRank, hand: cards.length };
    }
    playable.dispatchEvent(
      new MouseEvent("click", { bubbles: true, composed: true }),
    );
    walk(document, ".pile")[0]?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, composed: true }),
    );
    return {
      played: true,
      rank: playable.getAttribute("rank"),
      symbol: playable.getAttribute("symbol"),
      suit,
      pileRank,
    };
  });
  if (result.played) {
    const suitBtn = page.locator("md-filled-button.suit-btn").first();
    if (await suitBtn.isVisible().catch(() => false)) {
      await suitBtn.click();
    }
  }
  return result;
}

export async function drawFromDeck(page: Page) {
  await page.locator(".deck").first().click({ force: true });
}
