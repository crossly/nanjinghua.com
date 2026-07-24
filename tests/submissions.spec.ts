import { expect, test } from "@playwright/test";

const editorHeaders = { Authorization: "Bearer test-editor-key" };

function validFeedback(overrides: Record<string, unknown> = {}) {
	return {
		type: "材料出处",
		description: `这是一条用于验证反馈处理的完整说明 ${crypto.randomUUID()}`,
		sourceUrl: "https://example.com/nanjing-source",
		contactMethod: "电子邮箱",
		contactValue: "reader@example.com",
		policyAccepted: true,
		turnstileToken: "test-pass-token",
		...overrides,
	};
}

test("反馈 API 不再接受旧档案编号并继续分离联系方式", async ({ request }, testInfo) => {
	test.skip(testInfo.project.name === "mobile-chromium", "HTTP 集成行为与视口无关");

	const legacyArchiveField = await request.post("/api/submissions", {
		data: validFeedback({ archiveId: "NJH000001" }),
	});
	expect(legacyArchiveField.status()).toBe(422);

	const invalid = await request.post("/api/submissions", {
		data: validFeedback({ description: "太短" }),
	});
	expect(invalid.status()).toBe(422);

	const created = await request.post("/api/submissions", {
		data: validFeedback({
			type: "权利请求",
			description: `请求核对某个故事页面的图片使用范围 ${crypto.randomUUID()}`,
		}),
	});
	expect(created.status()).toBe(201);
	const createdBody = (await created.json()) as { referenceId: string; message: string };
	expect(createdBody.message).toContain("反馈已收到");
	expect(createdBody.referenceId).toMatch(/^SUB-\d{8}-[A-F0-9]{10}$/);

	const stored = await request.get(`/api/editor/submissions/${createdBody.referenceId}`, {
		headers: editorHeaders,
	});
	expect(stored.ok()).toBe(true);
	const storedBody = (await stored.json()) as {
		lead: Record<string, unknown>;
		contact: Record<string, unknown>;
	};
	expect(storedBody.lead).toMatchObject({
		id: createdBody.referenceId,
		archive_id: null,
		priority: 1,
		status: "已收到",
	});
	expect(storedBody.lead).not.toHaveProperty("contact_value");
	expect(storedBody.contact).toMatchObject({
		lead_id: createdBody.referenceId,
		contact_method: "电子邮箱",
		contact_value: "reader@example.com",
	});
});

test("公众可以在不注册和不上传文件的情况下提交反馈", async ({ page }) => {
	await page.goto("/contribute");
	await expect(page.getByRole("heading", { level: 1, name: "反馈与纠错" })).toBeVisible();
	await expect(page.locator('input[type="file"]')).toHaveCount(0);
	await expect(page.getByLabel(/档案编号/)).toHaveCount(0);
	await page.getByLabel("线索类型").selectOption("纠错");
	await page
		.getByLabel("说明")
		.fill(`早点铺页面的一处短句使用情境可能需要修正 ${crypto.randomUUID()}`);
	await page.getByLabel("相关页面或来源链接（可选）").fill("https://example.com/correction");
	await page.getByLabel("联系类型（可选）").selectOption("电子邮箱");
	await page.getByLabel("联系方式（可选）").fill("reader@example.com");
	await page.getByLabel(/我已了解上述信息用途/).check();
	const submissionResponse = page.waitForResponse(
		(response) =>
			response.url().endsWith("/api/submissions") && response.request().method() === "POST",
	);
	await page.getByRole("button", { name: "提交反馈" }).click();
	expect((await submissionResponse).status()).toBe(201);
	await expect(page.getByText(/提交不代表必然采纳/)).toBeVisible();
	await expect(page.getByText(/编号：SUB-\d{8}-[A-F0-9]{10}/)).toBeVisible();
});

test("网络失败后保留反馈内容并允许重试", async ({ page }) => {
	await page.goto("/contribute");
	await page.route("**/api/submissions", async (route) => {
		if (route.request().method() === "POST") await route.abort("failed");
		else await route.continue();
	});
	const description = `这条反馈用于验证网络失败后的恢复行为 ${crypto.randomUUID()}`;
	await page.getByLabel("线索类型").selectOption("材料出处");
	await page.getByLabel("说明").fill(description);
	await page.getByLabel(/我已了解上述信息用途/).check();
	await page.getByRole("button", { name: "提交反馈" }).click();
	await expect(page.getByText(/提交未完成，请检查网络后重试/)).toBeVisible();
	await expect(page.getByRole("button", { name: "提交反馈" })).toBeEnabled();
	await expect(page.getByLabel("说明")).toHaveValue(description);
});
