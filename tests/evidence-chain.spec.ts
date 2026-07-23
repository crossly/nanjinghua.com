import { expect, test } from "@playwright/test";

test("读者可以从专题文章追到档案条目和来源", async ({ page, request }) => {
	await page.goto("/articles/what-a-review-can-tell-us");

	await expect(
		page.getByRole("heading", { level: 1, name: "一篇综述能告诉我们什么？" }),
	).toBeVisible();
	await expect(page.getByText(/Ricky · 主编与内容责任人/)).toBeVisible();
	await expect(page.getByText("辅助资料发现、归纳与初稿整理", { exact: true })).toBeVisible();
	await page.getByRole("link", { name: /查看档案 NJH000001/ }).click();

	await expect(page.getByText("NJH000001", { exact: true })).toBeVisible();
	const recordFacts = page.getByRole("region", { name: "材料与审核" });
	await expect(recordFacts.getByText("研究观点", { exact: true })).toBeVisible();
	await expect(recordFacts.getByText("编辑核对后发布", { exact: true })).toBeVisible();
	await expect(recordFacts.getByText("Ricky（主编）", { exact: true })).toBeVisible();
	const viewportMetrics = await page.evaluate(() => ({
		clientWidth: document.documentElement.clientWidth,
		scrollWidth: document.documentElement.scrollWidth,
	}));
	expect(viewportMetrics.scrollWidth).toBeLessThanOrEqual(viewportMetrics.clientWidth);

	const sourceLink = page.getByRole("link", { name: "查看来源" });
	await expect(sourceLink).toHaveAttribute("href", /^https:\/\//);
	const sources = page.getByRole("region", { name: "核查入口" });
	const primarySource = sources.getByRole("listitem").first();
	await expect(primarySource).toContainText("三十年来的南京方言研究");
	await expect(primarySource).toContainText("第 92—97 页");
	await expect(primarySource.getByRole("link", { name: "打开来源记录" })).toHaveAttribute(
		"href",
		/^https:\/\//,
	);
	const canonicalCitation = page.getByRole("region", { name: "怎样引用这条档案" });
	await expect(canonicalCitation).toContainText("Ricky（主编）整理");
	await expect(canonicalCitation).toContainText("档案编号 NJH000001");
	const jsonLdText = await page
		.locator('script[type="application/ld+json"]')
		.evaluate((element) => element.textContent);
	expect(JSON.parse(jsonLdText ?? "{}")).toMatchObject({
		"@type": "ArchiveComponent",
		identifier: "NJH000001",
	});

	const exportResponse = await request.get("/api/archive/NJH000001");
	expect(exportResponse.ok()).toBe(true);
	await expect(exportResponse.json()).resolves.toMatchObject({
		"dc:identifier": "NJH000001",
		"dcterms:license": "https://creativecommons.org/publicdomain/zero/1.0/",
		"nanjinghua:evidenceIdentity": "研究观点",
		"nanjinghua:sourceRights": "仅引文与目录信息",
	});
});
