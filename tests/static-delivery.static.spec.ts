import { expect, test } from "@playwright/test";

test("预渲染检索页可从纯静态产物恢复查询与组合筛选", async ({ page }) => {
	const browserErrors: string[] = [];
	page.on("console", (message) => {
		if (message.type() === "error") browserErrors.push(message.text());
	});
	page.on("pageerror", (error) => browserErrors.push(error.message));

	await page.goto("/browse?q=nanjing%20baiju");
	await expect(page).toHaveURL(/\/browse\?q=nanjing(\+|%20)baiju/);
	await expect(
		page.getByRole("heading", {
			level: 3,
			name: "国家级非物质文化遗产代表性项目“南京白局”（项目 Ⅴ-81）",
		}),
	).toBeVisible();
	await expect(page.getByText("当前条件 · 1 项", { exact: true })).toBeVisible();

	await page.reload();
	await expect(
		page.getByRole("heading", {
			level: 3,
			name: "国家级非物质文化遗产代表性项目“南京白局”（项目 Ⅴ-81）",
		}),
	).toBeVisible();
	await expect(page.getByText("当前条件 · 1 项", { exact: true })).toBeVisible();

	await page.getByLabel("搜索题名、人物、词语、正文或普通话拼音").fill("");
	await page.getByLabel("内容类型").selectOption("档案条目");
	await page.getByLabel("档案证据身份").selectOption("原始材料");
	await page.getByLabel("档案时间").selectOption("2000 年至今");
	await page.getByLabel("档案地点").selectOption("南京市秦淮区");
	await page.getByLabel("文化形式").selectOption("白局");
	await page.getByRole("button", { name: "查看结果" }).click();

	await expect(page).toHaveURL(/type=.*evidence=.*time=.*place=.*culture=/);
	await expect(page.getByText("当前条件 · 1 项", { exact: true })).toBeVisible();
	await expect(browserErrors).toEqual([]);
});

test("只读产物保留静态档案导出并拒绝动态和语音采集路径", async ({ page, request }) => {
	for (const path of [
		"/api/submissions",
		"/contribute",
		"/recording-kit",
		"/downloads/nanjinghua-recording-kit-v1.0.0.zip",
	]) {
		const response = await request.get(path);
		expect(response.status(), path).toBe(404);
	}

	await page.goto("/archive/NJH000015");
	await expect(page.getByRole("link", { name: "导出元数据" })).toHaveAttribute(
		"href",
		"/exports/NJH000015.json",
	);
	await expect(page.getByRole("link", { name: "纠错或权利申诉" })).toHaveCount(0);

	const exportResponse = await request.get("/exports/NJH000015.json");
	expect(exportResponse.ok()).toBe(true);
	expect(exportResponse.headers()["content-type"]).toContain("application/json");
	await expect(exportResponse.json()).resolves.toMatchObject({
		"dc:identifier": "NJH000015",
		"dc:rights": "CC0 1.0 Universal",
	});

	await page.goto("/");
	await expect(page.getByRole("link", { name: "提供线索" })).toHaveCount(0);
	await expect(page.locator("audio")).toHaveCount(0);
});
