import type { SubmissionEnv } from "./turnstile";

export function errorResponse(status: number, code: string, message: string, details?: unknown) {
	return Response.json({ error: { code, message, details } }, { status });
}

async function digest(value: string) {
	return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

export async function editorIsAuthorized(request: Request, environment: SubmissionEnv) {
	const expected = environment.EDITOR_API_KEY;
	const provided = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
	if (!expected || !provided) return false;

	const [expectedDigest, providedDigest] = await Promise.all([digest(expected), digest(provided)]);
	return expectedDigest.every((byte, index) => byte === providedDigest[index]);
}
