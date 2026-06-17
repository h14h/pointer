import { test, expect, type Page } from "@playwright/test";

const BASE = "http://localhost:3000";

function countLeagueCards(page: Page) {
  // One "Open workspace" link per league card on the home grid.
  return page.getByRole("link", { name: /open workspace/i }).count();
}

// ---------------------------------------------------------------------------
// BDD-style persistence smoke test: mutate state via UI, refresh, verify.
// Exercises the Solstice IA: leagues → add league → workspace config → reload.
// ---------------------------------------------------------------------------
test("persistence smoke — leagues and scoring survive refresh", async ({ page }) => {
  // --- Step 0: First run — onboard into baseball ---
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /baseball/i }).first().click();
  await expect(page.getByRole("link", { name: /open workspace/i }).first()).toBeVisible({
    timeout: 10_000,
  });

  const initialLeagueCount = await countLeagueCards(page);

  // --- Step 1: Create a new baseball league from the home grid ---
  await page.getByRole("button", { name: /add a league/i }).click();
  await page.getByLabel(/league name/i).fill("Smoke Test League");
  await page.getByRole("button", { name: /^baseball$/i }).last().click();
  await page.getByRole("button", { name: /create/i }).click();
  await expect(page.getByText("Smoke Test League")).toBeVisible({ timeout: 5_000 });

  const afterCreateCount = await countLeagueCards(page);
  expect(afterCreateCount).toBe(initialLeagueCount + 1);

  // --- Step 2: Open its workspace → Config, change HR scoring weight ---
  const smokeCard = page
    .locator("div")
    .filter({ hasText: "Smoke Test League" })
    .getByRole("link", { name: /open workspace/i })
    .last();
  await smokeCard.click();
  await page.getByRole("link", { name: "Config", exact: true }).click();

  const hrInput = page.locator('input[aria-label="Home Runs (HR) points"]').first();
  await expect(hrInput).toBeVisible({ timeout: 10_000 });
  await hrInput.fill("6");
  await hrInput.press("Enter");
  await page.waitForTimeout(600); // debounced update + persist

  // --- Step 3: Hard refresh — config state must survive ---
  await page.reload({ waitUntil: "networkidle" });
  const hrAfter = page.locator('input[aria-label="Home Runs (HR) points"]').first();
  await expect(hrAfter).toBeVisible({ timeout: 10_000 });
  await expect(hrAfter).toHaveValue("6");
  await expect(page.locator("body")).toContainText("Smoke Test League");

  // --- Step 4: Back to leagues — league count survived too ---
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await expect(page.getByText("Smoke Test League")).toBeVisible({ timeout: 10_000 });
  const afterRefreshCount = await countLeagueCards(page);
  expect(afterRefreshCount).toBe(afterCreateCount);

  // --- Step 5: Clean up — delete the smoke league from its danger zone ---
  await page
    .locator("div")
    .filter({ hasText: "Smoke Test League" })
    .getByRole("link", { name: /open workspace/i })
    .last()
    .click();
  await page.getByRole("link", { name: "Config", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /delete league/i }).click();

  // Deleting bounces back home with the original count.
  await expect(page.getByRole("link", { name: /open workspace/i }).first()).toBeVisible({
    timeout: 10_000,
  });
  const finalCount = await countLeagueCards(page);
  expect(finalCount).toBe(initialLeagueCount);
});
