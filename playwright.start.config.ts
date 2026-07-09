import { defineConfig, devices } from "@playwright/test";

// Visual suite pointed at the TanStack Start dev server (migration parity
// check). Mirrors playwright.config.ts exactly — same tests, same goldens,
// same tolerances — only the server behind the URLs changes. League-URL
// specs stay Next-only until Phase 2 ports league routing.
const PORT = 3200;

export default defineConfig({
	testDir: "./e2e",
	testMatch: /leaderboard\.spec\.ts/,
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
		command: "bun run dev:start",
		url: `http://localhost:${PORT}`,
		reuseExistingServer: !process.env.CI,
		timeout: 60_000,
	},
});
