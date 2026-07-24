export type DiagnosticOutcome = "passed" | "site-failure" | "infrastructure-error";

export type DiagnosticCheck = {
	passed: boolean;
	infrastructureError: boolean;
};

export function classifyDiagnosticOutcome(checks: DiagnosticCheck[]): DiagnosticOutcome {
	if (checks.some((check) => !check.passed && !check.infrastructureError)) {
		return "site-failure";
	}
	if (checks.length === 0 || checks.some((check) => check.infrastructureError)) {
		return "infrastructure-error";
	}
	return checks.every((check) => check.passed) ? "passed" : "site-failure";
}

export function safeGlobalpingStatus(value: unknown): string {
	return typeof value === "string" && /^(?:failed|finished|in-progress|offline)$/.test(value)
		? value
		: "missing";
}

export function isGlobalpingInfrastructureStatus(status: string): boolean {
	return status !== "finished" && status !== "failed";
}

export function safeGlobalpingFailureReason(label: string, status: string, raw: unknown): string {
	if (typeof raw === "string" && /tim(?:e|ed)[ -]?out/i.test(raw)) {
		return `${label} 请求超时`;
	}
	if (status === "offline") return `${label} 固定探针离线`;
	return `${label} 状态为 ${status}`;
}
