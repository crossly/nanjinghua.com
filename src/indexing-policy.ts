import { CANONICAL_HOSTNAME, SITE_ORIGIN } from "./site";

export function redirectCanonicalHttpRequest(request: Request): Response | null {
	const requestUrl = new URL(request.url);
	if (requestUrl.hostname.toLowerCase() !== CANONICAL_HOSTNAME || requestUrl.protocol !== "http:") {
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
