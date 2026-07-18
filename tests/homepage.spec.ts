import { expect, test } from "@playwright/test";

test("访客可以从品牌首页进入首发专题集合", async ({ page }) => {
	const response = await page.goto("/");

	expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
	await expect(page).toHaveTitle(/南京话/);
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		"href",
		"https://nanjinghua.com/",
	);
	await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
	await expect(page.getByRole("heading", { level: 1, name: "南京话" })).toBeVisible();
	await expect(page.getByText("南京话的历史", { exact: true })).toBeVisible();
	await expect(page.getByRole("img", { name: /1940 年《南京市区图》/ })).toBeVisible();
	await expect(page.locator("audio")).toHaveCount(0);

	const openingCollection = page.locator("#opening-collection");
	const openingBox = await openingCollection.boundingBox();
	const viewport = page.viewportSize();
	expect(openingBox).not.toBeNull();
	expect(viewport).not.toBeNull();
	expect(openingBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(viewport?.height ?? 0);

	const openingCollectionLink = page.getByRole("link", {
		name: "进入首发专题集合",
	});
	await expect(openingCollectionLink).toHaveAttribute("href", "#opening-collection");
	await openingCollectionLink.click();

	await expect(page.getByRole("heading", { name: "南京话是什么？" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "从材料看见时间" })).toBeVisible();
	await expect(page.getByRole("link", { name: /1864.*Edkins/ })).toHaveAttribute(
		"href",
		"/archive/NJH000008",
	);
	await expect(page.getByRole("heading", { name: "精选档案" })).toBeVisible();
	await expect(page.getByRole("img", { name: /南京白局演出现场/ })).toBeVisible();

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

test("正式域名的 HTTP 请求永久重定向到规范 HTTPS 地址", async ({ request }) => {
	const response = await request.get("/browse?q=%E7%99%BD%E5%B1%80", {
		headers: { Host: "nanjinghua.com" },
		maxRedirects: 0,
	});
	expect(response.status()).toBe(308);
	const location = new URL(response.headers().location);
	expect(location.hostname).toBe("nanjinghua.com");
	expect(location.pathname).toBe("/browse");
	expect(location.searchParams.get("q")).toBe("白局");
});
