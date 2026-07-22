import { ALTERNATE_HOSTNAME, CANONICAL_HOSTNAME, SITE_ORIGIN } from "./site.ts";

export function redirectCanonicalRequest(request: Request): Response | null {
	const requestUrl = new URL(request.url);
	const hostname = requestUrl.hostname.toLowerCase();
	const isAlternateRequest = hostname === ALTERNATE_HOSTNAME;
	const isInsecureCanonicalRequest =
		hostname === CANONICAL_HOSTNAME && requestUrl.protocol === "http:";
	if (!isAlternateRequest && !isInsecureCanonicalRequest) {
		return null;
	}

	const redirectUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, SITE_ORIGIN);
	return Response.redirect(redirectUrl, 308);
}

export function applyIndexingPolicy(request: Request, response: Response): Response {
	if (new URL(request.url).hostname.toLowerCase() === CANONICAL_HOSTNAME) return response;

	const headers = new Headers(response.headers);
	headers.set("X-Robots-Tag", "noindex, nofollow");
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}
