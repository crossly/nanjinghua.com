import { GlobalpingApiClient } from "./globalping-client.ts";
import { validateMainlandTargetHostname } from "./mainland-access.ts";
import {
	runMainlandRouteDiagnostics,
	selectMainlandNetwork,
} from "./mainland-route-diagnostics.ts";

if (process.argv.includes("--help")) {
	console.log(`用法：pnpm ops:diagnose:mainland-route -- <telecom|unicom|mobile>

从指定固定中国大陆居民网络探针查询目标域名的全部 IPv4 A 地址，逐个使用目标 Host/SNI
执行 HTTPS GET；某地址失败时追加 TCP 443 MTR。该命令用于定位地址级路由故障，不能替代
pnpm ops:validate:mainland 或三家真实终端浏览器验收。

可选环境变量：
  NANJINGHUA_MAINLAND_TARGET       待诊断 hostname，默认 nanjinghua.com
  GLOBALPING_TOKEN                 可选 API token，不会写入报告
  GLOBALPING_API_BASE_URL          API 地址，默认 https://api.globalping.io/v1`);
	process.exit(0);
}

function commandArguments(): string[] {
	return process.argv.slice(2).filter((argument) => argument !== "--");
}

try {
	const arguments_ = commandArguments();
	if (arguments_.length !== 1) throw new Error("运营商必须是 telecom、unicom 或 mobile");
	const network = selectMainlandNetwork(arguments_[0]);
	const target = validateMainlandTargetHostname(
		process.env.NANJINGHUA_MAINLAND_TARGET ?? "nanjinghua.com",
	);
	const client = new GlobalpingApiClient({
		baseUrl: process.env.GLOBALPING_API_BASE_URL,
		token: process.env.GLOBALPING_TOKEN,
	});
	delete process.env.GLOBALPING_TOKEN;
	const report = await runMainlandRouteDiagnostics(client, { target, network });
	console.log(JSON.stringify(report, null, 2));
	if (!report.passed) {
		console.error("大陆地址级路由诊断发现至少一个解析地址不可达；该报告不能计作访问验收通过。");
		process.exitCode = 1;
	}
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 2;
}
