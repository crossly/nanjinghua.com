import { expect, test } from "@playwright/test";

const editorHeaders = { Authorization: "Bearer test-editor-key" };

function editorHeadersAt(now: Date) {
	return { ...editorHeaders, "X-Test-Now": now.toISOString() };
}

function validSubmission(overrides: Record<string, unknown> = {}) {
	return {
		type: "材料出处",
		description: `这是一条用于验证公众线索处理周期的完整材料说明 ${crypto.randomUUID()}`,
		sourceUrl: "https://example.com/nanjing-source",
		archiveId: "",
		contactMethod: "电子邮箱",
		contactValue: "reader@example.com",
		policyAccepted: true,
		turnstileToken: "test-pass-token",
		...overrides,
	};
}

test("Worker HTTP 边界执行验证、数据分离、状态转换和保留周期", async ({ request }, testInfo) => {
	test.skip(testInfo.project.name === "mobile-chromium", "HTTP 集成行为与视口无关");
	const invalid = await request.post("/api/submissions", {
		data: validSubmission({ description: "太短" }),
	});
	expect(invalid.status()).toBe(422);

	const rejected = await request.post("/api/submissions", {
		data: validSubmission({ turnstileToken: "test-fail-token" }),
	});
	expect(rejected.status()).toBe(403);

	const verifierUnavailable = await request.post("/api/submissions", {
		data: validSubmission({ turnstileToken: "test-error-token" }),
	});
	expect(verifierUnavailable.status()).toBe(503);

	const storageUnavailable = await request.post("/api/submissions", {
		headers: { "X-Test-Database-Failure": "1" },
		data: validSubmission(),
	});
	expect(storageUnavailable.status()).toBe(503);
	await expect(storageUnavailable.json()).resolves.toMatchObject({
		error: { code: "STORAGE_UNAVAILABLE" },
	});

	const created = await request.post("/api/submissions", {
		data: validSubmission({
			type: "权利请求",
			archiveId: "NJH000001",
			description: `请求核查 NJH000001 的权利状态，并请编辑优先处理 ${crypto.randomUUID()}`,
		}),
	});
	expect(created.status()).toBe(201);
	const createdBody = (await created.json()) as { referenceId: string; message: string };
	expect(createdBody.message).toContain("不代表必然采纳");
	expect(createdBody.referenceId).toMatch(/^SUB-\d{8}-[A-F0-9]{10}$/);

	const unauthorized = await request.get(`/api/editor/submissions/${createdBody.referenceId}`);
	expect(unauthorized.status()).toBe(401);

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
		archive_id: "NJH000001",
		priority: 1,
		status: "已收到",
	});
	expect(storedBody.lead).not.toHaveProperty("contact_value");
	expect(storedBody.contact).toMatchObject({
		lead_id: createdBody.referenceId,
		contact_method: "电子邮箱",
		contact_value: "reader@example.com",
	});

	const dispositionData = {
		decisionType: "目录撤回",
		publicCatalogAction: "保留",
		storedCopyAction: "保留",
		backupAction: "销毁",
		note: "保留经确认可公开的最小目录，本站核验副本受限保留，删除既有备份。",
	};
	const unauthorizedDisposition = await request.post(
		`/api/editor/submissions/${createdBody.referenceId}/dispositions`,
		{ data: dispositionData },
	);
	expect(unauthorizedDisposition.status()).toBe(401);

	const unverifiedDisposition = await request.post(
		`/api/editor/submissions/${createdBody.referenceId}/dispositions`,
		{ headers: editorHeaders, data: dispositionData },
	);
	expect(unverifiedDisposition.status()).toBe(409);

	const verification = await request.patch(`/api/editor/submissions/${createdBody.referenceId}`, {
		headers: editorHeaders,
		data: { status: "核验中", note: "已核验请求人与所述权利关系" },
	});
	expect(verification.ok()).toBe(true);
	const bypassDisposition = await request.patch(
		`/api/editor/submissions/${createdBody.referenceId}`,
		{
			headers: editorHeaders,
			data: { status: "已采纳", note: "不能绕过最终处置" },
		},
	);
	expect(bypassDisposition.status()).toBe(409);

	const contradictoryDisposition = await request.post(
		`/api/editor/submissions/${createdBody.referenceId}/dispositions`,
		{
			headers: editorHeaders,
			data: { ...dispositionData, publicCatalogAction: "移除" },
		},
	);
	expect(contradictoryDisposition.status()).toBe(422);

	const acceptedAt = new Date(Date.now() + 60_000);
	const disposition = await request.post(
		`/api/editor/submissions/${createdBody.referenceId}/dispositions`,
		{ headers: editorHeadersAt(acceptedAt), data: dispositionData },
	);
	expect(disposition.status()).toBe(201);
	await expect(disposition.json()).resolves.toMatchObject({ status: "已采纳" });
	const afterDisposition = await request.get(`/api/editor/submissions/${createdBody.referenceId}`, {
		headers: editorHeaders,
	});
	const afterDispositionBody = await afterDisposition.json();
	expect(afterDispositionBody.lead).toMatchObject({
		status: "已采纳",
		terminal_at: acceptedAt.toISOString(),
	});
	expect(afterDispositionBody.dispositions).toEqual([
		expect.objectContaining({
			archive_id: "NJH000001",
			decision_type: "目录撤回",
			public_catalog_action: "保留",
			stored_copy_action: "保留",
			backup_action: "销毁",
		}),
	]);
	const repeatedDisposition = await request.post(
		`/api/editor/submissions/${createdBody.referenceId}/dispositions`,
		{ headers: editorHeaders, data: dispositionData },
	);
	expect(repeatedDisposition.status()).toBe(409);

	const invalidTransition = await request.patch(
		`/api/editor/submissions/${createdBody.referenceId}`,
		{ headers: editorHeaders, data: { status: "已收到" } },
	);
	expect(invalidTransition.status()).toBe(409);

	const closedAt = new Date(acceptedAt.getTime() + 89 * 86_400_000);
	const closed = await request.patch(`/api/editor/submissions/${createdBody.referenceId}`, {
		headers: editorHeadersAt(closedAt),
		data: { status: "已关闭", note: "集成测试关闭" },
	});
	expect(closed.ok()).toBe(true);
	const afterClosing = await request.get(`/api/editor/submissions/${createdBody.referenceId}`, {
		headers: editorHeaders,
	});
	expect((await afterClosing.json()).lead).toMatchObject({
		status: "已关闭",
		terminal_at: acceptedAt.toISOString(),
	});

	const afterContactRetention = new Date(acceptedAt.getTime() + 91 * 86_400_000).toISOString();
	const contactRetention = await request.post("/api/editor/submissions/maintenance", {
		headers: editorHeaders,
		data: { now: afterContactRetention },
	});
	expect(contactRetention.ok()).toBe(true);
	expect(
		((await contactRetention.json()) as { contactsDeleted: number }).contactsDeleted,
	).toBeGreaterThanOrEqual(1);

	const afterDeletion = await request.get(`/api/editor/submissions/${createdBody.referenceId}`, {
		headers: editorHeaders,
	});
	expect((await afterDeletion.json()).contact).toBeNull();

	const ordinary = await request.post("/api/submissions", {
		data: validSubmission({ contactMethod: undefined, contactValue: undefined }),
	});
	const ordinaryId = ((await ordinary.json()) as { referenceId: string }).referenceId;
	const closable = await request.post("/api/submissions", {
		data: validSubmission({
			type: "纠错",
			contactMethod: undefined,
			contactValue: undefined,
		}),
	});
	const closableId = ((await closable.json()) as { referenceId: string }).referenceId;
	const priority = await request.post("/api/submissions", {
		data: validSubmission({
			type: "隐私或安全请求",
			archiveId: "NJH000001",
			contactMethod: undefined,
			contactValue: undefined,
		}),
	});
	const priorityId = ((await priority.json()) as { referenceId: string }).referenceId;

	const reminderTime = new Date(Date.now() + 181 * 86_400_000);
	const reminders = await request.post("/api/editor/submissions/maintenance", {
		headers: editorHeaders,
		data: { now: reminderTime.toISOString() },
	});
	expect(reminders.ok()).toBe(true);
	const reminderBody = (await reminders.json()) as {
		remindersTriggered: number;
		reminderIds: string[];
	};
	expect(reminderBody.remindersTriggered).toBeGreaterThanOrEqual(3);
	expect(reminderBody.reminderIds).toEqual(
		expect.arrayContaining([ordinaryId, closableId, priorityId]),
	);
	const ordinaryAfterReminder = await request.get(`/api/editor/submissions/${ordinaryId}`, {
		headers: editorHeaders,
	});
	const ordinaryAfterReminderBody = (await ordinaryAfterReminder.json()) as {
		events: Array<Record<string, unknown>>;
	};
	expect(ordinaryAfterReminderBody.events.at(-1)).toMatchObject({
		from_status: "已收到",
		to_status: "已收到",
		note: "180 天无处理，提醒编辑复核",
		actor: "保留周期任务",
	});

	const reviewedAt = new Date(reminderTime.getTime() + 86_400_000);
	const reviewed = await request.patch(`/api/editor/submissions/${ordinaryId}`, {
		headers: editorHeadersAt(reviewedAt),
		data: { status: "核验中", note: "编辑已重新处理" },
	});
	expect(reviewed.ok()).toBe(true);

	const closeTime = new Date(reminderTime.getTime() + 8 * 86_400_000).toISOString();
	const closures = await request.post("/api/editor/submissions/maintenance", {
		headers: editorHeaders,
		data: { now: closeTime },
	});
	expect(closures.ok()).toBe(true);
	expect(
		((await closures.json()) as { submissionsClosed: number }).submissionsClosed,
	).toBeGreaterThanOrEqual(1);

	const closableAfter = await request.get(`/api/editor/submissions/${closableId}`, {
		headers: editorHeaders,
	});
	expect((await closableAfter.json()).lead.status).toBe("已关闭");
	const ordinaryAfterGrace = await request.get(`/api/editor/submissions/${ordinaryId}`, {
		headers: editorHeaders,
	});
	expect((await ordinaryAfterGrace.json()).lead).toMatchObject({
		status: "核验中",
		reminder_sent_at: null,
	});

	const secondReminderTime = new Date(reviewedAt.getTime() + 181 * 86_400_000);
	const secondReminder = await request.post("/api/editor/submissions/maintenance", {
		headers: editorHeaders,
		data: { now: secondReminderTime.toISOString() },
	});
	expect(((await secondReminder.json()) as { reminderIds: string[] }).reminderIds).toContain(
		ordinaryId,
	);
	const secondCloseTime = new Date(secondReminderTime.getTime() + 8 * 86_400_000);
	await request.post("/api/editor/submissions/maintenance", {
		headers: editorHeaders,
		data: { now: secondCloseTime.toISOString() },
	});
	const ordinaryAfter = await request.get(`/api/editor/submissions/${ordinaryId}`, {
		headers: editorHeaders,
	});
	expect((await ordinaryAfter.json()).lead.status).toBe("已关闭");
	const priorityAfter = await request.get(`/api/editor/submissions/${priorityId}`, {
		headers: editorHeaders,
	});
	expect((await priorityAfter.json()).lead).toMatchObject({
		status: "已收到",
		priority: 1,
	});

	const raced = await request.post("/api/submissions", {
		data: validSubmission({ contactMethod: undefined, contactValue: undefined }),
	});
	const racedId = ((await raced.json()) as { referenceId: string }).referenceId;
	const raceResponses = await Promise.all([
		request.patch(`/api/editor/submissions/${racedId}`, {
			headers: editorHeaders,
			data: { status: "核验中" },
		}),
		request.patch(`/api/editor/submissions/${racedId}`, {
			headers: editorHeaders,
			data: { status: "核验中" },
		}),
	]);
	expect(raceResponses.map((response) => response.status()).sort()).toEqual([200, 409]);
	const racedAfter = await request.get(`/api/editor/submissions/${racedId}`, {
		headers: editorHeaders,
	});
	expect(((await racedAfter.json()) as { events: unknown[] }).events).toHaveLength(2);
});

test("公众可以在不注册和不上传文件的情况下提交线索", async ({ page }) => {
	await page.goto("/contribute");
	await expect(page.getByRole("heading", { level: 1, name: "提供一条线索" })).toBeVisible();
	await expect(page.locator('input[type="file"]')).toHaveCount(0);
	await page.getByLabel("线索类型").selectOption("纠错");
	await page
		.getByLabel("说明")
		.fill(`页面上的一处材料日期可能需要修正，请编辑重新核对来源 ${crypto.randomUUID()}`);
	await page.getByLabel("材料链接（可选）").fill("https://example.com/correction");
	await page.getByLabel("联系类型（可选）").selectOption("电子邮箱");
	await page.getByLabel("联系方式（可选）").fill("reader@example.com");
	await page.getByLabel(/我已了解上述信息用途/).check();
	const submissionResponse = page.waitForResponse(
		(response) =>
			response.url().endsWith("/api/submissions") && response.request().method() === "POST",
	);
	await page.getByRole("button", { name: "提交线索" }).click();
	expect((await submissionResponse).status()).toBe(201);

	await expect(page.getByText(/提交不代表必然采纳/)).toBeVisible();
	await expect(page.getByText(/编号：SUB-\d{8}-[A-F0-9]{10}/)).toBeVisible();
	const widths = await page.evaluate(() => ({
		client: document.documentElement.clientWidth,
		scroll: document.documentElement.scrollWidth,
	}));
	expect(widths.scroll).toBeLessThanOrEqual(widths.client);
});

test("网络失败后保留表单内容并允许重试", async ({ page }) => {
	await page.goto("/contribute");
	await page.route("**/api/submissions", async (route) => {
		if (route.request().method() === "POST") await route.abort("failed");
		else await route.continue();
	});
	const description = `这条线索用于验证网络失败后的恢复反馈 ${crypto.randomUUID()}`;
	await page.getByLabel("线索类型").selectOption("材料出处");
	await page.getByLabel("说明").fill(description);
	await page.getByLabel(/我已了解上述信息用途/).check();
	await page.getByRole("button", { name: "提交线索" }).click();

	await expect(page.getByText(/提交未完成，请检查网络后重试/)).toBeVisible();
	await expect(page.getByRole("button", { name: "提交线索" })).toBeEnabled();
	await expect(page.getByLabel("说明")).toHaveValue(description);
});
