import { setTimeout as sleep } from "node:timers/promises";

export const mainlandNetworks = [
	{
		id: "telecom",
		asn: 4134,
		name: "中国电信",
		city: "Shenzhen",
	},
	{
		id: "unicom",
		asn: 4837,
		name: "中国联通",
		city: "Changsha",
	},
	{
		id: "mobile",
		asn: 9808,
		name: "中国移动",
		city: "Shanghai",
	},
] as const;

export const mainlandRoutes = [
	{
		id: "home",
		label: "首页",
		path: "/",
		expectedContent: "南京话｜南京话的历史",
	},
	{
		id: "article",
		label: "专题",
		path: "/articles/what-is-nanjinghua",
		expectedContent: "南京话是什么？",
	},
	{
		id: "search",
		label: "搜索",
		path: "/browse?q=%E7%99%BD%E5%B1%80",
		expectedContent: "南京白局",
	},
	{
		id: "api",
		label: "非音频线索 API",
		path: "/api/submissions",
		expectedContent: '"available":true',
	},
] as const;

export type MainlandRoute = (typeof mainlandRoutes)[number];

export type GlobalpingMeasurementRequest = {
	type: "http";
	target: string;
	locations: Array<{ magic: string }>;
	limit: number;
	measurementOptions: {
		protocol: "HTTPS";
		port: 443;
		request: {
			method: "GET";
			path: string;
			query?: string;
		};
	};
};

type GlobalpingProbe = {
	country: string;
	city: string | null;
	asn: number;
	network: string;
	tags: string[];
};

type GlobalpingHttpResult = {
	status: string;
	statusCode?: number | null;
	rawBody?: string;
	rawOutput?: string;
	timings?: {
		total?: number | null;
		firstByte?: number | null;
	};
	tls?: {
		authorized?: boolean;
	};
};

export type GlobalpingMeasurement = {
	id: string;
	status: string;
	createdAt: string;
	results: Array<{
		probe: GlobalpingProbe;
		result: GlobalpingHttpResult;
	}>;
};

export type GlobalpingMeasurementClient = {
	measure(request: GlobalpingMeasurementRequest): Promise<GlobalpingMeasurement>;
};

export function validateMainlandTargetHostname(target: string): string {
	const parsed = new URL(`https://${target}`);
	if (
		parsed.hostname !== target ||
		parsed.username ||
		parsed.password ||
		parsed.port ||
		parsed.pathname !== "/" ||
		parsed.search ||
		parsed.hash
	) {
		throw new Error("NANJINGHUA_MAINLAND_TARGET 必须是小写 hostname，不得包含协议、端口或路径");
	}
	return target;
}

export type MainlandProbeSummary = {
	network: string;
	asn: number;
	city: string | null;
	provider: string | null;
	passed: boolean;
	reasons: string[];
	status: string;
	statusCode: number | null;
	totalMs: number | null;
	firstByteMs: number | null;
	tlsAuthorized: boolean;
	contentMatched: boolean;
};

export type MainlandMeasurementSummary = {
	id: string;
	createdAt: string;
	route: MainlandRoute["id"];
	path: string;
	round: number;
	passed: boolean;
	results: MainlandProbeSummary[];
};

export type MainlandAccessReport = {
	generatedAt: string;
	target: string;
	rounds: number;
	passed: boolean;
	measurements: MainlandMeasurementSummary[];
	byRoute: Record<MainlandRoute["id"], { passed: number; total: number }>;
	byNetwork: Record<number, { passed: number; total: number }>;
};

export function createMainlandMeasurementRequest(
	target: string,
	route: MainlandRoute,
): GlobalpingMeasurementRequest {
	const url = new URL(route.path, "https://nanjinghua.invalid");
	const request: GlobalpingMeasurementRequest["measurementOptions"]["request"] = {
		method: "GET",
		path: url.pathname,
	};
	if (url.search) request.query = url.search.slice(1);
	return {
		type: "http",
		target,
		locations: mainlandNetworks.map((network) => ({
			magic: `${network.city}+AS${network.asn}+eyeball`,
		})),
		limit: mainlandNetworks.length,
		measurementOptions: {
			protocol: "HTTPS",
			port: 443,
			request,
		},
	};
}

export function summarizeMainlandMeasurement(
	measurement: GlobalpingMeasurement,
	route: MainlandRoute,
	round: number,
): MainlandMeasurementSummary {
	const results = mainlandNetworks.map((network): MainlandProbeSummary => {
		const resultItem = measurement.results.find((item) => item.probe.asn === network.asn);
		if (!resultItem) {
			return {
				network: network.name,
				asn: network.asn,
				city: null,
				provider: null,
				passed: false,
				reasons: [`缺少 AS${network.asn} ${network.name} 探针结果`],
				status: "missing",
				statusCode: null,
				totalMs: null,
				firstByteMs: null,
				tlsAuthorized: false,
				contentMatched: false,
			};
		}

		const { probe, result } = resultItem;
		const reasons: string[] = [];
		if (probe.country !== "CN") reasons.push(`探针不在中国大陆：${probe.country}`);
		if (probe.city !== network.city) {
			reasons.push(`探针不在固定回归点 ${network.city}：实际 ${probe.city ?? "未知"}`);
		}
		if (!probe.tags.includes("eyeball-network")) reasons.push("探针不是居民网络");
		if (result.status !== "finished") {
			reasons.push(result.rawOutput || `测量状态为 ${result.status}`);
		} else {
			if (result.statusCode !== 200) reasons.push(`HTTP 状态为 ${String(result.statusCode)}`);
			if (result.tls?.authorized !== true) reasons.push("TLS 证书未通过验证");
			if (!result.rawBody?.includes(route.expectedContent)) reasons.push("响应正文签名不匹配");
		}

		return {
			network: network.name,
			asn: network.asn,
			city: probe.city,
			provider: probe.network,
			passed: reasons.length === 0,
			reasons,
			status: result.status,
			statusCode: result.statusCode ?? null,
			totalMs: result.timings?.total ?? null,
			firstByteMs: result.timings?.firstByte ?? null,
			tlsAuthorized: result.tls?.authorized === true,
			contentMatched: result.rawBody?.includes(route.expectedContent) === true,
		};
	});

	return {
		id: measurement.id,
		createdAt: measurement.createdAt,
		route: route.id,
		path: route.path,
		round,
		passed: results.every((result) => result.passed),
		results,
	};
}

export async function runMainlandAccessValidation(
	client: GlobalpingMeasurementClient,
	options: { target: string; rounds: number; delayMs: number },
): Promise<MainlandAccessReport> {
	const measurements: MainlandMeasurementSummary[] = [];
	const totalMeasurements = options.rounds * mainlandRoutes.length;
	for (let round = 1; round <= options.rounds; round += 1) {
		for (const route of mainlandRoutes) {
			const measurement = await client.measure(
				createMainlandMeasurementRequest(options.target, route),
			);
			measurements.push(summarizeMainlandMeasurement(measurement, route, round));
			if (options.delayMs > 0 && measurements.length < totalMeasurements) {
				await sleep(options.delayMs);
			}
		}
	}

	const byRoute = Object.fromEntries(
		mainlandRoutes.map((route) => [route.id, { passed: 0, total: 0 }]),
	) as MainlandAccessReport["byRoute"];
	const byNetwork = Object.fromEntries(
		mainlandNetworks.map((network) => [network.asn, { passed: 0, total: 0 }]),
	) as MainlandAccessReport["byNetwork"];
	for (const measurement of measurements) {
		byRoute[measurement.route].total += 1;
		if (measurement.passed) byRoute[measurement.route].passed += 1;
		for (const result of measurement.results) {
			byNetwork[result.asn].total += 1;
			if (result.passed) byNetwork[result.asn].passed += 1;
		}
	}

	return {
		generatedAt: new Date().toISOString(),
		target: options.target,
		rounds: options.rounds,
		passed: measurements.every((measurement) => measurement.passed),
		measurements,
		byRoute,
		byNetwork,
	};
}
