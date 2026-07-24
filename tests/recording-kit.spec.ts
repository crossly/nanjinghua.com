import { expect, test } from "@playwright/test";

test("真人语音采集包作为独立备用工具保留", async ({ page, request }) => {
	await page.goto("/recording-kit");
	await expect(page.getByRole("heading", { level: 1, name: "真人语音采集包" })).toBeVisible();
	await expect(page.getByText(/AI 合成试音不代表真实南京话录音/)).toBeVisible();
	await expect(page.getByRole("link", { name: "下载完整采集包" })).toHaveAttribute(
		"href",
		"/downloads/nanjinghua-recording-kit-v1.0.0.zip",
	);
	await expect(page.getByText("旧资料柜", { exact: true })).toHaveCount(0);
	await expect((await request.get("/downloads/nanjinghua-recording-kit-v1.0.0.zip")).status()).toBe(
		200,
	);
});
