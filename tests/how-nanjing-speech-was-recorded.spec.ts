import { expect, test } from "@playwright/test";

test("读者可以沿材料链理解南京话如何被记录下来", async ({ page, request }) => {
	await page.goto("/");
	await page.getByRole("link", { name: "南京话如何被记录下来？" }).click();

	await expect(
		page.getByRole("heading", { level: 1, name: "南京话如何被记录下来？" }),
	).toBeVisible();
	await expect(page.getByText(/出版日期.*不等于.*采录日期/).first()).toBeVisible();
	await expect(page.getByText(/字书或教材.*经过选择和编排/).first()).toBeVisible();

	const recordTable = page.getByRole("table");
	await expect(recordTable.getByRole("row")).toHaveCount(6);
	for (const period of ["1864", "1895", "1928/1929", "1960", "1997"]) {
		await expect(recordTable.getByText(period, { exact: true })).toBeVisible();
	}

	const relatedArchives = page.getByRole("region", { name: "本篇关联档案" });
	await expect(relatedArchives.getByRole("listitem")).toHaveCount(5);
	for (const id of ["NJH000008", "NJH000009", "NJH000005", "NJH000004", "NJH000003"]) {
		await expect(relatedArchives.getByRole("link", { name: new RegExp(id) })).toBeVisible();
	}

	await page.goto("/archive/NJH000008");
	const facts = page.getByRole("region", { name: "材料与审核" });
	await expect(facts.getByText("档案原载地名", { exact: true })).toBeVisible();
	await expect(facts.getByText("历史行政归属", { exact: true })).toBeVisible();
	await expect(facts.getByText("可确认的当代位置", { exact: true })).toBeVisible();
	await expect(facts.getByText("保存文件", { exact: true })).toBeVisible();
	await expect(facts).toContainText(
		"c35d3c3d2930ecff67bd5d89143f612a8a98fa82f4e44ec018c8b72567df0f0c",
	);
	await expect(facts).toContainText("不公开");
	const archiveViewportMetrics = await page.evaluate(() => ({
		clientWidth: document.documentElement.clientWidth,
		scrollWidth: document.documentElement.scrollWidth,
	}));
	expect(archiveViewportMetrics.scrollWidth).toBeLessThanOrEqual(
		archiveViewportMetrics.clientWidth,
	);

	const archiveResponse = await request.get("/api/archive/NJH000008");
	expect(archiveResponse.ok()).toBe(true);
	await expect(archiveResponse.json()).resolves.toMatchObject({
		"dc:identifier": "NJH000008",
		"dcterms:spatial": {
			recordedName: "Nanking",
			historicalJurisdiction: "清代江宁府",
			currentLocation: "江苏省南京市",
		},
		"nanjinghua:preservedFiles": [
			{
				kind: "原始文件",
				sha256: "c35d3c3d2930ecff67bd5d89143f612a8a98fa82f4e44ec018c8b72567df0f0c",
				publicAccess: false,
			},
		],
	});

	await page.goto("/archive/NJH000009");
	const textbookFacts = page.getByRole("region", { name: "材料与审核" });
	await expect(textbookFacts).toContainText("采集地点未载");
	await expect(textbookFacts.getByText("地点不确定性", { exact: true })).toBeVisible();
	await expect(textbookFacts.getByText("可确认的当代位置", { exact: true })).toHaveCount(0);
	await expect(textbookFacts).toContainText(
		"7a39e3b301877c8633321f8f00b70a6a5254b3e721ca8057ecfc5e1940965d71",
	);
	await expect(textbookFacts).toContainText("不公开");
	const textbookViewportMetrics = await page.evaluate(() => ({
		clientWidth: document.documentElement.clientWidth,
		scrollWidth: document.documentElement.scrollWidth,
	}));
	expect(textbookViewportMetrics.scrollWidth).toBeLessThanOrEqual(
		textbookViewportMetrics.clientWidth,
	);

	await page.goto("/archive/NJH000003");
	await expect(page.getByRole("region", { name: "档案说明" })).toContainText(
		"尚未取得原书和录音带",
	);
	await expect(page.locator("audio")).toHaveCount(0);

	const archiveWithoutAudioViewportMetrics = await page.evaluate(() => ({
		clientWidth: document.documentElement.clientWidth,
		scrollWidth: document.documentElement.scrollWidth,
	}));
	expect(archiveWithoutAudioViewportMetrics.scrollWidth).toBeLessThanOrEqual(
		archiveWithoutAudioViewportMetrics.clientWidth,
	);
});
