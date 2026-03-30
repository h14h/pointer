import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.CI ? 3099 : 3000;

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

	use: {
		baseURL: `http://localhost:${PORT}`,
		// Disable animations so screenshots are deterministic
		reducedMotion: "reduce",
	},

	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				viewport: { width: 1280, height: 900 },
			},
		},
	],

	webServer: {
		command: `PORT=${PORT} bun run dev`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: !process.env.CI,
		timeout: 30_000,
	},
});
