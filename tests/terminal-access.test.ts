import assert from "node:assert/strict";
import test from "node:test";
import {
	buildCymruOriginQuery,
	createPublicTerminalNetworkEvidence,
	evaluateTerminalEvidence,
	parseCloudflareTrace,
	parseCymruAsNameRecords,
	parseCymruOriginRecords,
	parseSearchResultCount,
	redactTerminalDiagnostic,
	serializePublicTerminalReport,
	shouldRecordTerminalRequestFailure,
	terminalRoutes,
} from "../scripts/terminal-access.ts";

const expectedNetwork = {
	id: "telecom",
	name: "中国电信",
	asn: 4134,
} as const;

const trace = parseCloudflareTrace(`fl=abc123
h=nanjinghua.com
ip=203.0.113.42
colo=SHA
loc=CN
tls=TLSv1.3
`);

const origin = parseCymruOriginRecords([["4134 | 203.0.113.0/24 | CN | apnic | 2002-08-01"]]);

const network = createPublicTerminalNetworkEvidence(
	trace,
	origin,
	parseCymruAsNameRecords([["4134 | CN | apnic | 2002-08-01 | CHINANET-BACKBONE No.31, CN"]]),
);

test("Cloudflare trace 和 Team Cymru 结果形成不含客户端 IP 的公开网络证据", () => {
	assert.deepEqual(network, {
		asn: 4134,
		asName: "CHINANET-BACKBONE No.31, CN",
		prefix: "203.0.113.0/24",
		country: "CN",
		registry: "apnic",
		allocatedAt: "2002-08-01",
		traceCountry: "CN",
		colo: "SHA",
		tls: "TLSv1.3",
	});
	assert.doesNotMatch(JSON.stringify(network), /203\.0\.113\.42/);
});

test("主机路由前缀与首尾 IPv6 诊断不会泄露客户端地址", () => {
	const hostRoute = createPublicTerminalNetworkEvidence(
		trace,
		{ ...origin, prefix: "203.0.113.42/32" },
		"CHINANET-BACKBONE No.31, CN",
	);
	assert.equal(hostRoute.prefix, null);
	const serialized = serializePublicTerminalReport(
		{ consoleErrors: ["start 2001:db8::1; end 2001:db8::2"] },
		["2001:db8::1", "2001:db8::2"],
	);
	assert.doesNotMatch(serialized, /2001:db8/u);
	assert.match(serialized, /start \[redacted-ip\]; end \[redacted-ip\]/u);
});

test("等价展开与 URL 编码的 IPv6 写法也会从报告中脱敏", () => {
	const serialized = serializePublicTerminalReport(
		{
			consoleErrors: [
				"expanded 2001:0db8:0000:0000:0000:0000:0000:0001",
				"encoded 2001%3A0db8%3A0%3A0%3A0%3A0%3A0%3A1",
			],
		},
		["2001:db8::1"],
	);
	assert.doesNotMatch(serialized, /2001(?::|%3A)/iu);
	assert.equal(serialized.match(/\[redacted-ip\]/gu)?.length, 2);
});

test("Team Cymru 查询名同时支持 IPv4 和 IPv6", () => {
	assert.equal(buildCymruOriginQuery("203.0.113.42"), "42.113.0.203.origin.asn.cymru.com");
	assert.equal(
		buildCymruOriginQuery("2001:db8::1"),
		"1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.origin6.asn.cymru.com",
	);
});

test("终端页面矩阵分别保存请求路径和规范 pathname", () => {
	assert.deepEqual(
		terminalRoutes.map(({ id, path, expectedPath, expectedQuery }) => ({
			id,
			path,
			expectedPath,
			expectedQuery,
		})),
		[
			{ id: "home", path: "/", expectedPath: "/", expectedQuery: null },
			{
				id: "article",
				path: "/articles/what-is-nanjinghua",
				expectedPath: "/articles/what-is-nanjinghua",
				expectedQuery: null,
			},
			{
				id: "search",
				path: "/browse?q=%E7%99%BD%E5%B1%80",
				expectedPath: "/browse",
				expectedQuery: "白局",
			},
			{
				id: "canonical",
				path: "/articles/what-is-nanjinghua/",
				expectedPath: "/articles/what-is-nanjinghua",
				expectedQuery: null,
			},
		],
	);
});

test("搜索结果计数和远端诊断脱敏不依赖浏览器运行", () => {
	assert.equal(parseSearchResultCount("当前条件 · 7 项结果"), 7);
	assert.equal(parseSearchResultCount("没有结果"), null);
	assert.equal(
		redactTerminalDiagnostic("client 203.0.113.42 and 2001:db8::1; encoded 203.0.113.42", [
			"203.0.113.42",
			"2001:db8::1",
		]),
		"client [redacted-ip] and [redacted-ip]; encoded [redacted-ip]",
	);
});

test("终端验收只忽略可选的 Cloudflare Web Analytics ping 失败", () => {
	assert.equal(
		shouldRecordTerminalRequestFailure(
			"https://nanjinghua.com/cdn-cgi/rum?token=public",
			"ping",
			"https://nanjinghua.com",
		),
		false,
	);
	assert.equal(
		shouldRecordTerminalRequestFailure(
			"https://nanjinghua.com/cdn-cgi/rum",
			"script",
			"https://nanjinghua.com",
		),
		true,
	);
	assert.equal(
		shouldRecordTerminalRequestFailure(
			"https://nanjinghua.com/api/archive/NJH000015",
			"fetch",
			"https://nanjinghua.com",
		),
		true,
	);
	assert.equal(
		shouldRecordTerminalRequestFailure(
			"https://example.com/cdn-cgi/rum",
			"ping",
			"https://nanjinghua.com",
		),
		false,
	);
});

test("trace 与 Cymru 缺少决定性字段时拒绝生成证据", () => {
	assert.throws(() => parseCloudflareTrace("loc=CN\ncolo=SHA\n"), /缺少 ip/);
	assert.throws(() => parseCymruOriginRecords([]), /没有返回 ASN/);
	assert.throws(
		() => parseCymruAsNameRecords([["4134 | CN | apnic | 2002-08-01"]]),
		/没有返回 AS 名称/,
	);
});

test("指定运营商、三轮页面、网络恢复和人工确认全部满足时才通过", () => {
	const evaluation = evaluateTerminalEvidence({
		expectedNetwork,
		startNetwork: network,
		endNetwork: network,
		rounds: 3,
		measurements: Array.from({ length: 12 }, (_, index) => ({
			route: ["home", "article", "search", "canonical"][index % 4],
			round: Math.floor(index / 4) + 1,
			passed: true,
		})),
		recovery: { offlineFailureObserved: true, recovered: true },
		humanConfirmed: true,
		directConnectionConfirmed: true,
	});
	assert.deepEqual(evaluation, { passed: true, reasons: [] });
});

test("即使其余证据完整，非三轮运行也不能形成正式通过报告", () => {
	const evaluation = evaluateTerminalEvidence({
		expectedNetwork,
		startNetwork: network,
		endNetwork: network,
		rounds: 1,
		measurements: terminalRoutes.map((route) => ({
			route: route.id,
			round: 1,
			passed: true,
		})),
		recovery: { offlineFailureObserved: true, recovered: true },
		humanConfirmed: true,
		directConnectionConfirmed: true,
	});

	assert.equal(evaluation.passed, false);
	assert.match(evaluation.reasons.join("\n"), /必须执行 3 轮，实际 1 轮/);
});

test("错误 ASN、非大陆位置、网络切换、页面失败或未人工确认都会阻止验收", () => {
	const evaluation = evaluateTerminalEvidence({
		expectedNetwork,
		startNetwork: {
			...network,
			asn: 41378,
			traceCountry: "HK",
			country: "TW",
		},
		endNetwork: { ...network, asn: 4837 },
		rounds: 3,
		measurements: [{ route: "home", round: 1, passed: false }],
		recovery: { offlineFailureObserved: false, recovered: false },
		humanConfirmed: false,
		directConnectionConfirmed: false,
	});
	assert.equal(evaluation.passed, false);
	assert.match(evaluation.reasons.join("\n"), /实际 AS41378/);
	assert.match(evaluation.reasons.join("\n"), /Cloudflare trace 国家为 HK/);
	assert.match(evaluation.reasons.join("\n"), /Cymru 国家为 TW/);
	assert.match(evaluation.reasons.join("\n"), /验收期间网络身份发生变化/);
	assert.match(evaluation.reasons.join("\n"), /页面测量数量应为 12，实际 1/);
	assert.match(evaluation.reasons.join("\n"), /页面或静态资源检查失败/);
	assert.match(evaluation.reasons.join("\n"), /没有观察到离线失败/);
	assert.match(evaluation.reasons.join("\n"), /恢复后页面未通过/);
	assert.match(evaluation.reasons.join("\n"), /缺少操作者可见浏览器确认/);
	assert.match(evaluation.reasons.join("\n"), /缺少目标运营商直连声明/);
});

test("人工确认后无法再次确认网络身份时拒绝验收", () => {
	const evaluation = evaluateTerminalEvidence({
		expectedNetwork,
		startNetwork: network,
		endNetwork: null,
		rounds: 1,
		measurements: terminalRoutes.map((route) => ({
			route: route.id,
			round: 1,
			passed: true,
		})),
		recovery: { offlineFailureObserved: true, recovered: true },
		humanConfirmed: true,
		directConnectionConfirmed: true,
	});
	assert.equal(evaluation.passed, false);
	assert.match(evaluation.reasons.join("\n"), /结束时无法确认网络身份/);
});
