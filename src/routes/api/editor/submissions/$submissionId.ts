import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { env } from "cloudflare:workers";

import { editorIsAuthorized, errorResponse } from "../../../../submissions/http";
import { statusUpdateSchema } from "../../../../submissions/schema";
import { getSubmissionForEditor, updateSubmissionStatus } from "../../../../submissions/service";
import type { SubmissionEnv } from "../../../../submissions/turnstile";

const validReference = /^SUB-\d{8}-[A-F0-9]{10}$/;

export const Route = createFileRoute("/api/editor/submissions/$submissionId")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const environment = env as SubmissionEnv;
				if (!(await editorIsAuthorized(request, environment))) {
					return errorResponse(401, "UNAUTHORIZED", "编辑凭证无效。");
				}
				if (!validReference.test(params.submissionId)) {
					return errorResponse(404, "NOT_FOUND", "未找到该线索。");
				}

				const submission = await getSubmissionForEditor(
					environment.SUBMISSIONS_DB,
					params.submissionId,
				);
				return submission
					? Response.json(submission)
					: errorResponse(404, "NOT_FOUND", "未找到该线索。");
			},
			PATCH: async ({ request, params }) => {
				const environment = env as SubmissionEnv;
				if (!(await editorIsAuthorized(request, environment))) {
					return errorResponse(401, "UNAUTHORIZED", "编辑凭证无效。");
				}

				let input: unknown;
				try {
					input = await request.json();
				} catch {
					return errorResponse(400, "INVALID_JSON", "请求格式无效。");
				}
				const parsed = statusUpdateSchema.safeParse(input);
				if (!parsed.success) {
					return errorResponse(422, "VALIDATION_FAILED", "状态或说明无效。");
				}
				let now = new Date();
				if (environment.TURNSTILE_MODE === "test") {
					const testNow = request.headers.get("X-Test-Now");
					if (testNow) now = new Date(testNow);
				}
				if (Number.isNaN(now.getTime())) {
					return errorResponse(422, "INVALID_DATE", "测试日期无效。");
				}

				const result = await updateSubmissionStatus(
					environment.SUBMISSIONS_DB,
					params.submissionId,
					parsed.data.status,
					parsed.data.note,
					now,
				);
				if (result.outcome === "not-found") {
					return errorResponse(404, "NOT_FOUND", "未找到该线索。");
				}
				if (result.outcome === "invalid-transition") {
					return errorResponse(
						409,
						"INVALID_STATUS_TRANSITION",
						`不能从“${result.currentStatus}”转为“${parsed.data.status}”。`,
					);
				}
				if (result.outcome === "missing-disposition") {
					return errorResponse(
						409,
						"MISSING_FINAL_DISPOSITION",
						"关联档案的纠错、权利或隐私线索必须通过最终处置接口完成采纳。",
					);
				}

				return Response.json({ status: result.status });
			},
		},
	},
});
