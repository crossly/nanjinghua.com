export type SubmissionEnv = Omit<Cloudflare.Env, "TURNSTILE_MODE" | "TURNSTILE_SITE_KEY"> & {
	TURNSTILE_MODE: "production" | "test";
	TURNSTILE_SITE_KEY: string;
	TURNSTILE_SECRET_KEY?: string;
	EDITOR_API_KEY?: string;
};

type TurnstileResponse = {
	success: boolean;
	action?: string;
	"error-codes"?: string[];
};

export async function verifyTurnstile(token: string, request: Request, environment: SubmissionEnv) {
	if (environment.TURNSTILE_MODE === "test") {
		if (token === "test-error-token") return { outcome: "unavailable" as const };
		return token === "test-pass-token"
			? { outcome: "verified" as const }
			: { outcome: "rejected" as const };
	}

	if (!environment.TURNSTILE_SECRET_KEY || !environment.TURNSTILE_SITE_KEY) {
		return { outcome: "unavailable" as const };
	}

	try {
		const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				secret: environment.TURNSTILE_SECRET_KEY,
				response: token,
				remoteip: request.headers.get("CF-Connecting-IP") || undefined,
			}),
		});
		if (!response.ok) return { outcome: "unavailable" as const };

		const result = (await response.json()) as TurnstileResponse;
		return result.success && (!result.action || result.action === "public_submission")
			? { outcome: "verified" as const }
			: { outcome: "rejected" as const };
	} catch {
		return { outcome: "unavailable" as const };
	}
}
