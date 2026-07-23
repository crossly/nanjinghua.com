import { expect, test } from "@playwright/test";

test("读者可以区分历史南京音、南京官话与当代南京话", async ({ page }) => {
	await page.goto("/articles/historical-nanjing-speech");

	await expect(
		page.getByRole("heading", { level: 1, name: "历史上的南京音与南京官话是什么？" }),
	).toBeVisible();
	await expect(page.getByText(/历史南京语音.*不等于.*当代南京话/).first()).toBeVisible();
	await expect(page.getByText(/城市地位.*不能.*证明.*语言连续/).first()).toBeVisible();
	await expect(page.getByText(/远藤光晓.*最可能占有标准音/).first()).toBeVisible();
	await expect(page.getByText(/不能因为南京短暂.*标准音/).first()).toBeVisible();

	const relatedArchives = page.getByRole("region", { name: "本篇关联档案" });
	await expect(relatedArchives.getByRole("listitem")).toHaveCount(5);
	await expect(relatedArchives.getByRole("link", { name: /NJH000005.*南京音系/ })).toBeVisible();
	await expect(
		relatedArchives.getByRole("link", { name: /NJH000008.*Chinese Colloquial Language/ }),
	).toBeVisible();
	await expect(
		relatedArchives.getByRole("link", { name: /NJH000009.*支那南部會話/ }),
	).toBeVisible();

	await relatedArchives
		.getByRole("link", { name: /NJH000008.*Chinese Colloquial Language/ })
		.click();
	const englishRecord = page.getByRole("region", { name: "档案说明" });
	await expect(englishRecord).toContainText(
		"A Grammar of the Chinese Colloquial Language Commonly Called the Mandarin Dialect",
	);
	await expect(englishRecord).toContainText(
		"cannot be regarded as the same dialect with modern mandarin",
	);
	await expect(englishRecord).toContainText("中文说明");

	await page.goto("/archive/NJH000009");
	const japaneseRecord = page.getByRole("region", { name: "档案说明" });
	await expect(japaneseRecord).toContainText("支那南部會話 : 一名・南京官話");
	await expect(japaneseRecord).toContainText("有北京語有滿洲語有嶺南語");
	await expect(japaneseRecord).toContainText("中文说明");

	await page.goto("/archive/NJH000011");
	const controversyRecord = page.getByRole("region", { name: "档案说明" });
	await expect(controversyRecord).toContainText("支持侧");
	await expect(controversyRecord).toContainText("质疑侧");
	await expect(controversyRecord).toContainText("尚未独立取得");

	const viewportMetrics = await page.evaluate(() => ({
		clientWidth: document.documentElement.clientWidth,
		scrollWidth: document.documentElement.scrollWidth,
	}));
	expect(viewportMetrics.scrollWidth).toBeLessThanOrEqual(viewportMetrics.clientWidth);
});
