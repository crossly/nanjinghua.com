import { expect, test } from "@playwright/test";

test("无脚本环境仍可提交搜索与筛选并进入档案", async ({ page }) => {
	await page.goto("/browse");
	await page.getByLabel("搜索题名、人物、词语、正文或普通话拼音").fill("nanjing baiju");
	await page.getByRole("button", { name: "查看结果" }).click();
	await expect(page).toHaveURL(/\/browse\?q=nanjing(\+|%20)baiju/);
	await expect(page.getByRole("heading", { level: 3, name: /南京白局/ })).toBeVisible();

	await page.getByLabel("搜索题名、人物、词语、正文或普通话拼音").fill("");
	await page.getByLabel("内容类型").selectOption("档案条目");
	await page.getByLabel("档案证据身份").selectOption("原始材料");
	await page.getByLabel("档案时间").selectOption("2000 年至今");
	await page.getByLabel("档案地点").selectOption("南京市秦淮区");
	await page.getByLabel("文化形式").selectOption("白局");
	await page.getByRole("button", { name: "查看结果" }).click();
	await expect(page.getByText("当前条件 · 1 项", { exact: true })).toBeVisible();

	await page.getByRole("link", { name: /国家级非物质文化遗产代表性项目“南京白局”/ }).click();
	await expect(page.getByRole("heading", { level: 1, name: /南京白局/ })).toBeVisible();
});

test("无脚本环境显示可恢复的空结果", async ({ page }) => {
	await page.goto("/browse?q=不存在的档案词条");
	await expect(page.getByText("没有符合当前条件的公开内容。")).toBeVisible();
	await expect(page.getByRole("link", { name: "查看全部目录" })).toHaveAttribute("href", "/browse");
});
