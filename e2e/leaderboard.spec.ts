import { test, expect, type Page } from "@playwright/test";

const BASE = "/leaderboard-visual";

/**
 * Wait for the leaderboard table to fully render before screenshotting.
 */
async function waitForTable(page: Page) {
	await page.waitForSelector("table tbody tr", { timeout: 15_000 });
	// Let any CSS transitions / deferred renders settle
	await page.waitForTimeout(300);
}

// ---------------------------------------------------------------------------
// Full container — filters + table + pagination
// ---------------------------------------------------------------------------
test("leaderboard — full container", async ({ page }) => {
	await page.goto(BASE);
	await waitForTable(page);

	const container = page.getByTestId("leaderboard-visual");
	await expect(container).toHaveScreenshot("leaderboard-full.png");
});

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

// ---------------------------------------------------------------------------
// Horizontal scroll — frozen #/ADP/Name columns over scrolled content
// ---------------------------------------------------------------------------
test("leaderboard — scrolled horizontally", async ({ page }) => {
	// Narrow viewport so the default column set overflows — the columns picker
	// no longer has per-group "All" buttons to widen the table with, and what
	// this test actually guards is the frozen #/ADP/Name columns rendering
	// over horizontally-scrolled content.
	await page.setViewportSize({ width: 720, height: 900 });
	await page.goto(BASE);
	await waitForTable(page);

	// Scroll the overflow container fully to the right and verify it scrolled
	const scrollContainer = page.locator(".overflow-x-auto");
	const scrolled = await scrollContainer.evaluate((el) => {
		el.scrollLeft = el.scrollWidth;
		return el.scrollLeft;
	});
	expect(scrolled).toBeGreaterThan(0);
	await page.waitForTimeout(300);

	const table = page.locator("table");
	await expect(table).toHaveScreenshot("leaderboard-scrolled.png");
});
