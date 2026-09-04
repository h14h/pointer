#!/usr/bin/env bun
/**
 * Playwright driver for verify-pointer feature recipes.
 *
 * Usage (from repo root, after helpers/launch + helpers/doctor):
 *   bun .cursor/skills/verify-pointer/helpers/drive.mjs league-onboarding
 *   bun .cursor/skills/verify-pointer/helpers/drive.mjs plan
 *   bun .cursor/skills/verify-pointer/helpers/drive.mjs intel
 *
 * Reads URL from .cursor/skills/verify-pointer/.run/state.json
 * Writes evidence under .cursor/skills/verify-pointer/evidence/<run-id>/
 * Always uses a fresh browser context (empty IndexedDB) unless
 * VERIFY_POINTER_REUSE_CONTEXT=1.
 */
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const skillDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const statePath = process.env.VERIFY_POINTER_STATE ?? join(skillDir, ".run/state.json");
const evidenceRoot = process.env.VERIFY_POINTER_EVIDENCE_DIR ?? join(skillDir, "evidence");

const featureId = process.argv[2];
if (!featureId) {
  console.error("usage: bun helpers/drive.mjs <feature-id>");
  console.error("mapped: league-onboarding | workspace-tabs | plan | board | intel | config | live-draft");
  process.exit(2);
}

let state;
try {
  state = JSON.parse(readFileSync(statePath, "utf8"));
} catch {
  console.error(`verify-pointer drive: missing state at ${statePath} — run helpers/launch`);
  process.exit(1);
}

const baseURL = state.url;
if (!baseURL?.includes("localhost")) {
  console.error("verify-pointer drive: URL must use hostname localhost (Vite binds ::1, not 127.0.0.1)");
  process.exit(1);
}

const runId = process.env.VERIFY_POINTER_RUN_ID ?? `${featureId}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const outDir = join(evidenceRoot, runId);
mkdirSync(outDir, { recursive: true });

const record = {
  feature: featureId,
  app: "DraftSpa",
  url: baseURL,
  startedAt: new Date().toISOString(),
  steps: [],
};

function step(id, status, detail) {
  record.steps.push({ id, status, detail });
  console.log(`${status === "ok" ? "ok" : "FAIL"} — ${id}: ${detail}`);
}

async function ariaDump(page, name) {
  const snapshot = await page.locator("body").ariaSnapshot();
  writeFileSync(join(outDir, name), snapshot);
  return snapshot;
}

async function shot(page, name) {
  const path = join(outDir, name);
  await page.screenshot({ path, fullPage: true });
  return path;
}

/** Fresh-context football fleet (hero if first visit). */
async function ensureFootballFleet(page) {
  await page.goto("/", { waitUntil: "networkidle" });
  if (await page.getByRole("button", { name: /^Football$/i }).isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /^Football$/i }).click();
  }
  await page.getByRole("link", { name: /open workspace/i }).first().waitFor({ timeout: 15_000 });
}

/** First-visit onboarding → football fleet, export, add baseball. */
async function driveLeagueOnboarding(page) {
  await page.goto("/", { waitUntil: "networkidle" });
  await shot(page, "01-onboarding-hero.png");
  const heroCopy = page.getByText(/Create your first league/i);
  await heroCopy.waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: /^Football$/i }).click();
  const openWorkspace = page.getByRole("link", { name: /open workspace/i }).first();
  await openWorkspace.waitFor({ timeout: 15_000 });
  await page.getByRole("heading", { name: "Leagues" }).waitFor();
  await page.getByText("My Football League").waitFor();
  await page.getByRole("button", { name: /add a league/i }).waitFor();
  await page.getByRole("button", { name: /export backup/i }).waitFor();
  await shot(page, "02-fleet-after-football.png");
  const aria = await ariaDump(page, "02-fleet-after-football.aria.txt");
  const url = page.url();
  if (!url.endsWith("/") && new URL(url).pathname !== "/") {
    throw new Error(`expected fleet URL /, got ${url}`);
  }
  if (!aria.includes("My Football League") && !(await page.getByText("My Football League").isVisible())) {
    throw new Error("fleet missing My Football League");
  }
  step("onboard-hero", "ok", "hero with Football / Baseball before click");
  step("onboard-football", "ok", "clicked Football; fleet shows My Football League + Open workspace + add a league");
  step("onboard-export", "ok", "Export backup visible on fleet");
  step("onboard-url", "ok", url);

  await page.getByRole("button", { name: /add a league/i }).click();
  await page.getByRole("heading", { name: "Add a league" }).waitFor();
  await page.getByLabel(/league name/i).fill("Sandlot Classic");
  await page.getByRole("button", { name: /^Baseball$/i }).last().click();
  await page.getByRole("button", { name: /create league/i }).click();
  await page.getByText("Sandlot Classic").waitFor({ timeout: 15_000 });
  await page.getByText(/2 leagues · 2 sports/i).waitFor();
  await shot(page, "03-fleet-two-leagues.png");
  step("onboard-add", "ok", "Create league appended Sandlot Classic; stamp 2 leagues · 2 sports");
}

/** Open workspace and walk Plan → Board → Intel → Config, then back + crumb. */
async function driveWorkspaceTabs(page) {
  await ensureFootballFleet(page);
  await page.getByRole("link", { name: /open workspace/i }).first().click();
  await page.waitForURL(/\/league\/[^/]+/, { timeout: 10_000 });
  await page.getByRole("heading", { name: "My Football League" }).waitFor({ timeout: 15_000 });
  const leagueId = new URL(page.url()).pathname.split("/")[2];
  await shot(page, "01-plan.png");
  step("plan", "ok", page.url());

  await page.getByRole("link", { name: "Board", exact: true }).click();
  await page.waitForURL(new RegExp(`/league/${leagueId}/board`));
  await page.locator("table tbody tr").first().waitFor({ timeout: 15_000 });
  await shot(page, "02-board.png");
  step("board", "ok", page.url());

  await page.getByRole("link", { name: "Intel", exact: true }).click();
  await page.waitForURL(new RegExp(`/league/${leagueId}/intel`));
  await page.getByRole("heading", { name: /football library/i }).waitFor({ timeout: 10_000 });
  await shot(page, "03-intel.png");
  step("intel", "ok", page.url());

  await page.getByRole("link", { name: "Config", exact: true }).click();
  await page.waitForURL(new RegExp(`/league/${leagueId}/config`));
  await page.getByRole("heading", { name: /league identity/i }).waitFor({ timeout: 10_000 });
  await shot(page, "04-config.png");
  step("config", "ok", page.url());

  const active = page.locator('nav a[aria-current="page"]');
  if ((await active.textContent())?.trim() !== "Config") {
    throw new Error(`expected active tab Config, got ${await active.textContent()}`);
  }

  await page.getByRole("link", { name: "Plan", exact: true }).click();
  await page.getByRole("link", { name: "Board", exact: true }).click();
  await page.getByRole("link", { name: "Config", exact: true }).click();
  await page.goBack();
  await page.waitForURL(new RegExp(`/league/${leagueId}/board`));
  if ((await active.textContent())?.trim() !== "Board") {
    throw new Error(`expected back-button tab Board, got ${await active.textContent()}`);
  }
  step("ws-back", "ok", "Plan→Board→Config then goBack landed on Board");

  await page.getByRole("link", { name: "leagues /" }).click();
  await page.waitForURL((next) => new URL(next).pathname === "/");
  await page.getByRole("link", { name: /open workspace/i }).first().waitFor();
  step("ws-crumb", "ok", "leagues / returned to fleet /");
}

async function drivePlan(page) {
  await ensureFootballFleet(page);
  await page.getByRole("link", { name: /open workspace/i }).first().click();
  await page.getByRole("heading", { name: /pick timeline/i }).waitFor({ timeout: 15_000 });
  await page.getByRole("heading", { name: "Targets" }).waitFor();
  await page.getByRole("heading", { name: "Tier supply" }).waitFor();
  await page.getByText("R1.01").waitFor();
  await shot(page, "01-plan-worksheet.png");
  step("plan-timeline", "ok", "Pick timeline + Targets + Tier supply on /plan");

  const targetSearch = page.getByRole("textbox", { name: "Search players to flag as targets" });
  await targetSearch.fill("chase");
  await page.getByRole("button", { name: /Ja'Marr Chase/i }).click();
  await page.getByText(/1 flagged/i).waitFor();
  await shot(page, "02-plan-target.png");
  step("plan-targets", "ok", "flagged Ja'Marr Chase from targets search");

  const note = page.getByRole("textbox", { name: /Round 1 note/i });
  await note.fill("force RB if CMC gone");
  await note.blur();
  await page.getByRole("link", { name: "Board", exact: true }).click();
  await page.getByRole("link", { name: "Plan", exact: true }).click();
  await page.getByRole("textbox", { name: /Round 1 note/i }).waitFor();
  const kept = await page.getByRole("textbox", { name: /Round 1 note/i }).inputValue();
  if (kept !== "force RB if CMC gone") {
    throw new Error(`Round 1 note lost after tab switch: ${JSON.stringify(kept)}`);
  }
  await shot(page, "03-plan-note.png");
  step("plan-notes", "ok", "Round 1 note persisted across Board → Plan");
}

async function driveBoard(page) {
  await ensureFootballFleet(page);
  await page.getByRole("link", { name: /open workspace/i }).first().click();
  await page.getByRole("link", { name: "Board", exact: true }).click();
  await page.locator("table tbody tr").first().waitFor({ timeout: 15_000 });
  await shot(page, "01-board-all.png");
  await page.getByPlaceholder("Search players...").fill("chase");
  // Football Board abbreviates names (Ja'Marr Chase → "J. Chase").
  await page.getByText("J. Chase", { exact: true }).waitFor({ timeout: 10_000 });
  await shot(page, "02-board-search-chase.png");
  step("search", "ok", "search chase shows abbreviated J. Chase");

  await page.getByRole("button", { name: "Position" }).click();
  await page.getByRole("button", { name: "RB", exact: true }).click();
  await page.getByText(/Page 1 of/).waitFor();
  await shot(page, "03-board-position-rb.png");
  step("position", "ok", "Position RB applied on the chase-filtered board");
}

async function driveIntel(page) {
  await ensureFootballFleet(page);
  await page.getByRole("link", { name: /open workspace/i }).first().click();
  await page.getByRole("link", { name: "Intel", exact: true }).click();
  await page.waitForURL(/\/intel/);
  await page.getByRole("heading", { name: /football library/i }).waitFor({ timeout: 15_000 });
  const footballSource = page.getByRole("heading", { name: "2025 Football Prior-Year Stats" });
  await footballSource.waitFor();
  // Both sport libraries can show a Built-in badge after bootstrap.
  await footballSource.locator("xpath=..").getByText("Built-in").waitFor();
  await page.getByText("Selected").first().waitFor();
  await page.getByRole("button", { name: /upload csv/i }).waitFor();
  await page.getByRole("heading", { name: /baseball library/i }).waitFor();
  await shot(page, "01-intel-libraries.png");
  step("intel-own", "ok", "football library + built-in Selected + Upload CSV");
  step("intel-other", "ok", "baseball library heading present");
}

async function driveConfig(page) {
  await ensureFootballFleet(page);
  await page.getByRole("link", { name: /open workspace/i }).first().click();
  await page.getByRole("link", { name: "Config", exact: true }).click();
  const nameInput = page.locator("label").filter({ hasText: /league name/i }).locator("input");
  await nameInput.waitFor({ timeout: 10_000 });
  await nameInput.fill("Verify Pointer League");
  await nameInput.blur();
  await page.getByRole("heading", { name: "Verify Pointer League" }).waitFor({ timeout: 5_000 });
  await shot(page, "01-renamed.png");
  step("rename", "ok", "masthead heading is Verify Pointer League");

  await page.getByRole("link", { name: "leagues /" }).click();
  await page.waitForURL((next) => new URL(next).pathname === "/");
  await page.getByRole("heading", { name: "Verify Pointer League" }).waitFor({ timeout: 5_000 });
  await shot(page, "02-fleet-renamed.png");
  step("rename-fleet", "ok", "fleet card title is Verify Pointer League");
}

async function driveLiveDraft(page) {
  await ensureFootballFleet(page);
  await page.getByRole("link", { name: /open workspace/i }).first().click();
  await page.getByRole("button", { name: /start live draft/i }).click();
  await page.waitForURL(/\/draft/);
  const log = page.getByRole("textbox", { name: /log a pick/i });
  await log.waitFor({ timeout: 15_000 });
  await shot(page, "01-draft-room.png");
  await log.fill("mccaffrey");
  await log.press("Enter");
  await page.getByText(/logged: p1/i).waitFor({ timeout: 10_000 });
  await shot(page, "02-after-quicklog.png");
  step("draft-quicklog", "ok", "quick-log mccaffrey → logged: p1");

  await page.getByRole("button", { name: /exit live draft/i }).click();
  await page.waitForURL(/\/plan/);
  await page.getByText("logged", { exact: true }).first().waitFor({ timeout: 10_000 });
  await page.getByText(/McCaffrey/i).waitFor();
  await shot(page, "03-exited-to-plan.png");
  step("draft-enter-exit", "ok", "entered /draft, logged a pick, returned to /plan with logged McCaffrey");
}

const drivers = {
  "league-onboarding": driveLeagueOnboarding,
  "workspace-tabs": driveWorkspaceTabs,
  plan: drivePlan,
  board: driveBoard,
  intel: driveIntel,
  config: driveConfig,
  "live-draft": driveLiveDraft,
};

const driver = drivers[featureId];
if (!driver) {
  console.error(`unknown feature ${featureId}`);
  process.exit(2);
}

const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL,
  viewport: { width: 1280, height: 900 },
  reducedMotion: "reduce",
});
const page = await context.newPage();

try {
  await driver(page);
  record.result = "PASS";
} catch (error) {
  record.result = "FAIL";
  record.error = String(error);
  await shot(page, "FAIL.png").catch(() => {});
  throw error;
} finally {
  record.finishedAt = new Date().toISOString();
  writeFileSync(join(outDir, "run-record.json"), JSON.stringify(record, null, 2) + "\n");
  const md = [
    `# Run record — ${featureId}`,
    `- date: ${record.startedAt}`,
    `- app: ${baseURL}`,
    `- result: ${record.result}`,
    `- evidence: ${outDir}`,
    "",
    ...record.steps.map((s) => `- ${s.status} — ${s.id}: ${s.detail}`),
    record.error ? `\nERROR: ${record.error}` : "",
  ].join("\n");
  writeFileSync(join(outDir, "run-record.md"), md + "\n");
  await browser.close();
  console.log(`verify-pointer drive: ${record.result} → ${outDir}`);
}

if (record.result !== "PASS") {
  process.exit(1);
}
