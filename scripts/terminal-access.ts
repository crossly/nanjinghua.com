import { isIP } from "node:net";

export const terminalRoutes = [
	{
		id: "home",
		path: "/",
		expectedPath: "/",
		expectedQuery: null,
		expectedContent: "南京话的历史",
	},
	{
		id: "story",
		path: "/stories/breakfast",
		expectedPath: "/stories/breakfast",
		expectedQuery: null,
		expectedContent: "早点铺的热气，先醒过来",
	},
	{
		id: "about",
		path: "/policies/about",
		expectedPath: "/policies/about",
		expectedQuery: null,
		expectedContent: "关于本站",
	},
	{
		id: "canonical",
		path: "/stories/breakfast/",
		expectedPath: "/stories/breakfast",
		expectedQuery: null,
		expectedContent: "早点铺的热气，先醒过来",
	},
] as const;

export type TerminalTrace = {
	ip: string;
	country: string;
	colo: string;
	tls: string | null;
};

export type CymruOrigin = {
	asn: number;
	prefix: string;
	country: string;
	registry: string;
	allocatedAt: string;
};

export type TerminalNetworkEvidence = {
	asn: number;
	asName: string;
	prefix: string | null;
	country: string;
	registry: string;
	allocatedAt: string;
	traceCountry: string;
	colo: string;
	tls: string | null;
};

export type ExpectedTerminalNetwork = {
	id: string;
	name: string;
	asn: number;
};

export type TerminalMeasurementResult = {
	route: string;
	round: number;
	passed: boolean;
};

export type TerminalRecoveryResult = {
	offlineFailureObserved: boolean;
	recovered: boolean;
};

function requiredTraceValue(values: Map<string, string>, key: string): string {
	const value = values.get(key);
	if (!value) throw new Error(`Cloudflare trace 缺少 ${key}`);
	return value;
}

export function parseCloudflareTrace(rawTrace: string): TerminalTrace {
	const values = new Map<string, string>();
	for (const line of rawTrace.split(/\r?\n/u)) {
		const separator = line.indexOf("=");
		if (separator <= 0) continue;
		values.set(line.slice(0, separator), line.slice(separator + 1));
	}
	const ip = requiredTraceValue(values, "ip");
	if (isIP(ip) === 0) throw new Error("Cloudflare trace 返回的 ip 格式无效");
	return {
		ip,
		country: requiredTraceValue(values, "loc").toUpperCase(),
		colo: requiredTraceValue(values, "colo").toUpperCase(),
		tls: values.get("tls") ?? null,
	};
}

function expandIpv6(address: string): string[] {
	let normalized = address.toLowerCase().split("%", 1)[0];
	if (normalized.includes(".")) {
		const lastColon = normalized.lastIndexOf(":");
		const ipv4 = normalized
			.slice(lastColon + 1)
			.split(".")
			.map(Number);
		if (
			ipv4.length !== 4 ||
			ipv4.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
		) {
			throw new Error("IPv6 中的 IPv4 尾部格式无效");
		}
		normalized = `${normalized.slice(0, lastColon)}:${((ipv4[0] << 8) | ipv4[1]).toString(16)}:${((ipv4[2] << 8) | ipv4[3]).toString(16)}`;
	}
	const halves = normalized.split("::");
	if (halves.length > 2) throw new Error("IPv6 压缩格式无效");
	const left = halves[0] ? halves[0].split(":") : [];
	const right = halves[1] ? halves[1].split(":") : [];
	const omitted = 8 - left.length - right.length;
	if (omitted < 0 || (halves.length === 1 && omitted !== 0)) {
		throw new Error("IPv6 分段数量无效");
	}
	return [...left, ...Array.from({ length: omitted }, () => "0"), ...right].map((part) =>
		part.padStart(4, "0"),
	);
}

export function buildCymruOriginQuery(ip: string): string {
	const version = isIP(ip);
	if (version === 4) {
		return `${ip.split(".").reverse().join(".")}.origin.asn.cymru.com`;
	}
	if (version === 6) {
		const reversedNibbles = expandIpv6(ip).join("").split("").reverse().join(".");
		return `${reversedNibbles}.origin6.asn.cymru.com`;
	}
	throw new Error("无法为无效 IP 构造 Team Cymru 查询");
}

function flattenedTxtRecords(records: string[][]): string[] {
	return records.map((parts) => parts.join("").trim()).filter(Boolean);
}

export function parseCymruOriginRecords(records: string[][]): CymruOrigin {
	for (const record of flattenedTxtRecords(records)) {
		const [asnValue, prefix, country, registry, allocatedAt] = record
			.split("|")
			.map((part) => part.trim());
		const asn = Number(asnValue);
		if (Number.isInteger(asn) && asn > 0 && prefix && country && registry && allocatedAt) {
			return { asn, prefix, country: country.toUpperCase(), registry, allocatedAt };
		}
	}
	throw new Error("Team Cymru 没有返回 ASN 来源记录");
}

export function parseCymruAsNameRecords(records: string[][]): string {
	for (const record of flattenedTxtRecords(records)) {
		const parts = record.split("|").map((part) => part.trim());
		const name = parts.slice(4).join(" | ");
		if (parts.length >= 5 && name) return name;
	}
	throw new Error("Team Cymru 没有返回 AS 名称");
}

function normalizedIpAddress(address: string): string {
	const version = isIP(address);
	if (version === 4) return address.split(".").map(Number).join(".");
	if (version === 6) return expandIpv6(address).join("");
	throw new Error("Team Cymru 返回的 prefix 地址无效");
}

function publicNetworkPrefix(clientIp: string, prefix: string): string | null {
	const separator = prefix.lastIndexOf("/");
	if (separator <= 0 || separator === prefix.length - 1) {
		throw new Error("Team Cymru 返回的 prefix 格式无效");
	}
	const address = prefix.slice(0, separator);
	const prefixLength = Number(prefix.slice(separator + 1));
	const version = isIP(address);
	const maximumPrefixLength = version === 4 ? 32 : version === 6 ? 128 : 0;
	if (
		maximumPrefixLength === 0 ||
		isIP(clientIp) !== version ||
		!Number.isInteger(prefixLength) ||
		prefixLength < 0 ||
		prefixLength > maximumPrefixLength
	) {
		throw new Error("Team Cymru 返回的 prefix 格式无效");
	}
	if (
		prefixLength === maximumPrefixLength ||
		normalizedIpAddress(address) === normalizedIpAddress(clientIp)
	) {
		return null;
	}
	return prefix;
}

export function createPublicTerminalNetworkEvidence(
	trace: TerminalTrace,
	origin: CymruOrigin,
	asName: string,
): TerminalNetworkEvidence {
	return {
		asn: origin.asn,
		asName,
		prefix: publicNetworkPrefix(trace.ip, origin.prefix),
		country: origin.country,
		registry: origin.registry,
		allocatedAt: origin.allocatedAt,
		traceCountry: trace.country,
		colo: trace.colo,
		tls: trace.tls,
	};
}

export function shouldRecordTerminalRequestFailure(
	url: string,
	resourceType: string,
	targetOrigin: string,
): boolean {
	try {
		const requestUrl = new URL(url);
		if (requestUrl.origin !== targetOrigin) return false;
		return !(resourceType === "ping" && requestUrl.pathname === "/cdn-cgi/rum");
	} catch {
		return false;
	}
}

export function shouldRecordTerminalResponseFailure(
	url: string,
	resourceType: string,
	status: number,
	targetOrigin: string,
): boolean {
	return status >= 400 && shouldRecordTerminalRequestFailure(url, resourceType, targetOrigin);
}

export function refreshTerminalMeasurementFailures(measurement: {
	resourceFailures: string[];
	consoleErrors: string[];
	pageErrors: string[];
	reasons: string[];
	passed: boolean;
}): void {
	const dynamicReasons = [
		measurement.resourceFailures.length > 0 ? "同源资源或 API 请求失败" : null,
		measurement.consoleErrors.length > 0 ? "浏览器控制台出现 error" : null,
		measurement.pageErrors.length > 0 ? "页面出现未捕获错误" : null,
	].filter((reason): reason is string => reason !== null);
	for (const reason of dynamicReasons) {
		if (!measurement.reasons.includes(reason)) measurement.reasons.push(reason);
	}
	measurement.passed = measurement.reasons.length === 0;
}

function redactKnownClientIps(message: string, clientIps: string[]): string {
	const normalizedClientIps = new Set(
		clientIps.filter((clientIp) => isIP(clientIp) !== 0).map(normalizedIpAddress),
	);
	if (normalizedClientIps.size === 0) return message;

	return message.replaceAll(/[0-9A-Fa-f:.%]+/gu, (candidate) => {
		const leadingDots = candidate.match(/^\.+/u)?.[0] ?? "";
		const trailingDots = candidate.match(/\.+$/u)?.[0] ?? "";
		const address = candidate
			.slice(leadingDots.length, candidate.length - trailingDots.length || undefined)
			.replaceAll(/%3a/giu, ":")
			.replaceAll(/%2e/giu, ".");
		if (isIP(address) === 0 || !normalizedClientIps.has(normalizedIpAddress(address))) {
			return candidate;
		}
		return `${leadingDots}[redacted-ip]${trailingDots}`;
	});
}

export function redactTerminalDiagnostic(message: string, clientIps: string[]): string {
	return redactKnownClientIps(message, clientIps).replaceAll(
		/\b(?:\d{1,3}\.){3}\d{1,3}\b/gu,
		"[redacted-ip]",
	);
}

export function serializePublicTerminalReport(report: unknown, clientIps: string[]): string {
	return `${redactKnownClientIps(JSON.stringify(report, null, 2), clientIps)}\n`;
}

type TerminalEvidenceInput = {
	expectedNetwork: ExpectedTerminalNetwork;
	startNetwork: TerminalNetworkEvidence;
	endNetwork: TerminalNetworkEvidence | null;
	rounds: number;
	measurements: TerminalMeasurementResult[];
	recovery: TerminalRecoveryResult;
	humanConfirmed: boolean;
	directConnectionConfirmed: boolean;
};

export function evaluateTerminalEvidence(input: TerminalEvidenceInput): {
	passed: boolean;
	reasons: string[];
} {
	const reasons: string[] = [];
	if (input.rounds !== 3) {
		reasons.push(`正式终端验收必须执行 3 轮，实际 ${input.rounds} 轮`);
	}
	if (input.startNetwork.asn !== input.expectedNetwork.asn) {
		reasons.push(
			`指定网络 ${input.expectedNetwork.name} 应为 AS${input.expectedNetwork.asn}，实际 AS${input.startNetwork.asn}`,
		);
	}
	if (input.startNetwork.traceCountry !== "CN") {
		reasons.push(`Cloudflare trace 国家为 ${input.startNetwork.traceCountry}，不是 CN`);
	}
	if (input.startNetwork.country !== "CN") {
		reasons.push(`Team Cymru 国家为 ${input.startNetwork.country}，不是 CN`);
	}
	if (!input.endNetwork) {
		reasons.push("验收结束时无法确认网络身份");
	} else if (
		input.startNetwork.asn !== input.endNetwork.asn ||
		input.startNetwork.traceCountry !== input.endNetwork.traceCountry ||
		input.startNetwork.country !== input.endNetwork.country
	) {
		reasons.push("验收期间网络身份发生变化");
	}

	const expectedMeasurementCount = input.rounds * terminalRoutes.length;
	if (input.measurements.length !== expectedMeasurementCount) {
		reasons.push(`页面测量数量应为 ${expectedMeasurementCount}，实际 ${input.measurements.length}`);
	}
	if (input.measurements.some((measurement) => !measurement.passed)) {
		reasons.push("页面或静态资源检查失败");
	}
	for (let round = 1; round <= input.rounds; round += 1) {
		for (const route of terminalRoutes) {
			if (
				!input.measurements.some(
					(measurement) => measurement.round === round && measurement.route === route.id,
				)
			) {
				reasons.push(`缺少第 ${round} 轮 ${route.id} 页面测量`);
			}
		}
	}
	if (!input.recovery.offlineFailureObserved) reasons.push("没有观察到离线失败");
	if (!input.recovery.recovered) reasons.push("恢复后页面未通过");
	if (!input.humanConfirmed) reasons.push("缺少操作者可见浏览器确认");
	if (!input.directConnectionConfirmed) reasons.push("缺少目标运营商直连声明");
	return { passed: reasons.length === 0, reasons };
}
