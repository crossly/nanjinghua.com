import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

type DiagnosticRequest = {
	type: "dns" | "http" | "mtr";
	target: string;
	locations: Array<{ magic: string }>;
	limit: number;
	measurementOptions: Record<string, unknown>;
};

type DiagnosticResult = {
	code: number | null;
	stdout: string;
	stderr: string;
};

type FakeGlobalpingOptions = {
	addresses: string[];
	failingAddress?: string;
};

async function readJson(request: IncomingMessage): Promise<unknown> {
	const chunks: Buffer[] = [];
	for await (const chunk of request) chunks.push(Buffer.from(chunk));
	return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function respond(response: ServerResponse, status: number, body: unknown): void {
	response.writeHead(status, { "content-type": "application/json" });
	response.end(JSON.stringify(body));
}

async function runDiagnostic(
	network: string,
	environment: Record<string, string>,
): Promise<DiagnosticResult> {
	const childEnvironment: NodeJS.ProcessEnv = {
		...process.env,
		...environment,
		GLOBALPING_TOKEN: "diagnostic-test-token",
		NO_COLOR: "1",
	};
	delete childEnvironment.FORCE_COLOR;

	return await new Promise((resolve, reject) => {
		const child = spawn("pnpm", ["--silent", "run", "ops:diagnose:mainland-route", "--", network], {
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
				reject(new Error(`大陆路由诊断 CLI 超时；stdout=${stdout}; stderr=${stderr}`));
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
		requests: DiagnosticRequest[];
		authorizationHeaders: Array<string | undefined>;
	}) => Promise<void>,
): Promise<void> {
	const requests: DiagnosticRequest[] = [];
	const authorizationHeaders: Array<string | undefined> = [];
	const measurements = new Map<string, DiagnosticRequest>();
	const serverErrors: Error[] = [];
	const server = createServer((request, response) => {
		void (async () => {
			const url = new URL(request.url ?? "/", "http://globalping.test");
			if (request.method === "POST" && url.pathname === "/v1/measurements") {
				authorizationHeaders.push(request.headers.authorization);
				const body = (await readJson(request)) as DiagnosticRequest;
				requests.push(body);
				const id = `diagnostic-${requests.length}`;
				measurements.set(id, body);
				respond(response, 202, { id, probesCount: 1 });
				return;
			}

			const match = url.pathname.match(/^\/v1\/measurements\/(diagnostic-\d+)$/);
			if (request.method === "GET" && match) {
				const measurementRequest = measurements.get(match[1]);
				if (!measurementRequest) {
					respond(response, 404, { error: { message: "Measurement not found" } });
					return;
				}
				const probe = {
					country: "CN",
					city: "Shanghai",
					asn: 9808,
					network: "China Mobile Communications Group",
					tags: ["eyeball-network"],
					resolvers: ["private", "private"],
				};
				let result: Record<string, unknown>;
				if (measurementRequest.type === "dns") {
					result = {
						status: "finished",
						statusCode: 0,
						statusCodeName: "NOERROR",
						answers: options.addresses.map((address) => ({
							name: "nanjinghua.com.",
							type: "A",
							class: "IN",
							ttl: 60,
							value: address,
						})),
						timings: { total: 291 },
						resolver: "private",
					};
				} else if (measurementRequest.type === "http") {
					const failed = measurementRequest.target === options.failingAddress;
					result = failed
						? {
								status: "failed",
								resolvedAddress: null,
								rawOutput: "Request timeout.",
								timings: {
									total: null,
									dns: null,
									tcp: null,
									tls: null,
									firstByte: null,
								},
							}
						: {
								status: "finished",
								resolvedAddress: measurementRequest.target,
								statusCode: 200,
								timings: { total: 962, tcp: 202, tls: 482, firstByte: 277 },
								tls: { authorized: true },
							};
				} else {
					result = {
						status: "finished",
						resolvedAddress: measurementRequest.target,
						hops: [
							{
								resolvedAddress: "221.183.92.190",
								asn: [9808],
								stats: { rcv: 3, loss: 0 },
							},
							{
								resolvedAddress: null,
								asn: [],
								stats: { rcv: 0, loss: 100 },
							},
						],
					};
				}
				respond(response, 200, {
					id: match[1],
					status: "finished",
					createdAt: "2026-07-22T03:40:52.600Z",
					results: [{ probe, result }],
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

test("大陆路由诊断确认固定探针的全部 A 地址均可通过 HTTPS", async () => {
	await withFakeGlobalping({ addresses: ["104.21.10.37"] }, async (context) => {
		const result = await runDiagnostic("mobile", {
			GLOBALPING_API_BASE_URL: context.baseUrl,
			NANJINGHUA_MAINLAND_TARGET: "nanjinghua.com",
		});
		assert.equal(result.code, 0, result.stderr);
		assert.equal(result.stderr, "");
		assert.doesNotMatch(result.stdout, /diagnostic-test-token/);
		const report = JSON.parse(result.stdout) as {
			passed: boolean;
			dns: { addresses: string[]; passed: boolean };
			addresses: Array<{ https: { passed: boolean }; mtr: unknown }>;
		};
		assert.equal(report.passed, true);
		assert.deepEqual(report.dns.addresses, ["104.21.10.37"]);
		assert.equal(report.addresses[0].https.passed, true);
		assert.equal(report.addresses[0].mtr, null);
		assert.deepEqual(
			context.requests.map((request) => request.type),
			["dns", "http"],
		);
		assert.deepEqual(context.authorizationHeaders, [
			"Bearer diagnostic-test-token",
			"Bearer diagnostic-test-token",
		]);
	});
});

test("大陆路由诊断对不可达 A 地址追加 TCP MTR 并拒绝通过", async () => {
	await withFakeGlobalping(
		{
			addresses: ["104.21.10.37", "172.67.189.230"],
			failingAddress: "172.67.189.230",
		},
		async (context) => {
			const result = await runDiagnostic("mobile", {
				GLOBALPING_API_BASE_URL: context.baseUrl,
				NANJINGHUA_MAINLAND_TARGET: "nanjinghua.com",
			});
			assert.equal(result.code, 1);
			assert.match(result.stderr, /至少一个解析地址不可达/);
			const report = JSON.parse(result.stdout) as {
				passed: boolean;
				network: { id: string; asn: number; city: string };
				addresses: Array<{
					address: string;
					https: { passed: boolean; reasons: string[] };
					mtr: null | {
						targetReached: boolean;
						respondingAsns: number[];
						lastRespondingAsn: number | null;
					};
				}>;
			};
			assert.equal(report.passed, false);
			assert.deepEqual(report.network, {
				id: "mobile",
				name: "中国移动",
				asn: 9808,
				city: "Shanghai",
			});
			const healthy = report.addresses.find((item) => item.address === "104.21.10.37");
			const failed = report.addresses.find((item) => item.address === "172.67.189.230");
			assert.equal(healthy?.https.passed, true);
			assert.equal(healthy?.mtr, null);
			assert.equal(failed?.https.passed, false);
			assert.match(failed?.https.reasons.join(" ") ?? "", /Request timeout/);
			assert.equal(failed?.mtr?.targetReached, false);
			assert.deepEqual(failed?.mtr?.respondingAsns, [9808]);
			assert.equal(failed?.mtr?.lastRespondingAsn, 9808);
			assert.deepEqual(
				context.requests.map((request) => [request.type, request.target]),
				[
					["dns", "nanjinghua.com"],
					["http", "104.21.10.37"],
					["http", "172.67.189.230"],
					["mtr", "172.67.189.230"],
				],
			);
			const failedHttp = context.requests[2];
			assert.deepEqual(failedHttp.locations, [{ magic: "Shanghai+AS9808+eyeball" }]);
			assert.deepEqual(failedHttp.measurementOptions, {
				protocol: "HTTPS",
				port: 443,
				request: { method: "GET", host: "nanjinghua.com", path: "/" },
			});
		},
	);
});

test("大陆路由诊断在运营商参数错误时不发起网络测量", async () => {
	const result = await runDiagnostic("unknown", {
		GLOBALPING_API_BASE_URL: "http://127.0.0.1:1/v1",
	});
	assert.equal(result.code, 2);
	assert.equal(result.stdout, "");
	assert.match(result.stderr, /运营商必须是 telecom、unicom 或 mobile/);
});
