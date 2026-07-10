import { defineConfig, devices } from "@playwright/test";

// E2E + visual suites against the TanStack Start dev server.
// - leaderboard.spec.ts         — visual goldens (5 screenshots, zero-diff)
// - league-url-contract.spec.ts — the locked /league/* URL contract (17 cases)
// - persistence-smoke.spec.ts   — state survives refresh
// Runs on its own port so it never touches a live dev server (e.g. the
// Tidewave-managed one on :3000).
// PW_PORT lets parallel checkouts/worktrees run the suite concurrently
// without colliding on one port.
const PORT = Number(process.env.PW_PORT) || (process.env.CI ? 3099 : 3200);

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: "html",

	expect: {
		toHaveScreenshot: {
			// Tight tolerance — only absorb sub-pixel antialiasing, not real styling changes
			maxDiffPixelRatio: 0.001,
		},
	},

	// Goldens are chromium-linux only — the canonical rendering environment is
	// Linux (dev box + CI), and cross-OS renders differ at the pixel level. On
	// other platforms the flows still run but screenshot assertions are skipped
	// rather than failing against goldens that don't exist. Regenerate goldens
	// on Linux with: bunx playwright test --update-snapshots
	ignoreSnapshots: process.platform !== "linux",

	use: {
		baseURL: `http://localhost:${PORT}`,
		// Disable animations so screenshots are deterministic
		contextOptions: {
			reducedMotion: "reduce",
		},
	},

	projects: [
		{
			// Keep the project named "chromium" so snapshot filenames
			// (…-chromium-linux.png) match the existing goldens.
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				viewport: { width: 1280, height: 900 },
			},
		},
	],

	webServer: {
		// The Tidewave service leaks TIDEWAVE_HTTPS_* into local shells; the
		// test server must stay plain http or the health-check URL never
		// resolves. (No-op in CI, where those vars don't exist.)
		command: `env -u TIDEWAVE_HTTPS_KEY -u TIDEWAVE_HTTPS_CERT bun run dev -- --port ${PORT}`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: !process.env.CI,
		timeout: 60_000,
	},
});
