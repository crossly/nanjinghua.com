import { GlobalpingApiClient } from "./globalping-client.ts";
import { runMainlandAccessValidation } from "./mainland-access.ts";

if (process.argv.includes("--help")) {
	console.log(`用法：pnpm ops:validate:mainland

从中国电信 AS4134、中国联通 AS4837、中国移动 AS9808 的中国大陆居民网络探针，
对首页、专题、搜索和非音频线索 API 执行多轮 HTTPS GET。任一 TLS、HTTP 200、
正文签名或探针身份检查失败时以状态码 1 退出；Globalping API 故障以状态码 2 退出。

可选环境变量：
  NANJINGHUA_MAINLAND_TARGET       待验收 hostname，默认 nanjinghua.com
  NANJINGHUA_MAINLAND_ROUNDS       轮数，默认 3，范围 1-5
  NANJINGHUA_MAINLAND_DELAY_MS     测量间隔，默认 250，范围 0-10000
  GLOBALPING_TOKEN                 可选 API token，不会写入报告
  GLOBALPING_API_BASE_URL          API 地址，默认 https://api.globalping.io/v1`);
	process.exit(0);
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
	const target = process.env.NANJINGHUA_MAINLAND_TARGET ?? "nanjinghua.com";
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

try {
	const target = targetHostname();
	const rounds = integerEnvironment("NANJINGHUA_MAINLAND_ROUNDS", 3, 1, 5);
	const delayMs = integerEnvironment("NANJINGHUA_MAINLAND_DELAY_MS", 250, 0, 10_000);
	const client = new GlobalpingApiClient({
		baseUrl: process.env.GLOBALPING_API_BASE_URL,
		token: process.env.GLOBALPING_TOKEN,
	});
	delete process.env.GLOBALPING_TOKEN;
	const report = await runMainlandAccessValidation(client, { target, rounds, delayMs });
	console.log(JSON.stringify(report, null, 2));
	if (!report.passed) {
		console.error("中国大陆三网访问验收未通过；保持预览状态并检查报告中的失败探针。");
		process.exitCode = 1;
	}
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 2;
}
