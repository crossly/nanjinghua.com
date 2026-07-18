import defaultServerEntry from "@tanstack/react-start/server-entry";

import { applyIndexingPolicy } from "./indexing-policy";
import { runSubmissionRetention } from "./submissions/service";
import type { SubmissionEnv } from "./submissions/turnstile";

export default {
	async fetch(request) {
		const response = await defaultServerEntry.fetch(request);
		return applyIndexingPolicy(request, response);
	},
	scheduled(_controller, environment, context) {
		context.waitUntil(
			runSubmissionRetention(environment.SUBMISSIONS_DB).then((result) => {
				console.log("Submission retention completed", result);
			}),
		);
	},
} satisfies ExportedHandler<SubmissionEnv>;
