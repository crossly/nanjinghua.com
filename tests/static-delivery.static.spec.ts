import { expect, test } from "@playwright/test";

test("只读产物保留首页、城市故事和制度页面", async ({ page }) => {
	await page.goto("/");
	await expect(page.getByRole("heading", { level: 1, name: "南京话" })).toBeVisible();
	await expect(page.getByRole("link", { name: "反馈与纠错" })).toHaveCount(0);

	await page.goto("/stories/breakfast");
	await expect(
		page.getByRole("heading", { level: 1, name: "早点铺的热气，先醒过来" }),
	).toBeVisible();
	await expect(page.getByText("阿要辣油啊？", { exact: true })).toBeVisible();

	await page.goto("/policies/about");
	await expect(page.getByRole("heading", { level: 1, name: "关于本站" })).toBeVisible();
});

test("只读产物拒绝动态反馈和旧资料柜路径", async ({ request }) => {
	for (const path of [
		"/api/submissions",
		"/contribute",
		"/browse",
		"/archive/NJH000001",
		"/articles/what-is-nanjinghua",
		"/recording-kit",
		"/downloads/nanjinghua-recording-kit-v1.0.0.zip",
		"/exports/NJH000001.json",
	]) {
		expect((await request.get(path)).status(), path).toBe(404);
	}
});
