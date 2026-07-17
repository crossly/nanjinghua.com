import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { env } from "cloudflare:workers";

import { editorIsAuthorized, errorResponse } from "../../../../submissions/http";
import { runSubmissionRetention } from "../../../../submissions/service";
import type { SubmissionEnv } from "../../../../submissions/turnstile";

export const Route = createFileRoute("/api/editor/submissions/maintenance")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const environment = env as SubmissionEnv;
				if (!(await editorIsAuthorized(request, environment))) {
					return errorResponse(401, "UNAUTHORIZED", "编辑凭证无效。");
				}

				let now = new Date();
				if (environment.TURNSTILE_MODE === "test") {
					const input = (await request.json().catch(() => ({}))) as { now?: unknown };
					if (typeof input.now === "string") now = new Date(input.now);
				}
				if (Number.isNaN(now.getTime())) {
					return errorResponse(422, "INVALID_DATE", "测试日期无效。");
				}

				try {
					return Response.json(await runSubmissionRetention(environment.SUBMISSIONS_DB, now));
				} catch (error) {
					console.error("Submission maintenance failed", error);
					return errorResponse(503, "STORAGE_UNAVAILABLE", "保留周期任务暂时无法完成。");
				}
			},
		},
	},
});
