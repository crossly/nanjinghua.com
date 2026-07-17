import { expect, test } from "@playwright/test";

test("访客可以从品牌首页进入第一辑", async ({ page }) => {
	await page.goto("/");

	await expect(page).toHaveTitle(/南京话/);
	await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
	await expect(page.getByRole("heading", { level: 1, name: "南京话" })).toBeVisible();
	await expect(page.getByText("南京话的历史", { exact: true })).toBeVisible();
	await expect(page.getByRole("img", { name: /1940 年《南京市区图》/ })).toBeVisible();

	const openingCollectionLink = page.getByRole("link", {
		name: "进入第一辑",
	});
	await expect(openingCollectionLink).toHaveAttribute("href", "#opening-collection");
	await openingCollectionLink.click();

	await expect(page.getByRole("heading", { name: "南京话是什么？" })).toBeVisible();
});
