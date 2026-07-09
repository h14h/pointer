import { test, expect, type Page } from "@playwright/test";
import {
  leagueRouteCases,
  TAB_LABELS,
  type LeagueRouteCase,
} from "../src/test/contracts/leagueRoutes/fixtures";

// ---------------------------------------------------------------------------
// League URL contract: every /league/* URL must keep resolving to the same
// screen. The fixture list (src/test/contracts/leagueRoutes/fixtures.ts)
// describes URL → observable outcome with zero framework specifics.
//
// PHASE 2 INTENT (TanStack Start migration): today these URLs are served by a
// Next.js rewrite onto one static shell page that parses the browser URL
// client-side. After the migration to real TanStack Router routes, this exact
// spec + fixtures must pass UNCHANGED — only the dev server behind them
// changes. If a case here breaks, a user's bookmark broke.
// ---------------------------------------------------------------------------

const LEAGUE_NAME = "URL Contract League";

/**
 * Seed one deterministic league via the UI (same flow as
 * persistence-smoke.spec.ts: onboard into baseball, add a league) and return
 * its id, read from the workspace URL. State lives in the context's local
 * persistence, so every fixture navigation in the same context can see it.
 */
async function seedLeague(page: Page): Promise<string> {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /baseball/i }).first().click();
  await expect(
    page.getByRole("link", { name: /open workspace/i }).first(),
  ).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: /add a league/i }).click();
  await page.getByLabel(/league name/i).fill(LEAGUE_NAME);
  await page.getByRole("button", { name: /^baseball$/i }).last().click();
  await page.getByRole("button", { name: /create/i }).click();
  await expect(page.getByText(LEAGUE_NAME)).toBeVisible({ timeout: 5_000 });

  // Open its workspace; the card links to /league/<id>/plan.
  await page
    .locator("div")
    .filter({ hasText: LEAGUE_NAME })
    .getByRole("link", { name: /open workspace/i })
    .last()
    .click();
  await page.waitForURL(/\/league\/[^/]+/, { timeout: 10_000 });

  const leagueId = new URL(page.url()).pathname.split("/")[2];
  expect(leagueId).toBeTruthy();
  return leagueId;
}

async function assertOutcome(page: Page, routeCase: LeagueRouteCase) {
  const { expected } = routeCase;

  if (expected.screen === "workspace") {
    // Workspace chrome: the league masthead heading is up...
    await expect(
      page.getByRole("heading", { name: LEAGUE_NAME }),
    ).toBeVisible({ timeout: 15_000 });
    // ...and exactly one tab-rail link is marked active, with the right label.
    const activeTab = page.locator('nav a[aria-current="page"]');
    await expect(activeTab).toHaveCount(1);
    await expect(activeTab).toHaveText(TAB_LABELS[expected.activeTab]);
    return;
  }

  if (expected.screen === "draft-room") {
    // Live draft takeover: the pick-log input is up, workspace chrome is not.
    await expect(
      page.getByRole("textbox", { name: /log a pick/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('nav a[aria-current="page"]')).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: LEAGUE_NAME }),
    ).toHaveCount(0);
    return;
  }

  // screen === "home": a client-side redirect lands on the league list.
  await page.waitForURL((url) => new URL(url).pathname === "/", {
    timeout: 15_000,
  });
  await expect(
    page.getByRole("link", { name: /open workspace/i }).first(),
  ).toBeVisible({ timeout: 10_000 });
}

// One page per worker: seed once, then drive every fixture through it via
// full-page navigations (exactly what a bookmark or shared link does).
let page: Page;
let leagueId: string;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  leagueId = await seedLeague(page);
});

test.afterAll(async () => {
  await page?.close();
});

for (const routeCase of leagueRouteCases) {
  test(`league URL contract: ${routeCase.name}`, async () => {
    const path = routeCase.path.replace("{leagueId}", leagueId);
    await page.goto(path);
    await assertOutcome(page, routeCase);
  });
}
