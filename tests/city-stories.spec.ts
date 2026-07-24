import { expect, test } from "@playwright/test";

test("早点铺以高频南京话场景对话为主体", async ({ page }) => {
	await page.goto("/stories/breakfast");

	const dialogue = page.getByRole("list", { name: "早点铺场景对话" });
	await expect(dialogue.getByRole("listitem")).toHaveCount(4);

	const phrase = dialogue.getByRole("listitem").filter({ hasText: "阿要辣油啊？" });
	await expect(phrase).toContainText("要不要加辣油？");
	await expect(phrase).toContainText("摊主确认客人口味");
	const playButton = phrase.getByRole("button", { name: "播放：阿要辣油啊？" });
	await expect(playButton).toBeVisible();
	await expect(playButton).toBeEnabled();
	await playButton.click();
	await expect(phrase.getByRole("button", { name: /^(播放|暂停)：阿要辣油啊？$/ })).toBeVisible();
	const audioResponse = await page.request.get("/audio/nanjinghua-trials/breakfast.wav");
	expect(audioResponse.status()).toBe(200);
	await expect(page.getByText("待南京本地使用者复核", { exact: true })).toBeVisible();
	await expect(page.getByText("AI 合成试音 · 本场景 4 条", { exact: true })).toBeVisible();
});

test("十五个场景都提供三至五句待复核口语", async ({ page }) => {
	const scenes = [
		["公交站", "jigongjiao"],
		["巷口", "lane"],
		["小店", "shop"],
		["菜场", "market"],
		["早点铺", "breakfast"],
		["厨房", "kitchen"],
		["楼下", "downstairs"],
		["校门口", "school-gate"],
		["操场边", "playground"],
		["新小区", "new-estate"],
		["手机屏幕", "phone-screen"],
		["戏台", "stage"],
		["旧书桌", "desk"],
		["灯会街口", "festival-street"],
		["车站", "station"],
	] as const;

	for (const [scene, slug] of scenes) {
		await page.goto(`/stories/${slug}`);
		const dialogue = page.getByRole("list", { name: `${scene}场景对话` });
		const lineCount = await dialogue.getByRole("listitem").count();
		expect(lineCount).toBeGreaterThanOrEqual(3);
		expect(lineCount).toBeLessThanOrEqual(5);
		await expect(page.getByText("待南京本地使用者复核", { exact: true })).toBeVisible();
		const playButtons = dialogue.getByRole("button");
		await expect(playButtons).toHaveCount(lineCount);
		for (let index = 0; index < lineCount; index += 1) {
			await expect(playButtons.nth(index)).toBeEnabled();
		}
	}
});

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
	const busPhrase = page
		.getByRole("list", { name: "公交站场景对话" })
		.getByRole("listitem")
		.filter({ hasText: "后头空得很，往里走诶。" });
	await expect(busPhrase).toContainText("后面很空，请往里面走。");
	await expect(
		busPhrase.getByRole("button", { name: "播放：后头空得很，往里走诶。" }),
	).toBeVisible();

	const musicLink = page.getByRole("link", {
		name: "在 QQ 音乐打开《挤公交（bonus track）》",
	});
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
	await expect(page.getByRole("link", { name: "旧资料柜" })).toHaveCount(0);
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

test("地图图钉与故事索引双向同步", async ({ page }, testInfo) => {
	await page.goto("/");

	const mapLink = page.getByRole("link", { name: "去菜场看看" });
	const indexLink = page
		.getByRole("list", { name: "城市故事索引" })
		.getByRole("link", { name: /菜场里，话比菜新鲜/ });

	if (testInfo.project.name === "mobile-chromium") {
		await indexLink.focus();
	} else {
		await indexLink.hover();
	}
	await expect(mapLink).toHaveAttribute("data-active", "true");

	await mapLink.focus();
	await expect(indexLink).toHaveAttribute("data-active", "true");
	await expect(mapLink).toContainText("04");
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
	await expect(page.getByText("旧资料柜", { exact: true })).toHaveCount(0);

	await page.goto("/stories/festival-street");
	const festivalPhrase = page
		.getByRole("list", { name: "灯会街口场景对话" })
		.getByRole("listitem")
		.filter({ hasText: "人多的一塌。" });
	await expect(festivalPhrase).toContainText("人特别多。");
	await expect(festivalPhrase.getByRole("button", { name: "播放：人多的一塌。" })).toBeVisible();
	const festivalMusicReference = page.getByRole("complementary", {
		name: "推荐聆听：Come on！莱斯狗！",
	});
	await expect(festivalMusicReference.getByText("推荐聆听", { exact: true })).toBeVisible();
	await expect(festivalMusicReference.getByText("QQ 音乐", { exact: true })).toBeVisible();
	await expect(
		festivalMusicReference.getByText("Come on！莱斯狗！", { exact: true }),
	).toBeVisible();
	await expect(
		festivalMusicReference.getByText("朱小磊、晓乐、杨运、秦岭、薛子等", { exact: true }),
	).toBeVisible();
	const festivalMusic = festivalMusicReference.getByRole("link", {
		name: "在 QQ 音乐打开《Come on！莱斯狗！》",
	});
	await expect(festivalMusic).toHaveAttribute(
		"href",
		"https://y.qq.com/n/ryqq/songDetail/000pEaf80BVErP",
	);
	await expect(festivalMusic).toHaveAttribute("target", "_blank");
	expect(
		await festivalMusicReference.evaluate(
			(element) => element.getBoundingClientRect().right <= window.innerWidth,
		),
	).toBe(true);
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
