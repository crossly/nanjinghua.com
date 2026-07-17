import { expect, test } from "@playwright/test";

test("读者可以在有限样本中理解今天的南京话怎样变化", async ({ page, request }) => {
	await page.goto("/");
	await page.getByRole("link", { name: "今天的南京话怎样变化？" }).click();

	await expect(
		page.getByRole("heading", { level: 1, name: "今天的南京话怎样变化？" }),
	).toBeVisible();
	await expect(page.getByText(/样本里的差异.*不等于.*南京总体人口/).first()).toBeVisible();
	await expect(page.getByText(/普通话拼音.*只作为搜索辅助/).first()).toBeVisible();

	const scopeTable = page.getByRole("table");
	for (const scope of ["39 份有效样本", "67 人", "四个片区，样本数未公开"]) {
		await expect(scopeTable.getByText(scope, { exact: true })).toBeVisible();
	}

	const relatedArchives = page.getByRole("region", { name: "本篇关联档案" });
	await expect(relatedArchives.getByRole("listitem")).toHaveCount(3);
	for (const id of ["NJH000012", "NJH000013", "NJH000014"]) {
		await expect(relatedArchives.getByRole("link", { name: new RegExp(id) })).toBeVisible();
	}

	const plannedAudio = page.getByRole("region", { name: "待关联档案" });
	await expect(plannedAudio.getByRole("heading", { name: "首批原创语音样本" })).toBeVisible();
	await expect(plannedAudio).toContainText("等待授权材料");
	await expect(plannedAudio).toContainText("不使用合成或未经授权的音频");
	await expect(page.locator("audio")).toHaveCount(0);

	await page.goto("/archive/NJH000012");
	await expectPageToFitViewport(page);
	const studentStudyFacts = page.getByRole("region", { name: "材料与审核" });
	await expect(studentStudyFacts.getByText("说话者成长地点", { exact: true })).toBeVisible();
	await expect(studentStudyFacts.getByText("材料采集地点", { exact: true })).toBeVisible();
	await expect(studentStudyFacts).toContainText("南京出生、来自不同城区");
	await expect(studentStudyFacts).toContainText("论文未公开具体学校或录音房间");

	await page.goto("/archive/NJH000013");
	await expectPageToFitViewport(page);
	const ageStudyFacts = page.getByRole("region", { name: "材料与审核" });
	await expect(ageStudyFacts).toContainText("南京主城区及近郊");
	await expect(ageStudyFacts).toContainText("2013 年 2—3 月");
	await expect(page.getByRole("region", { name: "档案说明" })).toContainText("67 人");

	const archiveResponse = await request.get("/api/archive/NJH000013");
	expect(archiveResponse.ok()).toBe(true);
	await expect(archiveResponse.json()).resolves.toMatchObject({
		"dc:identifier": "NJH000013",
		"dcterms:spatial": {
			speakerUpbringingPlace: expect.stringContaining("南京出生、成长"),
			materialCollectionPlace: expect.stringContaining("南京主城区及近郊"),
		},
	});

	await page.goto("/archive/NJH000014");
	await expectPageToFitViewport(page);
	await expect(page.getByRole("region", { name: "档案说明" })).toContainText(
		"没有公开四份问卷的完整样本数",
	);
});

async function expectPageToFitViewport(page: import("@playwright/test").Page) {
	const viewportMetrics = await page.evaluate(() => ({
		clientWidth: document.documentElement.clientWidth,
		scrollWidth: document.documentElement.scrollWidth,
	}));
	expect(viewportMetrics.scrollWidth).toBeLessThanOrEqual(viewportMetrics.clientWidth);
}
