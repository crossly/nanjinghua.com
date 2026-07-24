import defaultServerEntry from "@tanstack/react-start/server-entry";

import { applyIndexingPolicy, redirectCanonicalRequest } from "./indexing-policy";
import { runSubmissionRetention } from "./submissions/service";
import type { SubmissionEnv } from "./submissions/turnstile";

type SiteEnv = SubmissionEnv & { ASSETS: Fetcher };

function isStaticAssetRequest(request: Request): boolean {
	const pathname = new URL(request.url).pathname;
	return (
		["/assets/", "/audio/", "/images/", "/downloads/"].some((prefix) =>
			pathname.startsWith(prefix),
		) || ["/favicon.svg", "/manifest.json", "/robots.txt", "/sitemap.xml"].includes(pathname)
	);
}

export default {
	async fetch(request, environment) {
		const redirect = redirectCanonicalRequest(request);
		if (redirect) return redirect;

		if (isStaticAssetRequest(request)) {
			return applyIndexingPolicy(request, await environment.ASSETS.fetch(request));
		}

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
} satisfies ExportedHandler<SiteEnv>;
