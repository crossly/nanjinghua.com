import { expect, test } from "@playwright/test";

test("读者可以区分专题中的三类语言对象并核查来源", async ({ page, request }) => {
	await page.goto("/articles/what-is-nanjinghua");

	await expect(page.getByRole("heading", { level: 1, name: "南京话是什么？" })).toBeVisible();
	await expect(page.getByText("南京话", { exact: true }).first()).toBeVisible();
	await expect(page.getByText("南京地区方言", { exact: true }).first()).toBeVisible();
	await expect(page.getByText("历史南京语音", { exact: true }).first()).toBeVisible();

	const relatedArchives = page.getByRole("region", { name: "本篇关联档案" });
	await expect(relatedArchives.getByRole("listitem")).toHaveCount(5);
	await relatedArchives.getByRole("link", { name: /NJH000002.*南京方言志/ }).click();

	await expect(page.getByRole("heading", { level: 1, name: /南京方言志/ })).toBeVisible();
	await expect(page.getByRole("region", { name: "核查入口" })).toContainText(
		"南京市地方志工作办公室",
	);
	await expect(page.getByRole("region", { name: "核查入口" })).toContainText("访问日期 2026-07-17");

	const exportResponse = await request.get("/api/archive/NJH000002");
	expect(exportResponse.ok()).toBe(true);
	const archiveExport = await exportResponse.json();
	expect(archiveExport).toMatchObject({
		"dc:identifier": "NJH000002",
		"nanjinghua:languageScope": ["南京话", "南京地区方言"],
	});
	expect(archiveExport["dc:source"][0]).toMatchObject({
		accessedAt: "2026-07-17",
		url: expect.stringMatching(/^https:\/\//),
	});

	const viewportMetrics = await page.evaluate(() => ({
		clientWidth: document.documentElement.clientWidth,
		scrollWidth: document.documentElement.scrollWidth,
	}));
	expect(viewportMetrics.scrollWidth).toBeLessThanOrEqual(viewportMetrics.clientWidth);
});
