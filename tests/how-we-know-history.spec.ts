import { expect, test } from "@playwright/test";

test("读者可以用四类证据理解我们怎样知道南京话的历史", async ({ page, request }) => {
	await page.goto("/");
	await page.getByRole("link", { name: "我们怎样知道南京话的历史？" }).click();

	await expect(
		page.getByRole("heading", { level: 1, name: "我们怎样知道南京话的历史？" }),
	).toBeVisible();
	await expect(page.getByText("材料日期", { exact: true }).first()).toBeVisible();
	await expect(page.getByText("所述时期", { exact: true }).first()).toBeVisible();
	await expect(page.getByText("推定时期", { exact: true }).first()).toBeVisible();
	await expect(page.getByText(/网络转载.*不能替代来源/)).toBeVisible();
	const timeTable = page.getByRole("table");
	await expect(timeTable).toBeVisible();
	await expect(timeTable.getByRole("columnheader")).toHaveCount(3);
	await expect(timeTable.getByRole("row")).toHaveCount(4);
	const articleViewport = await page.evaluate(() => ({
		clientWidth: document.documentElement.clientWidth,
		scrollWidth: document.documentElement.scrollWidth,
	}));
	expect(articleViewport.scrollWidth).toBeLessThanOrEqual(articleViewport.clientWidth);

	const relatedArchives = page.getByRole("region", { name: "本篇关联档案" });
	await expect(relatedArchives.getByRole("listitem")).toHaveCount(4);
	for (const identity of ["原始材料", "研究观点", "口述记忆", "待考说法"]) {
		await expect(relatedArchives.getByText(identity, { exact: true })).toBeVisible();
	}

	await relatedArchives.getByRole("link", { name: /NJH000006.*陈宗霞/ }).click();
	await expect(page.getByRole("heading", { level: 1, name: /陈宗霞/ })).toBeVisible();
	const oralRecordFacts = page.getByRole("region", { name: "材料与审核" });
	await expect(oralRecordFacts.getByText("口述记忆", { exact: true })).toBeVisible();
	await expect(oralRecordFacts.getByText("材料日期", { exact: true })).toBeVisible();
	await expect(oralRecordFacts.getByText("所述时期", { exact: true })).toBeVisible();
	await expect(oralRecordFacts.getByText("推定时期", { exact: true })).toBeVisible();
	await expect(oralRecordFacts.getByText("推定依据", { exact: true })).toBeVisible();
	await expect(oralRecordFacts.getByText("推定不确定性", { exact: true })).toBeVisible();
	const oralDescription = page.getByRole("region", { name: "档案说明" });
	await expect(oralDescription).toContainText("讲述者背景");
	await expect(oralDescription).toContainText("采集时间");
	await expect(oralDescription).toContainText("采集地点");
	await expect(oralDescription).toContainText("停止线");
	const oralViewport = await page.evaluate(() => ({
		clientWidth: document.documentElement.clientWidth,
		scrollWidth: document.documentElement.scrollWidth,
	}));
	expect(oralViewport.scrollWidth).toBeLessThanOrEqual(oralViewport.clientWidth);

	await page.goto("/archive/NJH000007");
	await expect(page.getByText("待考说法", { exact: true }).first()).toBeVisible();
	await expect(page.getByRole("region", { name: "档案说明" })).toContainText("本站不把它写成史实");

	const exportResponse = await request.get("/api/archive/NJH000007");
	expect(exportResponse.ok()).toBe(true);
	await expect(exportResponse.json()).resolves.toMatchObject({
		"dc:identifier": "NJH000007",
		"dcterms:created": "2016-08-18",
		"dcterms:temporal": expect.stringContaining("公元 311 年"),
		"nanjinghua:archiveTime": {
			materialDate: "2016-08-18",
			describedPeriod: expect.stringContaining("公元 311 年"),
			inferredPeriod: expect.stringContaining("公元 311 年"),
			inferenceBasis: expect.stringContaining("连续传承线"),
			uncertainty: expect.stringContaining("未列出"),
		},
		"nanjinghua:evidenceIdentity": "待考说法",
	});
});
