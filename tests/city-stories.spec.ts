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
		await expect
			.poll(() =>
				page.evaluate(
					() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
				),
			)
			.toBeLessThanOrEqual(1);
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

test("十五个城市地点可从地图和总览进入同一篇独立故事", async ({ page }) => {
	const stories = [
		["公交站", "jigongjiao"],
		["巷口", "lane"],
		["小店", "shop"],
		["戏台", "stage"],
		["旧书桌", "desk"],
		["菜场", "market"],
		["早点铺", "breakfast"],
		["厨房", "kitchen"],
		["楼下", "downstairs"],
		["校门口", "school-gate"],
		["操场边", "playground"],
		["灯会街口", "festival-street"],
		["新小区", "new-estate"],
		["车站", "station"],
		["手机屏幕", "phone-screen"],
	] as const;

	await page.goto("/");
	for (const [scene, slug] of stories) {
		await expect(page.getByRole("link", { name: `去${scene}看看` })).toHaveAttribute(
			"href",
			`/stories/${slug}`,
		);
		await expect(
			page.getByRole("link", { name: new RegExp(`城市散步.*${scene}`) }),
		).toHaveAttribute("href", `/stories/${slug}`);
	}

	for (const [scene, slug] of stories) {
		await page.goto(`/stories/${slug}`);
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
		await expect(page.getByText(`城市散步 · ${scene}`, { exact: true })).toBeVisible();
		const image = page.locator(".city-story__visual img");
		await expect(image).toBeVisible();
		await expect
			.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
			.toBeGreaterThan(0);
	}

	await page.goto("/stories/lane");
	await expect(page.getByRole("heading", { level: 2, name: "想再翻一翻" })).toBeVisible();
	await expect(page.getByRole("link", { name: "去旧资料柜看看" })).toHaveAttribute(
		"href",
		"/browse",
	);

	await page.goto("/stories/stage");
	await expect(
		page.getByRole("link", { name: "国家级非物质文化遗产代表性项目“南京白局”" }),
	).toHaveAttribute("href", "/archive/NJH000015");

	await page.goto("/stories/festival-street");
	const festivalMusic = page.getByRole("link", { name: "去听《Come on！莱斯狗！》" });
	await expect(festivalMusic).toHaveAttribute(
		"href",
		"https://y.qq.com/n/ryqq/songDetail/000pEaf80BVErP",
	);
	await expect(festivalMusic).toHaveAttribute("target", "_blank");
	await expect(page.locator("audio, video")).toHaveCount(0);
});

test("地图、移动清单与翻翻看使用同一套已读标记", async ({ page }) => {
	await page.goto("/");
	await expect(page.locator("main.city-home")).toHaveAttribute("data-city-interactive", "true");

	if ((page.viewportSize()?.width ?? 0) <= 704) {
		await page
			.getByRole("list", { name: "城市地点清单" })
			.getByRole("link", { name: "巷口，进去看看" })
			.click();
		await expect(page).toHaveURL(/\/stories\/lane$/);
		await page.goBack();
		await expect(page).toHaveURL(/\/$/);
		await expect(
			page.getByRole("list", { name: "城市地点清单" }).getByRole("link", { name: "巷口，已去过" }),
		).toBeVisible();
	} else {
		const overviewStoryLink = page.getByRole("link", { name: /城市散步 · 巷口/ });
		await overviewStoryLink.click();
		await expect(page.getByRole("dialog", { name: "巷口见着面，不急着走" })).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(page.getByRole("link", { name: "去巷口看看，已去过" })).toBeVisible();
		await expect(overviewStoryLink).toBeFocused();
	}

	await expect(page.getByRole("link", { name: /城市散步 · 巷口.*已去过/ })).toBeVisible();
});
