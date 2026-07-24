import { createHash } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { type BrowserContext, chromium, type Page } from "@playwright/test";
import { mainlandNetworks } from "./mainland-access.ts";
import {
	buildCymruOriginQuery,
	createPublicTerminalNetworkEvidence,
	evaluateTerminalEvidence,
	parseCloudflareTrace,
	parseCymruAsNameRecords,
	parseCymruOriginRecords,
	redactTerminalDiagnostic,
	refreshTerminalMeasurementFailures,
	serializePublicTerminalReport,
	shouldRecordTerminalRequestFailure,
	shouldRecordTerminalResponseFailure,
	type TerminalNetworkEvidence,
	type TerminalRecoveryResult,
	terminalRoutes,
} from "./terminal-access.ts";

const staticResourceTypes = new Set(["stylesheet", "script", "image", "font"]);

type TerminalRoute = (typeof terminalRoutes)[number];

type TerminalMeasurement = {
	route: TerminalRoute["id"];
	path: string;
	round: number;
	startedAt: string;
	durationMs: number;
	statusCode: number | null;
	finalUrl: string | null;
	contentMatched: boolean;
	canonicalMatched: boolean;
	resourceTypes: string[];
	resourceFailures: string[];
	consoleErrors: string[];
	pageErrors: string[];
	screenshot: string | null;
	passed: boolean;
	reasons: string[];
};

type MeasuredRoute = {
	measurement: TerminalMeasurement;
	reviewPage: Page | null;
};

type DetailedRecoveryResult = TerminalRecoveryResult & {
	initialStatusCode: number | null;
	statusCode: number | null;
	contentMatched: boolean;
	screenshot: string | null;
	reasons: string[];
};

type OperatorConfirmations = {
	visualConfirmed: boolean;
	visualConfirmedAt: string | null;
	directConnectionConfirmed: boolean;
	directConnectionConfirmedAt: string | null;
};

function usage(): string {
	return `用法：pnpm ops:validate:terminal -- <telecom|unicom|mobile>

在当前真实终端的可见 Chromium 中，对 nanjinghua.com 的非音频首页、城市故事、关于页面、
规范 URL、同源静态资源和离线恢复执行三轮验收。命令从目标域名的 Cloudflare trace
	取得出口 IP，仅用它查询 Team Cymru ASN；报告不会保存或输出 IP。只有大陆位置、指定
	运营商 ASN、全部自动检查、操作者可见确认和目标运营商直连声明同时通过时，命令才以
	状态码 0 退出。

可选环境变量：
  NANJINGHUA_TERMINAL_TARGET         待验收 hostname，默认 nanjinghua.com
  NANJINGHUA_TERMINAL_ROUNDS         轮数，默认 3；非 3 轮仅作冒烟且不能正式通过
  NANJINGHUA_TERMINAL_VIEW_DELAY_MS  可见页面停留时间，默认 1000，范围 0-10000
	  NANJINGHUA_TERMINAL_HEADLESS       设为 1 仅作工具冒烟；无法通过两项人工声明`;
}

function integerEnvironment(
	name: string,
	fallback: number,
	minimum: number,
	maximum: number,
): number {
	const raw = process.env[name];
	if (raw === undefined) return fallback;
	const value = Number(raw);
	if (!Number.isInteger(value) || value < minimum || value > maximum) {
		throw new Error(`${name} 必须是 ${minimum}-${maximum} 的整数`);
	}
	return value;
}

function targetHostname(): string {
	const target = process.env.NANJINGHUA_TERMINAL_TARGET ?? "nanjinghua.com";
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
		throw new Error("NANJINGHUA_TERMINAL_TARGET 必须是小写 hostname，不得包含协议、端口或路径");
	}
	return target;
}

function selectedNetwork() {
	const args = process.argv.slice(2).filter((argument) => argument !== "--");
	const id = args[0];
	if (!id || args.length !== 1) throw new Error("必须且只能指定 telecom、unicom 或 mobile");
	const network = mainlandNetworks.find((candidate) => candidate.id === id);
	if (!network) throw new Error(`未知网络 ${id}；必须是 telecom、unicom 或 mobile`);
	return network;
}

function reportDirectory(): { absolute: string; name: string } {
	const name = new Date().toISOString().replaceAll(":", "-").replace(".000Z", "Z");
	return {
		absolute: path.resolve("test-results", "mainland-terminal", name),
		name,
	};
}

async function lookupNetworkEvidence(
	page: Page,
	target: string,
	clientIps: string[],
): Promise<TerminalNetworkEvidence> {
	const traceUrl = `https://${target}/cdn-cgi/trace?terminal-check=${Date.now()}`;
	const response = await page.goto(traceUrl, { waitUntil: "domcontentloaded", timeout: 20_000 });
	if (response?.status() !== 200) throw new Error("目标域名的 Cloudflare trace 未返回 HTTP 200");
	const trace = parseCloudflareTrace(await page.locator("body").innerText());
	if (!clientIps.includes(trace.ip)) clientIps.push(trace.ip);
	try {
		const origin = parseCymruOriginRecords(await resolveTxt(buildCymruOriginQuery(trace.ip)));
		const asName = parseCymruAsNameRecords(await resolveTxt(`AS${origin.asn}.asn.cymru.com`));
		return createPublicTerminalNetworkEvidence(trace, origin, asName);
	} catch {
		throw new Error("Team Cymru DNS 查询失败，无法确认当前终端 ASN");
	}
}

function sameTarget(url: string, targetOrigin: string): boolean {
	try {
		return new URL(url).origin === targetOrigin;
	} catch {
		return false;
	}
}

async function measureRoute(
	context: BrowserContext,
	options: {
		target: string;
		route: TerminalRoute;
		round: number;
		artifactDirectory: string;
		viewDelayMs: number;
		headless: boolean;
		clientIps: string[];
	},
): Promise<MeasuredRoute> {
	const page = await context.newPage();
	const consoleErrors: string[] = [];
	const pageErrors: string[] = [];
	const resourceFailures: string[] = [];
	const resourceTypes = new Set<string>();
	const targetOrigin = `https://${options.target}`;
	page.on("console", (message) => {
		if (message.type() === "error") {
			consoleErrors.push(redactTerminalDiagnostic(message.text(), options.clientIps));
		}
	});
	page.on("pageerror", (error) =>
		pageErrors.push(redactTerminalDiagnostic(error.message, options.clientIps)),
	);
	page.on("requestfailed", (request) => {
		if (shouldRecordTerminalRequestFailure(request.url(), request.resourceType(), targetOrigin)) {
			resourceFailures.push(`${request.resourceType()} ${new URL(request.url()).pathname}`);
		}
	});
	page.on("response", (response) => {
		const resourceType = response.request().resourceType();
		if (sameTarget(response.url(), targetOrigin) && staticResourceTypes.has(resourceType)) {
			resourceTypes.add(resourceType);
		}
		if (
			shouldRecordTerminalResponseFailure(
				response.url(),
				resourceType,
				response.status(),
				targetOrigin,
			)
		) {
			resourceFailures.push(`${response.status()} ${new URL(response.url()).pathname}`);
		}
	});

	const startedAt = new Date().toISOString();
	const started = performance.now();
	let statusCode: number | null = null;
	let finalUrl: string | null = null;
	let contentMatched = false;
	let canonicalMatched = false;
	let screenshot: string | null = null;
	const reasons: string[] = [];
	try {
		const response = await page.goto(`${targetOrigin}${options.route.path}`, {
			waitUntil: "domcontentloaded",
			timeout: 20_000,
		});
		statusCode = response?.status() ?? null;
		await page.waitForTimeout(500);
		const final = new URL(page.url());
		finalUrl = `${final.origin}${final.pathname}${final.search}`;
		const bodyText = await page.locator("body").innerText();
		contentMatched = bodyText.includes(options.route.expectedContent);
		canonicalMatched =
			final.origin === targetOrigin &&
			final.pathname === options.route.expectedPath &&
			(options.route.expectedQuery === null
				? final.search === ""
				: final.searchParams.get("q") === options.route.expectedQuery);
		if (!options.headless && options.viewDelayMs > 0)
			await page.waitForTimeout(options.viewDelayMs);
		if (options.round === 1) {
			screenshot = `${options.route.id}.png`;
			await page.screenshot({
				path: path.join(options.artifactDirectory, screenshot),
				fullPage: true,
			});
		}
	} catch (error) {
		reasons.push(
			redactTerminalDiagnostic(
				error instanceof Error ? error.message : String(error),
				options.clientIps,
			),
		);
	}
	if (statusCode !== 200) reasons.push(`导航 HTTP 状态为 ${String(statusCode)}`);
	if (!contentMatched) reasons.push("页面正文签名不匹配");
	if (!canonicalMatched) reasons.push("最终规范 URL 不匹配");
	for (const requiredType of ["stylesheet", "script"]) {
		if (!resourceTypes.has(requiredType)) reasons.push(`没有观察到同源 ${requiredType} 资源`);
	}
	if (options.route.id === "home" && !resourceTypes.has("image")) {
		reasons.push("首页没有观察到同源 image 资源");
	}
	const reviewPage = options.round === 1 && !options.headless ? page : null;
	if (!reviewPage) await page.close();
	const measurement: TerminalMeasurement = {
		route: options.route.id,
		path: options.route.path,
		round: options.round,
		startedAt,
		durationMs: Math.round(performance.now() - started),
		statusCode,
		finalUrl,
		contentMatched,
		canonicalMatched,
		resourceTypes: [...resourceTypes].sort(),
		resourceFailures,
		consoleErrors,
		pageErrors,
		screenshot,
		passed: false,
		reasons,
	};
	refreshTerminalMeasurementFailures(measurement);
	return {
		measurement,
		reviewPage,
	};
}

async function verifyRecovery(
	context: BrowserContext,
	target: string,
	artifactDirectory: string,
	clientIps: string[],
): Promise<{ result: DetailedRecoveryResult; page: Page }> {
	const page = await context.newPage();
	const recoveryUrl = `https://${target}/stories/breakfast`;
	let offlineFailureObserved = false;
	const reasons: string[] = [];
	let initialStatusCode: number | null = null;
	try {
		const initialResponse = await page.goto(recoveryUrl, {
			waitUntil: "domcontentloaded",
			timeout: 20_000,
		});
		initialStatusCode = initialResponse?.status() ?? null;
	} catch (error) {
		reasons.push(
			`离线演练前导航失败：${redactTerminalDiagnostic(error instanceof Error ? error.message : String(error), clientIps)}`,
		);
	}
	if (initialStatusCode === 200) {
		try {
			await context.setOffline(true);
			try {
				await page.reload({ waitUntil: "domcontentloaded", timeout: 5_000 });
			} catch {
				offlineFailureObserved = true;
			}
		} finally {
			await context.setOffline(false);
		}
	} else {
		reasons.push(`离线演练前 HTTP 状态为 ${String(initialStatusCode)}`);
	}
	let statusCode: number | null = null;
	let contentMatched = false;
	try {
		const response = await page.goto(recoveryUrl, {
			waitUntil: "domcontentloaded",
			timeout: 20_000,
		});
		statusCode = response?.status() ?? null;
		contentMatched = (await page.locator("body").innerText()).includes("早点铺的热气，先醒过来");
	} catch (error) {
		reasons.push(
			redactTerminalDiagnostic(error instanceof Error ? error.message : String(error), clientIps),
		);
	}
	if (!offlineFailureObserved) reasons.push("离线时页面没有出现预期请求失败");
	if (statusCode !== 200) reasons.push(`恢复后 HTTP 状态为 ${String(statusCode)}`);
	if (!contentMatched) reasons.push("恢复后故事正文签名不匹配");
	const screenshot = "recovery.png";
	await page.screenshot({ path: path.join(artifactDirectory, screenshot), fullPage: true });
	return {
		page,
		result: {
			offlineFailureObserved,
			recovered: statusCode === 200 && contentMatched,
			initialStatusCode,
			statusCode,
			contentMatched,
			screenshot,
			reasons,
		},
	};
}

async function requestOperatorConfirmations(): Promise<OperatorConfirmations> {
	const readline = createInterface({ input: process.stdin, output: process.stderr });
	try {
		const visualAnswer = await readline.question(
			"请确认可见浏览器中的首页、专题、搜索和恢复后页面均可读且交互正常。输入 YES 确认：",
		);
		const visualConfirmed = visualAnswer.trim() === "YES";
		const visualConfirmedAt = visualConfirmed ? new Date().toISOString() : null;
		const directConnectionAnswer = await readline.question(
			"请确认当前终端直接连接所选运营商，且 VPN、代理、iCloud Private Relay 和会改变出口的安全网关均已关闭。输入 DIRECT 声明：",
		);
		const directConnectionConfirmed = directConnectionAnswer.trim() === "DIRECT";
		return {
			visualConfirmed,
			visualConfirmedAt,
			directConnectionConfirmed,
			directConnectionConfirmedAt: directConnectionConfirmed ? new Date().toISOString() : null,
		};
	} finally {
		readline.close();
	}
}

async function screenshotChecksums(
	directory: string,
	files: Array<string | null>,
): Promise<Array<{ file: string; sha256: string }>> {
	const uniqueFiles = [...new Set(files.filter((file): file is string => file !== null))].sort();
	return await Promise.all(
		uniqueFiles.map(async (file) => ({
			file,
			sha256: createHash("sha256")
				.update(await readFile(path.join(directory, file)))
				.digest("hex"),
		})),
	);
}

if (process.argv.includes("--help")) {
	console.log(usage());
	process.exit(0);
}

let artifacts: ReturnType<typeof reportDirectory> | null = null;
let reportTarget: string | null = null;
let reportExpectedNetwork: { id: string; name: string; asn: number } | null = null;
let reportWritten = false;
const clientIps: string[] = [];

try {
	const target = targetHostname();
	reportTarget = target;
	const network = selectedNetwork();
	reportExpectedNetwork = { id: network.id, name: network.name, asn: network.asn };
	const rounds = integerEnvironment("NANJINGHUA_TERMINAL_ROUNDS", 3, 1, 5);
	const viewDelayMs = integerEnvironment("NANJINGHUA_TERMINAL_VIEW_DELAY_MS", 1_000, 0, 10_000);
	const headless = process.env.NANJINGHUA_TERMINAL_HEADLESS === "1";
	if (!headless && (!process.stdin.isTTY || !process.stderr.isTTY)) {
		throw new Error("可见终端验收必须从交互式 TTY 运行；仅工具冒烟可设置 HEADLESS=1");
	}
	artifacts = reportDirectory();
	await mkdir(artifacts.absolute, { recursive: true, mode: 0o700 });
	const browser = await chromium.launch({ headless });
	try {
		const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
		const identityPage = await context.newPage();
		const startNetwork = await lookupNetworkEvidence(identityPage, target, clientIps);
		const browserClient = await identityPage.evaluate(() => ({
			platform: navigator.platform,
			userAgent: navigator.userAgent,
		}));
		await identityPage.close();

		const measurements: TerminalMeasurement[] = [];
		const reviewPages: Page[] = [];
		for (let round = 1; round <= rounds; round += 1) {
			for (const route of terminalRoutes) {
				const measuredRoute = await measureRoute(context, {
					target,
					route,
					round,
					artifactDirectory: artifacts.absolute,
					viewDelayMs,
					headless,
					clientIps,
				});
				measurements.push(measuredRoute.measurement);
				if (measuredRoute.reviewPage) reviewPages.push(measuredRoute.reviewPage);
			}
		}

		const recovery = await verifyRecovery(context, target, artifacts.absolute, clientIps);
		let confirmations: OperatorConfirmations;
		try {
			if (!headless) {
				console.error(
					"首轮首页、专题、搜索、规范 URL 与恢复页面仍保留为浏览器标签页，请逐项复核后返回终端确认。",
				);
				await reviewPages[0]?.bringToFront();
			}
			confirmations = headless
				? {
						visualConfirmed: false,
						visualConfirmedAt: null,
						directConnectionConfirmed: false,
						directConnectionConfirmedAt: null,
					}
				: await requestOperatorConfirmations();
		} finally {
			await Promise.all(reviewPages.map((page) => page.close()));
			await recovery.page.close();
		}
		for (const measurement of measurements) refreshTerminalMeasurementFailures(measurement);
		const finalIdentityPage = await context.newPage();
		let endNetwork: TerminalNetworkEvidence | null = null;
		let endNetworkError: string | null = null;
		try {
			endNetwork = await lookupNetworkEvidence(finalIdentityPage, target, clientIps);
		} catch (error) {
			endNetworkError = redactTerminalDiagnostic(
				error instanceof Error ? error.message : String(error),
				clientIps,
			);
		} finally {
			await finalIdentityPage.close();
		}
		const evaluation = evaluateTerminalEvidence({
			expectedNetwork: network,
			startNetwork,
			endNetwork,
			rounds,
			measurements,
			recovery: recovery.result,
			humanConfirmed: confirmations.visualConfirmed,
			directConnectionConfirmed: confirmations.directConnectionConfirmed,
		});
		const screenshots = await screenshotChecksums(artifacts.absolute, [
			...measurements.map((measurement) => measurement.screenshot),
			recovery.result.screenshot,
		]);
		const report = {
			schemaVersion: 2,
			generatedAt: new Date().toISOString(),
			target,
			expectedNetwork: { id: network.id, name: network.name, asn: network.asn },
			startNetwork,
			endNetwork,
			endNetworkError,
			browser: {
				name: "chromium",
				version: browser.version(),
				headless,
				platform: browserClient.platform,
				userAgent: browserClient.userAgent,
			},
			rounds,
			measurements,
			recovery: recovery.result,
			operatorConfirmation: { required: true, ...confirmations },
			artifacts: { screenshots },
			passed: evaluation.passed,
			reasons: evaluation.reasons,
		};
		const reportJson = serializePublicTerminalReport(report, clientIps);
		await writeFile(path.join(artifacts.absolute, "report.json"), reportJson, { mode: 0o600 });
		reportWritten = true;
		process.stdout.write(reportJson);
		console.error(`验收证据已写入 test-results/mainland-terminal/${artifacts.name}/report.json`);
		if (!report.passed) {
			console.error("真实终端浏览器验收未通过；不得把该报告计入三网完成数。");
			process.exitCode = 1;
		}
	} finally {
		await browser.close();
	}
} catch (error) {
	const message = redactTerminalDiagnostic(
		error instanceof Error ? error.message : String(error),
		clientIps,
	);
	console.error(message);
	if (artifacts && !reportWritten) {
		const infrastructureReport = {
			schemaVersion: 2,
			generatedAt: new Date().toISOString(),
			outcome: "infrastructure-error",
			target: reportTarget,
			expectedNetwork: reportExpectedNetwork,
			passed: null,
			infrastructureError: message,
			reasons: ["验收基础设施错误；该报告不能计作站点通过或失败。"],
		};
		try {
			const reportJson = serializePublicTerminalReport(infrastructureReport, clientIps);
			await writeFile(path.join(artifacts.absolute, "report.json"), reportJson, { mode: 0o600 });
			reportWritten = true;
			process.stdout.write(reportJson);
			console.error(
				`基础设施错误证据已写入 test-results/mainland-terminal/${artifacts.name}/report.json`,
			);
		} catch (reportError) {
			console.error(
				`基础设施错误报告写入失败：${redactTerminalDiagnostic(
					reportError instanceof Error ? reportError.message : String(reportError),
					clientIps,
				)}`,
			);
		}
	}
	process.exitCode = 2;
}
