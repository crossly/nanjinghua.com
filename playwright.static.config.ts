import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests",
	testMatch: "**/*.static.spec.ts",
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	reporter: "list",
	use: {
		baseURL: "http://127.0.0.1:4174",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "static-desktop-chromium",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "static-mobile-chromium",
			use: { ...devices["Pixel 7"] },
		},
	],
	webServer: {
		command: "pnpm run build:readonly-static && pnpm run preview:static",
		url: "http://127.0.0.1:4174/browse",
		reuseExistingServer: false,
		stdout: "pipe",
		stderr: "pipe",
	},
});
