import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests",
	testMatch: "**/*.spec.ts",
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	reporter: "list",
	use: {
		baseURL: "http://127.0.0.1:4173",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "desktop-chromium",
			testIgnore: "**/*.nojs.spec.ts",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "mobile-chromium",
			testIgnore: "**/*.nojs.spec.ts",
			use: { ...devices["Pixel 7"] },
		},
		{
			name: "no-js-chromium",
			testMatch: "**/*.nojs.spec.ts",
			use: { ...devices["Desktop Chrome"], javaScriptEnabled: false },
		},
	],
	webServer: {
		command: "pnpm preview:worker",
		url: "http://127.0.0.1:4173",
		reuseExistingServer: !process.env.CI,
		stdout: "pipe",
		stderr: "pipe",
	},
});
