import defaultServerEntry from "@tanstack/react-start/server-entry";

import { runSubmissionRetention } from "./submissions/service";
import type { SubmissionEnv } from "./submissions/turnstile";

export default {
	fetch(request) {
		return defaultServerEntry.fetch(request);
	},
	scheduled(_controller, environment, context) {
		context.waitUntil(
			runSubmissionRetention(environment.SUBMISSIONS_DB).then((result) => {
				console.log("Submission retention completed", result);
			}),
		);
	},
} satisfies ExportedHandler<SubmissionEnv>;
