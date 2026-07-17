import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { env } from "cloudflare:workers";

import { errorResponse } from "../../submissions/http";
import { submissionInputSchema } from "../../submissions/schema";
import { createSubmission } from "../../submissions/service";
import { type SubmissionEnv, verifyTurnstile } from "../../submissions/turnstile";

export const Route = createFileRoute("/api/submissions")({
	server: {
		handlers: {
			GET: () => {
				const environment = env as SubmissionEnv;
				return Response.json({
					available: Boolean(environment.TURNSTILE_SITE_KEY),
					siteKey: environment.TURNSTILE_SITE_KEY || null,
				});
			},
			POST: async ({ request }) => {
				const environment = env as SubmissionEnv;
				let input: unknown;
				try {
					input = await request.json();
				} catch {
					return errorResponse(400, "INVALID_JSON", "请求格式无效，请检查后重试。");
				}

				const parsed = submissionInputSchema.safeParse(input);
				if (!parsed.success) {
					return errorResponse(
						422,
						"VALIDATION_FAILED",
						"提交内容未通过校验，请修改标出的字段。",
						parsed.error.flatten().fieldErrors,
					);
				}

				const turnstile = await verifyTurnstile(parsed.data.turnstileToken, request, environment);
				if (turnstile.outcome === "rejected") {
					return errorResponse(403, "TURNSTILE_REJECTED", "人机验证未通过，请刷新验证后重试。");
				}
				if (turnstile.outcome === "unavailable") {
					return errorResponse(503, "TURNSTILE_UNAVAILABLE", "验证服务暂时不可用，请稍后重试。");
				}

				try {
					if (
						environment.TURNSTILE_MODE === "test" &&
						request.headers.get("X-Test-Database-Failure") === "1"
					) {
						throw new Error("Test-only database failure");
					}

					const submission = await createSubmission(environment.SUBMISSIONS_DB, parsed.data);
					return Response.json(
						{
							referenceId: submission.id,
							status: submission.status,
							priority: submission.priority,
							message: "线索已收到。提交不代表必然采纳，我们也无法保证逐条回复。",
						},
						{ status: 201 },
					);
				} catch (error) {
					console.error("Submission storage failed", error);
					return errorResponse(503, "STORAGE_UNAVAILABLE", "线索暂未保存，请稍后重新提交。");
				}
			},
		},
	},
});
