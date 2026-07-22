import { expect, test } from "@playwright/test";
import { shouldRecordTerminalResponseFailure } from "../scripts/terminal-access";

test("终端响应监控会把同源 API HTTP 错误记为失败", async ({ page }) => {
	await page.route("**/api/submissions?terminal-response-test=1", (route) =>
		route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"test"}' }),
	);
	const failures: string[] = [];
	page.on("response", (response) => {
		if (
			shouldRecordTerminalResponseFailure(
				response.url(),
				response.request().resourceType(),
				response.status(),
				"http://127.0.0.1:4173",
			)
		) {
			failures.push(`${response.status()} ${new URL(response.url()).pathname}`);
		}
	});

	await page.goto("/");
	await page.evaluate(() => fetch("/api/submissions?terminal-response-test=1"));

	await expect.poll(() => failures).toContain("503 /api/submissions");
});
