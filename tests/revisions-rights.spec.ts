import { expect, test } from "@playwright/test";

test("档案页公开真实修订记录并提供已关联的权利申诉入口", async ({ page }) => {
	await page.goto("/archive/NJH000011");

	const revisions = page.getByRole("region", { name: "修订记录" });
	await expect(revisions.getByText("事实修订", { exact: true })).toBeVisible();
	await expect(revisions).toContainText("2026-07-17");
	await expect(revisions).toContainText("Ricky（主编）");
	await expect(revisions).toContainText("替换此前未能逐页核对的来源组合");

	await page.getByRole("link", { name: "纠错或权利申诉" }).click();
	await expect(page).toHaveURL(/\/contribute\?archiveId=NJH000011/);
	await expect(page.getByLabel("关联档案编号（必填）")).toHaveValue("NJH000011");
	await page.reload();
	await expect(page.getByLabel("线索类型")).toHaveValue("权利请求");
	await expect(page.getByLabel("关联档案编号（必填）")).toHaveValue("NJH000011");

	const widths = await page.evaluate(() => ({
		client: document.documentElement.clientWidth,
		scroll: document.documentElement.scrollWidth,
	}));
	expect(widths.scroll).toBeLessThanOrEqual(widths.client);
});

test("权利与隐私申诉必须关联已登记的永久档案编号", async ({ request }, testInfo) => {
	test.skip(testInfo.project.name === "mobile-chromium", "HTTP 输入校验与视口无关");
	const archiveMetadata = await request.get("/api/archive/NJH000011");
	expect(archiveMetadata.headers()["cache-control"]).toBe("no-store");
	const missingArchive = await request.post("/api/submissions", {
		data: {
			type: "权利请求",
			description: "请求核查相关档案的权利状态，但当前没有填写需要处理的档案编号。",
			archiveId: "",
			policyAccepted: true,
			turnstileToken: "test-pass-token",
		},
	});
	expect(missingArchive.status()).toBe(422);

	const unknownArchive = await request.post("/api/submissions", {
		data: {
			type: "隐私或安全请求",
			description: "请求处理一个并不存在的档案编号，以验证申诉不会关联到悬空记录。",
			archiveId: "NJH999999",
			policyAccepted: true,
			turnstileToken: "test-pass-token",
		},
	});
	expect(unknownArchive.status()).toBe(422);
});

test("目录撤回与隐私删除只向页面和 API 暴露允许保留的字段", async ({ page, request }) => {
	await page.goto("/archive/NJH000019");
	await expect(
		page.getByRole("heading", { level: 1, name: "已撤回材料的最小目录占位" }),
	).toBeVisible();
	await expect(page.getByRole("region", { name: "目录占位" })).toContainText(
		"永久编号继续保留，不会分配给其他材料",
	);
	const catalogRevisions = page.getByRole("region", { name: "修订记录" });
	await expect(catalogRevisions.getByText("证据身份变更", { exact: true })).toBeVisible();
	await expect(catalogRevisions).toContainText("待考说法 → 研究观点");
	await expect(page.getByRole("link", { name: "查看来源" })).toHaveCount(0);

	const catalogResponse = await request.get("/api/archive/NJH000019");
	const catalogExport = (await catalogResponse.json()) as Record<string, unknown>;
	expect(catalogExport["nanjinghua:publicationStatus"]).toBe("目录占位");
	expect(catalogExport).not.toHaveProperty("dc:source");
	expect(catalogExport).not.toHaveProperty("nanjinghua:archiveTime");

	await page.goto("/archive/NJH000020");
	await expect(page.getByRole("heading", { level: 1, name: "档案已因隐私请求移除" })).toBeVisible();
	await expect(page.getByRole("region", { name: "隐私删除" })).toContainText(
		"不公开原题名、人物、地点、来源、修订历史或处置细节",
	);
	await expect(page.getByText("已撤回材料的最小目录占位")).toHaveCount(0);

	const privacyResponse = await request.get("/api/archive/NJH000020");
	const privacyExport = (await privacyResponse.json()) as Record<string, unknown>;
	expect(privacyExport).toMatchObject({
		"dc:identifier": "NJH000020",
		"dc:title": "档案已因隐私请求移除",
		"nanjinghua:publicationStatus": "隐私删除",
	});
	expect(privacyExport).not.toHaveProperty("dc:source");
	expect(privacyExport).not.toHaveProperty("nanjinghua:revisions");

	await page.goto("/archive/NJH000008");
	const facts = page.getByRole("region", { name: "材料与审核" });
	await expect(facts).toContainText("处置：本站保存副本保留");
	await expect(facts).toContainText("备份无独立备份");
});
