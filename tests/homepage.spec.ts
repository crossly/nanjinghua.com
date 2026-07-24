import { expect, test } from "@playwright/test";

test("访客可以从品牌首页开始城市漫游", async ({ page }) => {
	const response = await page.goto("/");

	expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
	await expect(page).toHaveTitle(/南京话/);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		"href",
		"https://nanjinghua.com/",
	);
	await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
	await expect(page.getByRole("heading", { level: 1, name: "南京话" })).toBeVisible();
	await expect(page.getByText("南京城的声音", { exact: true })).toBeVisible();
	await expect(page.getByText(/“声音”是说话与城市表达，不是音频功能/)).toBeVisible();
	await expect(
		page
			.locator(".city-home__intro")
			.getByText("一点点关于南京话、城市生活的记忆", { exact: true }),
	).toBeVisible();
	await expect(page.getByRole("img", { name: /叙事型南京城市插画/ })).toBeVisible();
	await expect(
		page.getByRole("list", { name: "城市地点", exact: true }).getByRole("listitem"),
	).toHaveCount(15);
	await expect(page.locator("audio")).toHaveCount(0);

	const storyLink = page.getByRole("link", { name: /早高峰，南京人都在挤公交/ });
	await expect(storyLink).toHaveAttribute("href", "/stories/jigongjiao");
	await expect(page.getByRole("link", { name: "去旧资料柜看看" })).toHaveAttribute(
		"href",
		"/browse",
	);

	const horizontalOverflow = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
	);
	expect(horizontalOverflow).toBeLessThanOrEqual(1);
});

test("公开内容规范 URL 不使用尾斜杠", async ({ request }) => {
	const response = await request.get("/articles/what-is-nanjinghua/", { maxRedirects: 0 });
	expect(response.status()).toBe(307);
	expect(response.headers().location).toBe("/articles/what-is-nanjinghua");
});
