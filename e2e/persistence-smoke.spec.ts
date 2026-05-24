import { test, expect, type Page } from "@playwright/test";

const BASE = "http://localhost:3000";

async function waitForSettingsSection(page: Page, sectionName: string) {
  await page.waitForSelector(`h2:has-text("${sectionName}")`, { timeout: 10_000 });
  await page.waitForTimeout(300);
}

function countLeagues(page: Page) {
  return page.locator('button[title="Delete league"]').count();
}

// ---------------------------------------------------------------------------
// BDD-style persistence smoke test: mutate state via UI, refresh, verify
// ---------------------------------------------------------------------------
test("persistence smoke — leagues and scoring survive refresh", async ({ page }) => {
  // --- Step 1: Open Leagues settings ---
  await page.goto(`${BASE}/settings?section=leagues`);
  await waitForSettingsSection(page, "Leagues");

  const initialLeagueCount = await countLeagues(page);

  // --- Step 2: Create a new league ---
  await page.getByRole("button", { name: "Create New League" }).click();
  await page.waitForTimeout(300);

  const afterCreateCount = await countLeagues(page);
  expect(afterCreateCount).toBe(initialLeagueCount + 1);

  // --- Step 3: Rename the new (last) league ---
  // The last league name is the last text button in the list
  const nameButtons = page.locator(
    'button.text-left.text-sm.font-medium'
  );
  const lastNameButton = nameButtons.last();
  await lastNameButton.click();
  await page.waitForTimeout(100);

  const nameInput = page.locator('input[aria-label="League name"]').last();
  await nameInput.fill("Smoke Test League");
  await nameInput.press("Enter");
  await page.waitForTimeout(300);

  // Verify rename stuck
  await expect(page.locator('body')).toContainText("Smoke Test League");

  // --- Step 4: Go to Scoring, change HR weight ---
  await page.goto(`${BASE}/settings?section=scoring`);
  await waitForSettingsSection(page, "Scoring");

  const hrInput = page.locator('input[aria-label="Home Runs (HR) points"]').first();
  await expect(hrInput).toBeVisible({ timeout: 5_000 });
  await hrInput.fill("6");
  await hrInput.press("Enter");
  await page.waitForTimeout(500); // debounced update + persist

  // --- Step 5: Hard refresh ---
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // --- Step 6: Verify Leagues persisted ---
  await page.goto(`${BASE}/settings?section=leagues`);
  await waitForSettingsSection(page, "Leagues");

  const afterRefreshCount = await countLeagues(page);
  expect(afterRefreshCount).toBe(afterCreateCount);
  await expect(page.locator('body')).toContainText("Smoke Test League");

  // --- Step 7: Verify Scoring persisted ---
  await page.goto(`${BASE}/settings?section=scoring`);
  await waitForSettingsSection(page, "Scoring");

  const hrAfter = page.locator('input[aria-label="Home Runs (HR) points"]').first();
  await expect(hrAfter).toHaveValue("6");

  // --- Step 8: Clean up — delete the smoke-test league ---
  await page.goto(`${BASE}/settings?section=leagues`);
  await waitForSettingsSection(page, "Leagues");

  // Find the smoke league row and click its Delete button
  const smokeRow = page.locator('button.text-left.text-sm.font-medium').filter({
    hasText: "Smoke Test League",
  }).locator('xpath=../../..'); // go up to the league row div

  if (await smokeRow.isVisible().catch(() => false)) {
    const deleteBtn = smokeRow.locator('button[title="Delete league"]').first();
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
      await page.waitForTimeout(200);
      const confirmBtn = smokeRow.locator('button').filter({ hasText: "Delete" }).first();
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(300);
      }
    }
  }
});
