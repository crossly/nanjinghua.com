import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

type MeasurementRequest = {
	type: string;
	target: string;
	locations: Array<{ magic: string }>;
	limit: number;
	measurementOptions: {
		protocol: string;
		port: number;
		request: { method: string; path: string; query?: string };
	};
};

type ValidatorResult = {
	code: number | null;
	stdout: string;
	stderr: string;
};

type FakeGlobalpingOptions = {
	createStatus?: number;
	createFailurePath?: string;
	failingHomeMobile?: boolean;
	wrongMobileCity?: boolean;
	offlineMobilePath?: string;
	missingMobilePath?: string;
};

const expectedLocations = [
	{ magic: "Shenzhen+AS4134+eyeball" },
	{ magic: "Changsha+AS4837+eyeball" },
	{ magic: "Shanghai+AS9808+eyeball" },
];

const networks = [
	{ asn: 4134, city: "Shenzhen", name: "中国电信" },
	{ asn: 4837, city: "Changsha", name: "中国联通" },
	{ asn: 9808, city: "Shanghai", name: "中国移动" },
];

function expectedBody(request: MeasurementRequest): string {
	switch (request.measurementOptions.request.path) {
		case "/":
			return "南京话｜南京话的历史";
		case "/stories/breakfast":
			return "早点铺的热气，先醒过来";
		case "/policies/about":
			return "关于本站";
		case "/api/submissions":
			return '{"available":true}';
		default:
			throw new Error(`未预期的验收路径：${request.measurementOptions.request.path}`);
	}
}

async function readJson(request: IncomingMessage): Promise<unknown> {
	const chunks: Buffer[] = [];
	for await (const chunk of request) chunks.push(Buffer.from(chunk));
	return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function respond(response: ServerResponse, status: number, body: unknown): void {
	response.writeHead(status, { "content-type": "application/json" });
	response.end(JSON.stringify(body));
}

async function runValidator(environment: Record<string, string>): Promise<ValidatorResult> {
	const childEnvironment: NodeJS.ProcessEnv = {
		...process.env,
		...environment,
		GLOBALPING_TOKEN: "integration-test-token",
		NO_COLOR: "1",
	};
	delete childEnvironment.FORCE_COLOR;

	return await new Promise((resolve, reject) => {
		const child = spawn("pnpm", ["--silent", "run", "ops:validate:mainland"], {
			cwd: process.cwd(),
			env: childEnvironment,
			stdio: ["ignore", "pipe", "pipe"],
		});
		let stdout = "";
		let stderr = "";
		let timedOut = false;
		child.stdout.setEncoding("utf8").on("data", (chunk) => {
			stdout += chunk;
		});
		child.stderr.setEncoding("utf8").on("data", (chunk) => {
			stderr += chunk;
		});
		child.once("error", reject);
		const timeout = setTimeout(() => {
			timedOut = true;
			child.kill("SIGKILL");
		}, 15_000);
		child.once("close", (code) => {
			clearTimeout(timeout);
			if (timedOut) {
				reject(new Error(`大陆验收 CLI 超时；stdout=${stdout}; stderr=${stderr}`));
				return;
			}
			resolve({ code, stdout, stderr });
		});
	});
}

async function withFakeGlobalping(
	options: FakeGlobalpingOptions,
	run: (context: {
		baseUrl: string;
		requests: MeasurementRequest[];
		authorizationHeaders: Array<string | undefined>;
	}) => Promise<void>,
): Promise<void> {
	const requests: MeasurementRequest[] = [];
	const authorizationHeaders: Array<string | undefined> = [];
	const measurements = new Map<string, MeasurementRequest>();
	const serverErrors: Error[] = [];
	const server = createServer((request, response) => {
		void (async () => {
			const url = new URL(request.url ?? "/", "http://globalping.test");
			if (request.method === "POST" && url.pathname === "/v1/measurements") {
				authorizationHeaders.push(request.headers.authorization);
				const body = (await readJson(request)) as MeasurementRequest;
				requests.push(body);
				if (
					options.createStatus &&
					(options.createFailurePath === undefined ||
						body.measurementOptions.request.path === options.createFailurePath)
				) {
					respond(response, options.createStatus, { error: { message: "Too many requests" } });
					return;
				}
				const id = `measurement-${requests.length}`;
				measurements.set(id, body);
				respond(response, 202, { id, probesCount: 3 });
				return;
			}

			const match = url.pathname.match(/^\/v1\/measurements\/(measurement-\d+)$/);
			if (request.method === "GET" && match) {
				const measurementRequest = measurements.get(match[1]);
				if (!measurementRequest) {
					respond(response, 404, { error: { message: "Measurement not found" } });
					return;
				}
				let results = networks.map((network, index) => ({
					probe: {
						country: "CN",
						city: options.wrongMobileCity && network.asn === 9808 ? "Kunming" : network.city,
						asn: network.asn,
						network: network.name,
						tags: ["eyeball-network"],
					},
					result: {
						status: "finished",
						statusCode: 200,
						rawBody: expectedBody(measurementRequest),
						timings: { total: 500 + index * 100, firstByte: 200 + index * 50 },
						tls: { authorized: true },
					},
				}));
				if (
					options.failingHomeMobile &&
					measurementRequest.measurementOptions.request.path === "/"
				) {
					results[2].result = {
						status: "failed",
						statusCode: 0,
						rawBody: "",
						timings: { total: 0, firstByte: 0 },
						tls: { authorized: false },
					};
					Object.assign(results[2].result, {
						rawOutput: "Request timeout via probe 203.0.113.48.",
					});
				}
				if (options.offlineMobilePath === measurementRequest.measurementOptions.request.path) {
					results[2].result = {
						status: "offline",
						statusCode: 0,
						rawBody: "",
						timings: { total: 0, firstByte: 0 },
						tls: { authorized: false },
					};
					Object.assign(results[2].result, { rawOutput: "Probe 203.0.113.49 is offline." });
				}
				if (options.missingMobilePath === measurementRequest.measurementOptions.request.path) {
					results = results.slice(0, 2);
				}
				respond(response, 200, {
					id: match[1],
					status: "finished",
					createdAt: "2026-07-19T00:00:00.000Z",
					results,
				});
				return;
			}

			respond(response, 404, { error: { message: "Unexpected request" } });
		})().catch((error) => {
			serverErrors.push(error instanceof Error ? error : new Error(String(error)));
			if (!response.headersSent)
				respond(response, 500, { error: { message: "Fake server error" } });
			else response.end();
		});
	});

	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", resolve);
	});
	const address = server.address() as AddressInfo;
	try {
		await run({
			baseUrl: `http://127.0.0.1:${address.port}/v1`,
			requests,
			authorizationHeaders,
		});
		assert.deepEqual(serverErrors, []);
	} finally {
		await new Promise<void>((resolve, reject) => {
			server.close((error) => (error ? reject(error) : resolve()));
		});
	}
}

test("公开命令从三网检查四条路径并输出可审计成功报告", async () => {
	await withFakeGlobalping({}, async ({ baseUrl, requests, authorizationHeaders }) => {
		const result = await runValidator({
			GLOBALPING_API_BASE_URL: baseUrl,
			NANJINGHUA_MAINLAND_TARGET: "mirror.nanjinghua.com",
			NANJINGHUA_MAINLAND_ROUNDS: "1",
			NANJINGHUA_MAINLAND_DELAY_MS: "0",
		});

		assert.equal(result.code, 0, result.stderr);
		assert.equal(result.stderr, "");
		assert.doesNotMatch(result.stdout, /integration-test-token/);
		const report = JSON.parse(result.stdout) as {
			passed: boolean;
			outcome: string;
			target: string;
			measurements: Array<{ id: string; passed: boolean }>;
			byRoute: Record<string, { passed: number; total: number }>;
			byNetwork: Record<string, { passed: number; total: number }>;
		};
		assert.equal(report.passed, true);
		assert.equal(report.outcome, "passed");
		assert.equal(report.target, "mirror.nanjinghua.com");
		assert.deepEqual(report.byRoute.home, { passed: 1, total: 1 });
		assert.deepEqual(report.byNetwork["9808"], { passed: 4, total: 4 });
		assert.deepEqual(
			report.measurements.map((measurement) => measurement.id),
			["measurement-1", "measurement-2", "measurement-3", "measurement-4"],
		);
		assert.deepEqual(
			requests.map((request) => request.measurementOptions.request),
			[
				{ method: "GET", path: "/" },
				{ method: "GET", path: "/stories/breakfast" },
				{ method: "GET", path: "/policies/about" },
				{ method: "GET", path: "/api/submissions" },
			],
		);
		for (const request of requests) {
			assert.equal(request.target, "mirror.nanjinghua.com");
			assert.deepEqual(request.locations, expectedLocations);
			assert.equal(request.limit, 3);
			assert.equal(request.measurementOptions.protocol, "HTTPS");
		}
		assert.deepEqual(authorizationHeaders, Array(4).fill("Bearer integration-test-token"));
	});
});

test("公开命令把居民线路超时报告为站点失败状态码 1", async () => {
	await withFakeGlobalping({ failingHomeMobile: true }, async ({ baseUrl }) => {
		const result = await runValidator({
			GLOBALPING_API_BASE_URL: baseUrl,
			NANJINGHUA_MAINLAND_ROUNDS: "1",
			NANJINGHUA_MAINLAND_DELAY_MS: "0",
		});
		assert.equal(result.code, 1);
		assert.match(result.stderr, /三网访问验收未通过/);
		const report = JSON.parse(result.stdout) as {
			passed: boolean;
			outcome: string;
			byNetwork: Record<string, { passed: number; total: number }>;
			measurements: Array<{
				results: Array<{ asn: number; passed: boolean; reasons: string[] }>;
			}>;
		};
		assert.equal(report.passed, false);
		assert.equal(report.outcome, "site-failure");
		assert.doesNotMatch(result.stdout, /203\.0\.113\.48/);
		assert.deepEqual(report.byNetwork["9808"], { passed: 3, total: 4 });
		const mobile = report.measurements[0].results.find((probe) => probe.asn === 9808);
		assert.ok(mobile);
		assert.equal(mobile.passed, false);
		assert.match(mobile.reasons.join(" "), /HTTPS 请求超时/);
	});
});

test("公开命令拒绝用其他城市的同运营商探针替代固定回归点", async () => {
	await withFakeGlobalping({ wrongMobileCity: true }, async ({ baseUrl }) => {
		const result = await runValidator({
			GLOBALPING_API_BASE_URL: baseUrl,
			NANJINGHUA_MAINLAND_ROUNDS: "1",
			NANJINGHUA_MAINLAND_DELAY_MS: "0",
		});
		assert.equal(result.code, 2);
		assert.match(result.stderr, /测量基础设施错误/);
		const report = JSON.parse(result.stdout) as {
			outcome: string;
			measurements: Array<{
				results: Array<{
					asn: number;
					passed: boolean;
					infrastructureError: boolean;
					reasons: string[];
				}>;
			}>;
		};
		assert.equal(report.outcome, "infrastructure-error");
		for (const measurement of report.measurements) {
			const mobile = measurement.results.find((probe) => probe.asn === 9808);
			assert.ok(mobile);
			assert.equal(mobile.passed, false);
			assert.equal(mobile.infrastructureError, true);
			assert.match(mobile.reasons.join(" "), /固定回归点 Shanghai.*实际 Kunming/);
		}
	});
});

for (const failure of ["offline", "missing"] as const) {
	test(`公开命令把${failure}居民探针归为测量基础设施错误`, async () => {
		await withFakeGlobalping(
			failure === "offline"
				? { offlineMobilePath: "/policies/about" }
				: { missingMobilePath: "/policies/about" },
			async ({ baseUrl }) => {
				const result = await runValidator({
					GLOBALPING_API_BASE_URL: baseUrl,
					NANJINGHUA_MAINLAND_ROUNDS: "1",
					NANJINGHUA_MAINLAND_DELAY_MS: "0",
				});
				assert.equal(result.code, 2);
				assert.match(result.stderr, /测量基础设施错误/);
				assert.doesNotMatch(result.stdout, /203\.0\.113\.49/);
				const report = JSON.parse(result.stdout) as {
					passed: boolean;
					outcome: string;
					measurements: Array<{ route: string; outcome: string }>;
				};
				assert.equal(report.passed, false);
				assert.equal(report.outcome, "infrastructure-error");
				assert.equal(
					report.measurements.find((measurement) => measurement.route === "about")?.outcome,
					"infrastructure-error",
				);
			},
		);
	});
}

test("公开命令不会让另一测量的探针故障覆盖已确认的站点失败", async () => {
	await withFakeGlobalping(
		{ failingHomeMobile: true, offlineMobilePath: "/policies/about" },
		async ({ baseUrl }) => {
			const result = await runValidator({
				GLOBALPING_API_BASE_URL: baseUrl,
				NANJINGHUA_MAINLAND_ROUNDS: "1",
				NANJINGHUA_MAINLAND_DELAY_MS: "0",
			});
			assert.equal(result.code, 1);
			const report = JSON.parse(result.stdout) as { outcome: string };
			assert.equal(report.outcome, "site-failure");
		},
	);
});

test("公开命令不会让后续 Globalping API 故障覆盖已确认的站点失败", async () => {
	await withFakeGlobalping(
		{ failingHomeMobile: true, createStatus: 429, createFailurePath: "/policies/about" },
		async ({ baseUrl }) => {
			const result = await runValidator({
				GLOBALPING_API_BASE_URL: baseUrl,
				NANJINGHUA_MAINLAND_ROUNDS: "1",
				NANJINGHUA_MAINLAND_DELAY_MS: "0",
			});
			assert.equal(result.code, 1);
			assert.doesNotMatch(result.stdout, /Too many requests/);
			const report = JSON.parse(result.stdout) as {
				outcome: string;
				measurements: Array<{ route: string; outcome: string; id: string | null }>;
			};
			assert.equal(report.outcome, "site-failure");
			const about = report.measurements.find((measurement) => measurement.route === "about");
			assert.ok(about);
			assert.equal(about.outcome, "infrastructure-error");
			assert.equal(about.id, null);
		},
	);
});

test("公开命令把 Globalping API 故障报告为状态码 2", async () => {
	await withFakeGlobalping({ createStatus: 429 }, async ({ baseUrl }) => {
		const result = await runValidator({
			GLOBALPING_API_BASE_URL: baseUrl,
			NANJINGHUA_MAINLAND_ROUNDS: "1",
			NANJINGHUA_MAINLAND_DELAY_MS: "0",
		});
		assert.equal(result.code, 2);
		assert.match(result.stderr, /测量基础设施错误/);
		assert.doesNotMatch(result.stdout, /Too many requests|integration-test-token/);
		const report = JSON.parse(result.stdout) as {
			outcome: string;
			measurements: Array<{ id: string | null; outcome: string }>;
		};
		assert.equal(report.outcome, "infrastructure-error");
		assert.equal(report.measurements.length, 4);
		assert.ok(
			report.measurements.every(
				(measurement) => measurement.id === null && measurement.outcome === "infrastructure-error",
			),
		);
	});
});

test("公开命令在参数错误时不发起网络测量并报告状态码 2", async () => {
	const result = await runValidator({
		GLOBALPING_API_BASE_URL: "http://127.0.0.1:1/v1",
		NANJINGHUA_MAINLAND_TARGET: "https://nanjinghua.com",
		NANJINGHUA_MAINLAND_ROUNDS: "1",
		NANJINGHUA_MAINLAND_DELAY_MS: "0",
	});
	assert.equal(result.code, 2);
	assert.equal(result.stdout, "");
	assert.match(result.stderr, /必须是小写 hostname/);
});
