import { test, expect } from "@playwright/test";

const BASE = "/leaderboard-visual";

/**
 * Wait for the leaderboard table to fully render before screenshotting.
 */
async function waitForTable(page: import("@playwright/test").Page) {
	await page.waitForSelector("table tbody tr", { timeout: 15_000 });
	// Let any CSS transitions / deferred renders settle
	await page.waitForTimeout(300);
}

// ---------------------------------------------------------------------------
// Default (all players) view
// ---------------------------------------------------------------------------
test("leaderboard — default view", async ({ page }) => {
	await page.goto(BASE);
	await waitForTable(page);

	const table = page.locator("table");
	await expect(table).toHaveScreenshot("leaderboard-default.png");
});

// ---------------------------------------------------------------------------
// Draft mode — shows drafted / keeper badges, dimmed rows
// ---------------------------------------------------------------------------
test("leaderboard — draft mode", async ({ page }) => {
	await page.goto(`${BASE}?variant=draft`);
	await waitForTable(page);

	const table = page.locator("table");
	await expect(table).toHaveScreenshot("leaderboard-draft.png");
});

// ---------------------------------------------------------------------------
// Pitchers-only view — switches columns to pitching stats
// ---------------------------------------------------------------------------
test("leaderboard — pitchers view", async ({ page }) => {
	await page.goto(`${BASE}?variant=pitchers`);
	await waitForTable(page);

	// Switch to pitchers view via the player type dropdown
	await page.getByRole("button", { name: "Player type" }).click();
	await page.getByRole("button", { name: "Pitchers" }).click();

	// Wait for the table to re-render with pitching columns
	await page.waitForSelector('th:has-text("ERA")', { timeout: 5_000 });
	await page.waitForTimeout(300);

	const table = page.locator("table");
	await expect(table).toHaveScreenshot("leaderboard-pitchers.png");
});
