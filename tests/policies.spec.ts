import { expect, test } from "@playwright/test";

const expectedFooterLinks = [
	["关于本站", "/policies/about"],
	["内容与复核", "/policies/editorial"],
	["AI 与透明度", "/policies/transparency"],
	["版权与使用", "/policies/rights-and-licensing"],
	["隐私说明", "/policies/privacy"],
	["纠错与权利", "/policies/corrections-and-rights"],
	["无障碍说明", "/policies/accessibility"],
] as const;

test("全站页脚只提供当前有效的制度和反馈入口", async ({ page }) => {
	await page.goto("/");
	const footer = page.getByRole("contentinfo");
	for (const [name, href] of expectedFooterLinks) {
		await expect(footer.getByRole("link", { name })).toHaveAttribute("href", href);
	}
	await expect(footer.getByRole("link", { name: "反馈与纠错" })).toHaveAttribute(
		"href",
		"/contribute",
	);
	await expect(footer.getByText(/原创文字 CC BY 4\.0/)).toBeVisible();
	await expect(footer.getByText("旧资料柜", { exact: true })).toHaveCount(0);
});

test("关于、复核和 AI 页面准确描述当前故事与试音", async ({ page }) => {
	await page.goto("/policies/about");
	await expect(page.getByText(/十五个原创城市场景/)).toBeVisible();
	await expect(page.getByText(/不是新闻采访、口述史或真实人物记录/)).toBeVisible();

	await page.goto("/policies/editorial");
	await expect(page.getByText(/AI 合成试音：帮助试听节奏的实验性音频/)).toBeVisible();
	await expect(page.getByText(/待南京本地使用者复核/)).toBeVisible();

	await page.goto("/policies/transparency");
	await expect(page.getByText(/模型能生成一段听起来像方言的声音/)).toBeVisible();
	await expect(page.getByText(/目前没有机构赞助或合作背书/)).toBeVisible();
});

test("隐私和版权页面对应当前真实功能", async ({ page }) => {
	await page.goto("/policies/privacy");
	await expect(page.getByText(/localStorage 中保存已经打开过的故事路径/)).toBeVisible();
	await expect(page.getByText(/表单只接受文字和网址，不接受文件上传/)).toBeVisible();
	await expect(page.getByText(/联系方式在反馈采纳或关闭 90 天后删除/)).toBeVisible();

	await page.goto("/policies/rights-and-licensing");
	await expect(page.getByText(/本站原创故事、场景说明和制度文字以 CC BY 4\.0/)).toBeVisible();
	await expect(page.getByText(/不要把文字的 CC BY 4\.0 自动套用到图片或音频文件/)).toBeVisible();
});
