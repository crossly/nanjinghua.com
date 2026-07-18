import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { env } from "cloudflare:workers";

import { editorIsAuthorized, errorResponse } from "../../../../../submissions/http";
import { dispositionInputSchema } from "../../../../../submissions/schema";
import { createSubmissionDisposition } from "../../../../../submissions/service";
import type { SubmissionEnv } from "../../../../../submissions/turnstile";

const validReference = /^SUB-\d{8}-[A-F0-9]{10}$/;

export const Route = createFileRoute("/api/editor/submissions/$submissionId/dispositions")({
	server: {
		handlers: {
			POST: async ({ request, params }) => {
				const environment = env as SubmissionEnv;
				if (!(await editorIsAuthorized(request, environment))) {
					return errorResponse(401, "UNAUTHORIZED", "编辑凭证无效。");
				}
				if (!validReference.test(params.submissionId)) {
					return errorResponse(404, "NOT_FOUND", "未找到该线索。");
				}

				let input: unknown;
				try {
					input = await request.json();
				} catch {
					return errorResponse(400, "INVALID_JSON", "请求格式无效。");
				}
				const parsed = dispositionInputSchema.safeParse(input);
				if (!parsed.success) {
					return errorResponse(
						422,
						"VALIDATION_FAILED",
						"处置记录无效。",
						parsed.error.flatten().fieldErrors,
					);
				}

				let now = new Date();
				if (environment.TURNSTILE_MODE === "test") {
					const testNow = request.headers.get("X-Test-Now");
					if (testNow) now = new Date(testNow);
				}
				if (Number.isNaN(now.getTime())) {
					return errorResponse(422, "INVALID_DATE", "测试日期无效。");
				}

				const result = await createSubmissionDisposition(
					environment.SUBMISSIONS_DB,
					params.submissionId,
					parsed.data,
					now,
				);
				if (result.outcome === "not-found") {
					return errorResponse(404, "NOT_FOUND", "未找到该线索。");
				}
				if (result.outcome === "missing-archive") {
					return errorResponse(409, "MISSING_ARCHIVE_ID", "该线索没有关联档案编号。");
				}
				if (result.outcome === "incompatible") {
					return errorResponse(409, "INCOMPATIBLE_DECISION", "处置类型与线索类型不匹配。");
				}
				if (result.outcome === "invalid-state") {
					return errorResponse(
						409,
						"INVALID_DISPOSITION_STATE",
						`只有核验中的线索可以形成最终处置；当前状态为${result.currentStatus}。`,
					);
				}
				if (result.outcome === "already-decided") {
					return errorResponse(409, "DISPOSITION_ALREADY_RECORDED", "该线索已有不可逆的最终处置。");
				}

				return Response.json(result, { status: 201 });
			},
		},
	},
});
