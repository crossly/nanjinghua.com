import { expect, test } from "@playwright/test";

const expectedFooterLinks = [
	["关于本站", "/policies/about"],
	["编辑与证据原则", "/policies/editorial"],
	["版权与开放许可", "/policies/rights-and-licensing"],
	["隐私政策", "/policies/privacy"],
	["纠错与权利申诉", "/policies/corrections-and-rights"],
	["无障碍说明", "/policies/accessibility"],
	["参与贡献", "/policies/participate"],
	["透明度与合作", "/policies/transparency"],
] as const;

test("全站页脚提供全部非语音制度页面的稳定入口", async ({ page }) => {
	await page.goto("/");
	const footer = page.getByRole("contentinfo");
	await expect(footer).toBeVisible();

	for (const [name, href] of expectedFooterLinks) {
		await expect(footer.getByRole("link", { name })).toHaveAttribute("href", href);
	}

	await footer.getByRole("link", { name: "隐私政策" }).click();
	await expect(page).toHaveURL(/\/policies\/privacy\/?$/);
	await expect(page.getByRole("heading", { level: 1, name: "隐私政策" })).toBeVisible();
	await expect(page.getByText(/满 90 天删除联系方式/)).toBeVisible();
	await expect(page.getByText(/提醒后 7 天宽限期/)).toBeVisible();
});

test("制度页明确独立性、许可层级和赞助边界", async ({ page }) => {
	await page.goto("/policies/about");
	await expect(
		page.getByText(/不代表南京市政府、任何博物馆、研究院、高校或其他学术机构/),
	).toBeVisible();

	await page.goto("/policies/rights-and-licensing");
	await expect(page.getByText(/档案元数据以 CC0 1\.0 Universal/)).toBeVisible();
	await expect(page.getByText(/原创专题文章文字以 CC BY 4\.0/)).toBeVisible();

	await page.goto("/policies/transparency");
	await expect(page.getByText(/赞助方和合作方不得修改历史结论、删除争议/)).toBeVisible();
	await expect(page.getByText(/购买审核背书/)).toBeVisible();
});

test("专题文章公开真实编辑、日期、核对范围和 AI 辅助状态", async ({ page }) => {
	await page.goto("/articles/what-is-nanjinghua");
	const byline = page.locator(".article-byline");
	await expect(byline).toContainText("Ricky（主编） · 编辑核对后发布 · 2026-07-17");
	await expect(byline).toContainText("核对范围");
	await expect(byline).toContainText("不裁定唯一正宗形式");
	await expect(byline).toContainText("辅助资料发现、归纳与初稿整理");
	await expect(byline).not.toContainText("专家复核");
});

test("档案页面逐项公开保存文件的权利依据和核对范围", async ({ page }) => {
	await page.goto("/archive/NJH000008");
	await expect(page.getByText(/权利依据：.*未声明 CC 许可/)).toBeVisible();
	await expect(page.getByText("核对范围", { exact: true })).toBeVisible();
});
