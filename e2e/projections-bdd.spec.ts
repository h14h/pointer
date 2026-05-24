import { test, expect, type Page } from "@playwright/test";
import { writeFileSync, unlinkSync } from "fs";

const BASE = "http://localhost:3000";

async function openProjections(page: Page) {
  // Seed built-in datasets by visiting the home page first
  await page.goto(`${BASE}/`);
  await page.waitForTimeout(3000); // allow PublicDatasetBootstrap to fetch & seed

  // Navigate to settings and wait for projection groups to render
  await page.goto(`${BASE}/settings?section=projections`);
  await page.waitForSelector('h2:has-text("Projections")', { timeout: 10_000 });
  // Poll until at least one group appears (up to 10s)
  await expect.poll(
    async () => {
      const text = await page.locator("body").textContent();
      return text?.includes("batters") ?? false;
    },
    { timeout: 10_000, message: "Waiting for projection groups to load" }
  ).toBe(true);
}

/** Click Continue if the ID-selection screen appears (no MLBAMID/PlayerId in CSV). */
async function maybeContinueThroughIdSelection(page: Page) {
  const idSelectionPanel = page.locator("text=No MLBAMID or PlayerId column found").first();
  if (await idSelectionPanel.isVisible().catch(() => false)) {
    const continueBtn = page.getByRole("button", { name: "Continue" });
    await continueBtn.click();
    await page.waitForTimeout(600);
  }
}

/** Create a minimal batter CSV upload so we have an uploaded group to mutate. */
async function ensureUploadedGroupExists(page: Page, name: string) {
  const hasGroup = await page.locator("body").textContent().then((t) => t?.includes(name) ?? false);
  if (hasGroup) return;

  const battersPath = `/tmp/e2e-batters-${name.replace(/\s+/g, "-")}.csv`;
  writeFileSync(
    battersPath,
    "Name,Team,MLBAMID,PA,AB,H,1B,2B,3B,HR,R,RBI,BB,SO,SB,CS,AVG,OBP,SLG\n" +
      `Test Player,TST,${Math.floor(Math.random() * 900000) + 100000},600,550,160,100,30,5,25,90,85,60,120,15,5,0.291,0.350,0.480\n`
  );

  await page.getByRole("button", { name: "Upload Projections" }).click();
  await page.waitForTimeout(200);
  await page.locator('input[type="file"]').setInputFiles(battersPath);
  await page.waitForTimeout(500);
  await maybeContinueThroughIdSelection(page);

  const nameInput = page.locator('input[placeholder="e.g. Steamer 2025"]').first();
  await nameInput.fill(name);
  await page.waitForTimeout(100);

  const importBtn = page.getByRole("button").filter({ hasText: /Import Group/ }).first();
  await importBtn.click();
  await page.waitForTimeout(1000);

  unlinkSync(battersPath);
  await expect(page.locator("body")).toContainText(name);
}

// ---------------------------------------------------------------------------
// BDD: Projections Settings scenarios
// ---------------------------------------------------------------------------

test.describe("Projections Settings BDD", () => {
  test("Projections section loads with group list", async ({ page }) => {
    await openProjections(page);

    await expect(page.getByRole("heading", { name: "Projections" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Upload Projections" })).toBeVisible();
    await expect(page.locator("body")).toContainText("batters");
  });

  test("Activate a projection group", async ({ page }) => {
    await openProjections(page);

    const useButtons = page.getByRole("button", { name: "Use" });
    const count = await useButtons.count();
    if (count === 0) {
      test.info().annotations.push({ type: "skip-reason", description: "No non-active projection groups available" });
      return;
    }

    await useButtons.first().click();
    await page.waitForTimeout(300);

    await expect(page.getByRole("button", { name: "Active" })).toBeVisible();
  });

  test("Built-in datasets are protected from deletion", async ({ page }) => {
    await openProjections(page);

    // Built-in groups show a "Built-in datasets stay protected" message
    const protectedMsg = page.locator("text=Built-in datasets stay protected");
    await expect(protectedMsg).toBeVisible();

    // Ensure there is NO "Delete Projection Group" label inside a built-in card.
    const deletePanels = page.locator("text=Delete Projection Group");
    const publicGroups = await page.locator("text=Public Dataset").count();
    if (publicGroups > 0) {
      expect(await deletePanels.count()).toBe(0);
    }
  });

  test("Rename a projection group", async ({ page }) => {
    await openProjections(page);
    await ensureUploadedGroupExists(page, "Rename Test Group");

    // Find the rename input scoped from the "Rename Projection Group" label
    const renameInput = page.locator("text=Rename Projection Group").locator("xpath=../..//input[@type='text']").first();
    await renameInput.fill("Renamed BDD Group");
    await page.waitForTimeout(100);

    const saveBtn = page.locator("text=Rename Projection Group").locator("xpath=../..//button[contains(.,'Save Name')]").first();
    await saveBtn.click();
    await page.waitForTimeout(300);

    await expect(page.locator("body")).toContainText("Renamed BDD Group");

    // Rename back
    await renameInput.fill("Rename Test Group");
    await renameInput.press("Enter");
    await page.waitForTimeout(300);
  });

  test("Delete a projection group", async ({ page }) => {
    await openProjections(page);
    await ensureUploadedGroupExists(page, "Delete Test Group");

    const deleteBtn = page.locator("text=Delete Projection Group").locator("xpath=../..//button[contains(.,'Delete Group')]").first();
    await deleteBtn.click();
    await page.waitForTimeout(200);

    const confirmBtn = page.locator("text=Delete Projection Group").locator("xpath=../..//button[contains(.,'Confirm Delete')]").first();
    await expect(confirmBtn).toBeVisible();

    await confirmBtn.click();
    await page.waitForTimeout(500);

    await expect(page.locator("text=Delete Test Group")).not.toBeVisible();
  });

  test("Upload a new batter and pitcher CSV projection group", async ({ page }) => {
    await openProjections(page);

    // Cleanup: remove test group if it exists from a prior run
    const existing = page.locator("text=BDD Upload Test").first();
    if (await existing.isVisible().catch(() => false)) {
      const card = existing.locator("xpath=ancestor::div[contains(@class,'border')]").first();
      const deleteBtn = card.getByRole("button", { name: "Delete Group" });
      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(200);
        const confirm = card.getByRole("button", { name: "Confirm Delete" });
        if (await confirm.isVisible().catch(() => false)) await confirm.click();
        await page.waitForTimeout(500);
      }
    }

    const battersPath = "/tmp/e2e-batters.csv";
    const pitchersPath = "/tmp/e2e-pitchers.csv";

    writeFileSync(
      battersPath,
      "Name,Team,MLBAMID,PA,AB,H,1B,2B,3B,HR,R,RBI,BB,SO,SB,CS,AVG,OBP,SLG\n" +
        "John Doe,NYY,111111,600,550,160,100,30,5,25,90,85,60,120,15,5,0.291,0.350,0.480\n" +
        "Jane Doe,BOS,222222,580,520,155,95,35,3,22,85,80,55,110,20,8,0.298,0.360,0.495\n"
    );

    writeFileSync(
      pitchersPath,
      "Name,Team,MLBAMID,W,L,QS,CG,ShO,G,GS,SV,HLD,BS,IP,H,R,ER,HR,BB,SO,ERA,WHIP,K/9,BB/9,FIP\n" +
        "Ace Pitcher,LAD,333333,15,5,20,2,1,30,30,0,0,0,190,140,60,55,18,45,210,2.60,0.97,9.9,2.1,3.20\n" +
        "Closer Star,NYM,444444,3,2,0,0,0,60,0,35,5,3,65,45,20,18,5,15,75,2.49,0.92,10.4,2.1,3.10\n"
    );

    await page.getByRole("button", { name: "Upload Projections" }).click();
    await page.waitForTimeout(200);

    await expect(page.locator("body")).toContainText("Upload Player Projections");

    await page.locator('input[type="file"]').setInputFiles([battersPath, pitchersPath]);
    await page.waitForTimeout(800);
    await maybeContinueThroughIdSelection(page);

    // Verify detected counts are > 0
    await expect(page.locator("body")).toContainText("Detected:");
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toMatch(/Detected:\s*\d+\s*batters?/);
    expect(bodyText).toMatch(/Detected:\s*\d+\s*pitchers?/);

    // Preview should be visible
    await expect(page.locator("text=Preview").first()).toBeVisible();

    // Set group name
    const nameInput = page.locator('input[placeholder="e.g. Steamer 2025"]').first();
    await nameInput.fill("BDD Upload Test");
    await page.waitForTimeout(100);

    // Click Import Group
    const importBtn = page.getByRole("button").filter({ hasText: /Import Group/ }).first();
    await importBtn.click();
    await page.waitForTimeout(1000);

    // Dialog should close and group should appear in list
    await expect(page.locator("text=Upload Player Projections")).not.toBeVisible();
    await expect(page.locator("body")).toContainText("BDD Upload Test");
    await expect(page.locator("body")).toContainText("Upload");

    // Cleanup
    const testGroup = page.locator("text=BDD Upload Test").first();
    if (await testGroup.isVisible().catch(() => false)) {
      const card = testGroup.locator("xpath=ancestor::div[contains(@class,'border')]").first();
      const deleteBtn = card.getByRole("button", { name: "Delete Group" });
      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(200);
        const confirm = card.getByRole("button", { name: "Confirm Delete" });
        if (await confirm.isVisible().catch(() => false)) await confirm.click();
        await page.waitForTimeout(500);
      }
    }

    unlinkSync(battersPath);
    unlinkSync(pitchersPath);
  });

  test("Upload an invalid CSV shows zero detected players and does not crash", async ({ page }) => {
    await openProjections(page);

    const invalidPath = "/tmp/e2e-invalid.csv";
    writeFileSync(invalidPath, "Product,Category,Price\nWidget,A,10.99\n");

    await page.getByRole("button", { name: "Upload Projections" }).click();
    await page.waitForTimeout(200);

    await expect(page.locator("body")).toContainText("Upload Player Projections");

    await page.locator('input[type="file"]').setInputFiles(invalidPath);
    await page.waitForTimeout(800);

    // No MLBAMID/PlayerId → ID selection screen appears
    const idSelectionPanel = page.locator("text=No MLBAMID or PlayerId column found").first();
    if (await idSelectionPanel.isVisible().catch(() => false)) {
      await page.getByRole("button", { name: "Continue" }).click();
      await page.waitForTimeout(600);
    }

    // Should show Detected: 0
    await expect(page.locator("body")).toContainText("Detected: 0");

    // Preview table should show no rows
    const previewTable = page.locator("text=Preview").first();
    if (await previewTable.isVisible().catch(() => false)) {
      const rows = previewTable.locator("xpath=../..//table//tbody//tr").count();
      expect(await rows).toBe(0);
    }

    // Close dialog: click Back to return to file select, then Cancel
    await page.getByRole("button", { name: "Back" }).click();
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "Cancel" }).click();
    await page.waitForTimeout(300);
    await expect(page.locator("text=Upload Player Projections")).not.toBeVisible();

    unlinkSync(invalidPath);
  });
});
