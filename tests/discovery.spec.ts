import { expect, test } from "@playwright/test";

test("访客可以从首页的旧资料柜检索正文、人物和普通话拼音", async ({ page }) => {
	await page.goto("/");
	await page.locator(".city-home__header").getByRole("link", { name: "旧资料柜" }).click();
	await expect(page).toHaveURL(/\/browse\/?$/);

	const query = page.getByLabel("搜索题名、人物、词语、正文或普通话拼音");
	await query.fill("nanjing baiju");
	await page.getByRole("button", { name: "查看结果" }).click();
	await expect(page).toHaveURL(/\/browse\?q=nanjing(\+|%20)baiju/);
	await expect(page.getByRole("heading", { level: 3, name: /南京白局/ })).toBeVisible();

	await query.fill("Keith Johnson");
	await page.getByRole("button", { name: "查看结果" }).click();
	await expect(
		page.getByRole("heading", { level: 3, name: /Gradient phonemic contrast/ }),
	).toBeVisible();

	await query.fill("受控听觉感知任务");
	await page.getByRole("button", { name: "查看结果" }).click();
	await expect(
		page.getByRole("heading", { level: 3, name: /Gradient phonemic contrast/ }),
	).toBeVisible();
	const widths = await page.evaluate(() => ({
		client: document.documentElement.clientWidth,
		scroll: document.documentElement.scrollWidth,
	}));
	expect(widths.scroll).toBeLessThanOrEqual(widths.client);
});

test("受控筛选状态可分享并可进入档案、引用和单条导出", async ({ page, request }) => {
	await page.goto("/browse");
	await page.getByLabel("内容类型").selectOption("档案条目");
	await page.getByLabel("档案证据身份").selectOption("原始材料");
	await page.getByLabel("档案时间").selectOption("2000 年至今");
	await page.getByLabel("档案地点").selectOption("南京市秦淮区");
	await page.getByLabel("文化形式").selectOption("白局");
	await page.getByRole("button", { name: "查看结果" }).click();

	await expect(page).toHaveURL(/type=.*evidence=.*time=.*place=.*culture=/);
	await expect(page.getByText("当前条件 · 1 项", { exact: true })).toBeVisible();
	await page.getByRole("link", { name: /国家级非物质文化遗产代表性项目“南京白局”/ }).click();
	await expect(page).toHaveURL(/\/archive\/NJH000015\/?$/);
	await expect(page.getByRole("region", { name: "怎样引用这条档案" })).toContainText(
		"https://nanjinghua.com/archive/NJH000015",
	);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		"href",
		"https://nanjinghua.com/archive/NJH000015",
	);
	await expect(page.getByRole("link", { name: "导出元数据" })).toHaveAttribute(
		"href",
		"/api/archive/NJH000015",
	);

	const exportResponse = await request.get("/api/archive/NJH000015");
	expect(exportResponse.ok()).toBe(true);
	await expect(exportResponse.json()).resolves.toMatchObject({
		"dc:identifier": "NJH000015",
		"dc:rights": "CC0 1.0 Universal",
		"nanjinghua:searchAliases": [{ term: "南京白局", mandarinPinyin: "nanjing baiju" }],
	});

	const widths = await page.evaluate(() => ({
		client: document.documentElement.clientWidth,
		scroll: document.documentElement.scrollWidth,
	}));
	expect(widths.scroll).toBeLessThanOrEqual(widths.client);
});

test("搜索没有匹配时提供清晰可恢复的空结果", async ({ page }) => {
	await page.goto("/browse?q=不存在的档案词条");
	await expect(page.getByText("没有符合当前条件的公开内容。")).toBeVisible();
	await expect(page.getByRole("link", { name: "查看全部目录" })).toHaveAttribute("href", "/browse");
});
