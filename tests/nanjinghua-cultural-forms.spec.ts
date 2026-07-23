import { expect, test } from "@playwright/test";

test("读者可以沿五条不同证据理解南京话活在什么文化里", async ({ page, request }) => {
	await page.goto("/articles/nanjinghua-cultural-forms");

	await expect(
		page.getByRole("heading", { level: 1, name: "南京话活在什么文化里？" }),
	).toBeVisible();
	await expect(page.getByText(/一种语言不仅留在音系表里/).first()).toBeVisible();
	await expect(page.getByText(/没有逐页核实的童谣和俗语材料/).first()).toBeVisible();

	const culturalVisual = page.getByRole("figure");
	await expect(
		culturalVisual.getByRole("img", {
			name: "室内南京白局演出现场，舞台上有演唱者和乐器伴奏，观众围坐观看",
		}),
	).toBeVisible();
	await expect(culturalVisual).toContainText("五空间");
	await expect(culturalVisual).toContainText("CC BY 2.5");
	await expect(culturalVisual.getByRole("link", { name: "CC BY 2.5" })).toHaveAttribute(
		"href",
		"https://creativecommons.org/licenses/by/2.5/",
	);
	await expect(culturalVisual.getByRole("link", { name: "查看来源" })).toHaveAttribute(
		"href",
		/commons\.wikimedia\.org/,
	);
	await expectPageToFitViewport(page);

	const relatedArchives = page.getByRole("region", { name: "本篇关联档案" });
	await expect(relatedArchives.getByRole("listitem")).toHaveCount(5);
	for (const id of ["NJH000006", "NJH000015", "NJH000016", "NJH000017", "NJH000018"]) {
		await expect(relatedArchives.getByRole("link", { name: new RegExp(id) })).toBeVisible();
	}

	await expect(page.locator("audio, video")).toHaveCount(0);

	await page.goto("/archive/NJH000015");
	const officialRecord = page.getByRole("region", { name: "材料与审核" });
	await expect(officialRecord.getByText("文化形式", { exact: true })).toBeVisible();
	await expect(officialRecord).toContainText("白局、曲艺");
	await expect(page.getByRole("region", { name: "档案说明" })).toContainText(
		"用南京方言演唱牌子曲",
	);
	await expectPageToFitViewport(page);

	const archiveResponse = await request.get("/api/archive/NJH000016");
	expect(archiveResponse.ok()).toBe(true);
	await expect(archiveResponse.json()).resolves.toMatchObject({
		"dc:identifier": "NJH000016",
		"nanjinghua:culturalForms": ["白局", "曲艺", "音像记录"],
		"nanjinghua:sourceRights": "CC BY 2.5",
	});
});

async function expectPageToFitViewport(page: import("@playwright/test").Page) {
	const viewportMetrics = await page.evaluate(() => ({
		clientWidth: document.documentElement.clientWidth,
		scrollWidth: document.documentElement.scrollWidth,
	}));
	expect(viewportMetrics.scrollWidth).toBeLessThanOrEqual(viewportMetrics.clientWidth);
}
