import { isIP } from "node:net";
import type { GlobalpingRawMeasurement } from "./globalping-client.ts";
import { mainlandNetworks } from "./mainland-access.ts";
import {
	classifyDiagnosticOutcome,
	type DiagnosticOutcome,
	isGlobalpingInfrastructureStatus,
	safeGlobalpingFailureReason,
	safeGlobalpingStatus,
} from "./network-diagnostics.ts";

type MainlandNetwork = (typeof mainlandNetworks)[number];
export type MainlandNetworkId = MainlandNetwork["id"];

type DiagnosticLocation = { magic: string };

export type MainlandRouteDiagnosticRequest =
	| {
			type: "dns";
			target: string;
			locations: DiagnosticLocation[];
			limit: 1;
			measurementOptions: {
				query: { type: "A" };
				protocol: "UDP";
				ipVersion: 4;
			};
	  }
	| {
			type: "http";
			target: string;
			locations: string;
			measurementOptions: {
				protocol: "HTTPS";
				port: 443;
				request: { method: "GET"; host: string; path: "/" };
			};
	  }
	| {
			type: "mtr";
			target: string;
			locations: string;
			measurementOptions: {
				packets: 3;
				protocol: "TCP";
				port: 443;
			};
	  };

export type MainlandRouteDiagnosticClient = {
	measureRaw(request: MainlandRouteDiagnosticRequest): Promise<GlobalpingRawMeasurement>;
};

type DnsDiagnostic = {
	measurementId: string | null;
	createdAt: string;
	passed: boolean;
	infrastructureError: boolean;
	reasons: string[];
	status: string;
	statusCode: number | null;
	statusCodeName: string | null;
	resolver: string | null;
	totalMs: number | null;
	addresses: string[];
};

type HttpsDiagnostic = {
	measurementId: string | null;
	createdAt: string;
	passed: boolean;
	infrastructureError: boolean;
	reasons: string[];
	status: string;
	statusCode: number | null;
	resolvedAddress: string | null;
	totalMs: number | null;
	tcpMs: number | null;
	tlsMs: number | null;
	firstByteMs: number | null;
	tlsAuthorized: boolean;
};

type MtrDiagnostic = {
	measurementId: string | null;
	createdAt: string;
	status: string;
	reasons: string[];
	infrastructureError: boolean;
	targetReached: boolean;
	hopCount: number;
	respondingAsns: number[];
	lastRespondingAsn: number | null;
};

export type MainlandRouteDiagnosticReport = {
	generatedAt: string;
	target: string;
	network: {
		id: MainlandNetworkId;
		name: string;
		asn: number;
		city: string;
	};
	passed: boolean;
	outcome: DiagnosticOutcome;
	dns: DnsDiagnostic;
	addresses: Array<{
		address: string;
		https: HttpsDiagnostic;
		mtr: MtrDiagnostic | null;
	}>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
	return typeof value === "string" ? value : null;
}

function numberValue(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringArray(value: unknown): string[] {
	return Array.isArray(value)
		? value.filter((item): item is string => typeof item === "string")
		: [];
}

function numberArray(value: unknown): number[] {
	return Array.isArray(value)
		? value.filter((item): item is number => Number.isInteger(item) && item > 0)
		: [];
}

function diagnosticLocation(network: MainlandNetwork): DiagnosticLocation[] {
	return [{ magic: `${network.city}+AS${network.asn}+eyeball` }];
}

function reusableMeasurementLocation(measurementId: string): string {
	if (!/^[A-Za-z0-9_-]{1,128}$/.test(measurementId)) {
		throw new Error("Globalping 首次测量 ID 无法用于固定探针");
	}
	return measurementId;
}

function safeDnsStatusCodeName(value: unknown): string | null {
	const name = stringValue(value);
	return name && /^[A-Z0-9_-]{1,32}$/.test(name) ? name : null;
}

function safeResolver(value: unknown): string | null {
	const resolver = stringValue(value);
	if (resolver === null) return null;
	return resolver === "private" ? "private" : "redacted";
}

export function selectMainlandNetwork(id: string): MainlandNetwork {
	const network = mainlandNetworks.find((candidate) => candidate.id === id);
	if (!network) throw new Error("运营商必须是 telecom、unicom 或 mobile");
	return network;
}

export function createDnsDiagnosticRequest(
	target: string,
	network: MainlandNetwork,
): MainlandRouteDiagnosticRequest {
	return {
		type: "dns",
		target,
		locations: diagnosticLocation(network),
		limit: 1,
		measurementOptions: {
			query: { type: "A" },
			protocol: "UDP",
			ipVersion: 4,
		},
	};
}

export function createHttpsDiagnosticRequest(
	target: string,
	address: string,
	probeMeasurementId: string,
): MainlandRouteDiagnosticRequest {
	if (isIP(address) !== 4) throw new Error(`诊断地址不是 IPv4：${address}`);
	return {
		type: "http",
		target: address,
		locations: reusableMeasurementLocation(probeMeasurementId),
		measurementOptions: {
			protocol: "HTTPS",
			port: 443,
			request: { method: "GET", host: target, path: "/" },
		},
	};
}

export function createMtrDiagnosticRequest(
	address: string,
	probeMeasurementId: string,
): MainlandRouteDiagnosticRequest {
	if (isIP(address) !== 4) throw new Error(`诊断地址不是 IPv4：${address}`);
	return {
		type: "mtr",
		target: address,
		locations: reusableMeasurementLocation(probeMeasurementId),
		measurementOptions: {
			packets: 3,
			protocol: "TCP",
			port: 443,
		},
	};
}

function resultItem(measurement: GlobalpingRawMeasurement): {
	probe: Record<string, unknown>;
	result: Record<string, unknown>;
} {
	const item = measurement.results[0];
	if (!isRecord(item) || !isRecord(item.probe) || !isRecord(item.result)) {
		throw new Error(`Globalping 测量 ${measurement.id} 缺少探针结果`);
	}
	return { probe: item.probe, result: item.result };
}

function probeReasons(probe: Record<string, unknown>, network: MainlandNetwork): string[] {
	const reasons: string[] = [];
	if (probe.country !== "CN") reasons.push("探针国家不是 CN");
	if (probe.city !== network.city) {
		reasons.push(`探针不在固定回归点 ${network.city}`);
	}
	if (probe.asn !== network.asn) reasons.push(`探针 ASN 不是 AS${network.asn}`);
	if (!stringArray(probe.tags).includes("eyeball-network")) reasons.push("探针不是居民网络");
	return reasons;
}

function summarizeDns(
	measurement: GlobalpingRawMeasurement,
	network: MainlandNetwork,
): DnsDiagnostic {
	const { probe, result } = resultItem(measurement);
	const reasons = probeReasons(probe, network);
	const status = safeGlobalpingStatus(result.status);
	const infrastructureError = reasons.length > 0 || isGlobalpingInfrastructureStatus(status);
	const statusCode = numberValue(result.statusCode);
	if (status !== "finished") {
		reasons.push(safeGlobalpingFailureReason("DNS", status, result.rawOutput));
	}
	if (status === "finished" && statusCode !== 0) {
		reasons.push(`DNS 状态码为 ${String(statusCode)}`);
	}
	const addresses = Array.isArray(result.answers)
		? [
				...new Set(
					result.answers.flatMap((answer) => {
						if (!isRecord(answer) || answer.type !== "A") return [];
						const value = stringValue(answer.value);
						return value && isIP(value) === 4 ? [value] : [];
					}),
				),
			]
		: [];
	if (addresses.length === 0) reasons.push("DNS 没有返回 IPv4 A 地址");
	const timings = isRecord(result.timings) ? result.timings : {};
	return {
		measurementId: measurement.id,
		createdAt: measurement.createdAt,
		passed: reasons.length === 0,
		infrastructureError,
		reasons,
		status,
		statusCode,
		statusCodeName: safeDnsStatusCodeName(result.statusCodeName),
		resolver: safeResolver(result.resolver),
		totalMs: numberValue(timings.total),
		addresses,
	};
}

function summarizeHttps(
	measurement: GlobalpingRawMeasurement,
	network: MainlandNetwork,
	address: string,
): HttpsDiagnostic {
	const { probe, result } = resultItem(measurement);
	const reasons = probeReasons(probe, network);
	const status = safeGlobalpingStatus(result.status);
	const infrastructureError = reasons.length > 0 || isGlobalpingInfrastructureStatus(status);
	const statusCode = numberValue(result.statusCode);
	const resolvedAddress = stringValue(result.resolvedAddress);
	if (status !== "finished") {
		reasons.push(safeGlobalpingFailureReason("HTTPS", status, result.rawOutput));
	} else {
		if (statusCode !== 200) reasons.push(`HTTPS 状态为 ${String(statusCode)}`);
		if (resolvedAddress !== address) {
			reasons.push("实际连接地址与待测地址不一致");
		}
		if (!isRecord(result.tls) || result.tls.authorized !== true) {
			reasons.push("TLS 证书未通过验证");
		}
	}
	const timings = isRecord(result.timings) ? result.timings : {};
	return {
		measurementId: measurement.id,
		createdAt: measurement.createdAt,
		passed: reasons.length === 0,
		infrastructureError,
		reasons,
		status,
		statusCode,
		resolvedAddress: resolvedAddress === address ? address : null,
		totalMs: numberValue(timings.total),
		tcpMs: numberValue(timings.tcp),
		tlsMs: numberValue(timings.tls),
		firstByteMs: numberValue(timings.firstByte),
		tlsAuthorized: isRecord(result.tls) && result.tls.authorized === true,
	};
}

function summarizeMtr(
	measurement: GlobalpingRawMeasurement,
	network: MainlandNetwork,
	address: string,
): MtrDiagnostic {
	const { probe, result } = resultItem(measurement);
	const reasons = probeReasons(probe, network);
	const status = safeGlobalpingStatus(result.status);
	const infrastructureError = reasons.length > 0 || isGlobalpingInfrastructureStatus(status);
	if (status !== "finished") {
		reasons.push(safeGlobalpingFailureReason("MTR", status, result.rawOutput));
	}
	const hops = Array.isArray(result.hops) ? result.hops.filter(isRecord) : [];
	const respondingHops = hops.filter((hop) => {
		const stats = isRecord(hop.stats) ? hop.stats : {};
		return (numberValue(stats.rcv) ?? 0) > 0;
	});
	const respondingAsns = [...new Set(respondingHops.flatMap((hop) => numberArray(hop.asn)))];
	let lastRespondingAsn: number | null = null;
	for (let index = respondingHops.length - 1; index >= 0; index -= 1) {
		const asns = numberArray(respondingHops[index].asn);
		if (asns.length > 0) {
			lastRespondingAsn = asns.at(-1) ?? null;
			break;
		}
	}
	return {
		measurementId: measurement.id,
		createdAt: measurement.createdAt,
		status,
		reasons,
		infrastructureError,
		targetReached: respondingHops.some((hop) => hop.resolvedAddress === address),
		hopCount: hops.length,
		respondingAsns,
		lastRespondingAsn,
	};
}

function unavailableDns(): DnsDiagnostic {
	return {
		measurementId: null,
		createdAt: new Date().toISOString(),
		passed: false,
		infrastructureError: true,
		reasons: ["Globalping DNS 测量不可用"],
		status: "missing",
		statusCode: null,
		statusCodeName: null,
		resolver: null,
		totalMs: null,
		addresses: [],
	};
}

function unavailableHttps(): HttpsDiagnostic {
	return {
		measurementId: null,
		createdAt: new Date().toISOString(),
		passed: false,
		infrastructureError: true,
		reasons: ["Globalping HTTPS 测量不可用"],
		status: "missing",
		statusCode: null,
		resolvedAddress: null,
		totalMs: null,
		tcpMs: null,
		tlsMs: null,
		firstByteMs: null,
		tlsAuthorized: false,
	};
}

function unavailableMtr(): MtrDiagnostic {
	return {
		measurementId: null,
		createdAt: new Date().toISOString(),
		status: "missing",
		reasons: ["Globalping MTR 测量不可用"],
		infrastructureError: true,
		targetReached: false,
		hopCount: 0,
		respondingAsns: [],
		lastRespondingAsn: null,
	};
}

export async function runMainlandRouteDiagnostics(
	client: MainlandRouteDiagnosticClient,
	options: { target: string; network: MainlandNetwork },
): Promise<MainlandRouteDiagnosticReport> {
	let dnsMeasurement: GlobalpingRawMeasurement | null = null;
	let dns: DnsDiagnostic;
	try {
		dnsMeasurement = await client.measureRaw(
			createDnsDiagnosticRequest(options.target, options.network),
		);
		dns = summarizeDns(dnsMeasurement, options.network);
	} catch {
		dns = unavailableDns();
	}
	const addresses: MainlandRouteDiagnosticReport["addresses"] = [];
	if (dns.passed && dnsMeasurement) {
		for (const address of dns.addresses) {
			let https: HttpsDiagnostic;
			try {
				const httpsMeasurement = await client.measureRaw(
					createHttpsDiagnosticRequest(options.target, address, dnsMeasurement.id),
				);
				https = summarizeHttps(httpsMeasurement, options.network, address);
			} catch {
				https = unavailableHttps();
			}
			let mtr: MtrDiagnostic | null = null;
			if (!https.passed && !https.infrastructureError) {
				try {
					const mtrMeasurement = await client.measureRaw(
						createMtrDiagnosticRequest(address, dnsMeasurement.id),
					);
					mtr = summarizeMtr(mtrMeasurement, options.network, address);
				} catch {
					mtr = unavailableMtr();
				}
			}
			addresses.push({ address, https, mtr });
		}
	}
	const outcome = classifyDiagnosticOutcome([dns, ...addresses.map((item) => item.https)]);
	const passed =
		outcome === "passed" &&
		dns.passed &&
		addresses.length === dns.addresses.length &&
		addresses.every((item) => item.https.passed);
	return {
		generatedAt: new Date().toISOString(),
		target: options.target,
		network: {
			id: options.network.id,
			name: options.network.name,
			asn: options.network.asn,
			city: options.network.city,
		},
		passed,
		outcome,
		dns,
		addresses,
	};
}
