import { expect, test } from "@playwright/test";

test("读者可以直接打开公交站城市故事", async ({ page }) => {
	await page.goto("/stories/jigongjiao");

	await expect(
		page.getByRole("heading", { level: 1, name: "早高峰，南京人都在挤公交" }),
	).toBeVisible();
	await expect(page.getByText("南京话", { exact: true }).first()).toBeVisible();
	await expect(page.getByText("南京城的声音", { exact: true })).toBeVisible();
	await expect(page.getByRole("dialog")).toHaveCount(0);
	await expect(page.getByText("一点点关于南京话、城市生活的记忆")).toBeVisible();
	await expect(page.locator(".city-story__body > p").first()).toContainText(
		"车门一开，大家都往里挪",
	);

	const musicLink = page.getByRole("link", { name: "去听《挤公交（bonus track）》" });
	await expect(musicLink).toHaveAttribute(
		"href",
		"https://y.qq.com/n/ryqq/songDetail/0038BI7X4Im2Kz",
	);
	await expect(musicLink).toHaveAttribute("target", "_blank");
	await expect(page.locator("audio, video")).toHaveCount(0);
});

test("读者可以从城市地图进入公交站故事", async ({ page }) => {
	await page.goto("/");

	await expect(page.getByRole("heading", { level: 1, name: "南京话" })).toBeVisible();
	await expect(page.getByText("南京城的声音", { exact: true })).toBeVisible();
	await expect(page.getByRole("heading", { level: 2, name: "翻翻看" })).toBeVisible();
	await expect(page.getByRole("link", { name: /早高峰，南京人都在挤公交/ })).toHaveAttribute(
		"href",
		"/stories/jigongjiao",
	);
	await expect(page.getByRole("link", { name: "去旧资料柜看看" })).toHaveAttribute(
		"href",
		"/browse",
	);
	await expect(page.locator("main.city-home")).toHaveAttribute("data-city-interactive", "true");
	if ((page.viewportSize()?.width ?? 0) <= 704) {
		const mobileStoryLink = page.getByRole("link", { name: /公交站.*进去看看/ });
		await expect(
			page.getByRole("list", { name: "城市地点清单" }).getByRole("listitem"),
		).toHaveCount(15);
		await expect(mobileStoryLink).toHaveAttribute("href", "/stories/jigongjiao");
		await mobileStoryLink.click();
	} else {
		await page.getByRole("link", { name: "去公交站看看" }).click();
	}
	await expect(page).toHaveURL(/\/stories\/jigongjiao$/);

	if ((page.viewportSize()?.width ?? 0) <= 704) {
		await expect(
			page.getByRole("heading", { level: 1, name: "早高峰，南京人都在挤公交" }),
		).toBeVisible();
		await expect(page.getByRole("dialog")).toHaveCount(0);
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
		);
		expect(overflow).toBeLessThanOrEqual(1);
		return;
	}

	const storyWindow = page.getByRole("dialog", { name: "早高峰，南京人都在挤公交" });
	await expect(storyWindow).toBeVisible();
	await expect(page.getByRole("button", { name: "关闭故事窗口" })).toBeFocused();
	await page.keyboard.press("Tab");
	await expect
		.poll(() => storyWindow.evaluate((dialog) => dialog.contains(document.activeElement)))
		.toBe(true);
	await page.keyboard.press("Escape");
	await expect(page).toHaveURL(/\/$/);
	await expect(storyWindow).toHaveCount(0);
	await expect(page.getByRole("link", { name: "去公交站看看" })).toBeFocused();

	await page.getByRole("link", { name: "去公交站看看" }).click();
	await page.getByRole("button", { name: "关闭故事窗口" }).click();
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByRole("link", { name: "去公交站看看" })).toBeFocused();

	await page.getByRole("link", { name: "去公交站看看" }).click();
	await page.goBack();
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByRole("link", { name: "去公交站看看" })).toBeFocused();
});
