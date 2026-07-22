import { readFileSync } from "node:fs";

type WranglerConfig = {
	main?: string;
	compatibility_date?: string;
	workers_dev?: boolean;
	preview_urls?: boolean;
	routes?: Array<{ pattern?: string; custom_domain?: boolean }>;
	assets?: { binding?: string; html_handling?: string; run_worker_first?: boolean | string[] };
	dev?: { host?: string };
	d1_databases?: Array<Record<string, unknown>>;
	vars?: Record<string, unknown>;
	observability?: {
		enabled?: boolean;
		logs?: { enabled?: boolean; invocation_logs?: boolean };
	};
	triggers?: { crons?: unknown[] };
};

function requireCondition(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

const config = JSON.parse(readFileSync("wrangler.jsonc", "utf8")) as WranglerConfig;
const database = config.d1_databases?.find((entry) => entry.binding === "SUBMISSIONS_DB");

requireCondition(config.main === "./src/server.ts", "Worker 入口必须是 ./src/server.ts");
requireCondition(config.workers_dev === true, "必须保留 workers.dev 验收域名");
requireCondition(config.preview_urls === true, "必须保留 Worker preview URL");
for (const hostname of ["nanjinghua.com", "www.nanjinghua.com"]) {
	requireCondition(
		config.routes?.some((route) => route.pattern === hostname && route.custom_domain === true),
		`缺少 Worker custom domain ${hostname}`,
	);
}
requireCondition(
	config.assets?.html_handling === "drop-trailing-slash",
	"公开内容必须统一为无尾斜杠 URL",
);
requireCondition(config.assets?.binding === "ASSETS", "缺少静态资源 ASSETS binding");
requireCondition(
	config.assets?.run_worker_first === true,
	"所有请求必须先经过 Worker，以执行规范域跳转",
);
requireCondition(
	config.dev?.host === "localhost",
	"本地 Worker 必须使用 localhost 避免触发生产跳转",
);
requireCondition(/^\d{4}-\d{2}-\d{2}$/.test(config.compatibility_date ?? ""), "缺少兼容日期");
requireCondition(database?.database_name === "nanjinghua-submissions", "缺少生产 D1 绑定");
requireCondition(
	typeof database.database_id === "string" && database.database_id.length > 0,
	"D1 缺少 ID",
);
requireCondition(config.vars?.TURNSTILE_MODE === "production", "Turnstile 必须使用生产模式");
requireCondition(
	typeof config.vars?.TURNSTILE_SITE_KEY === "string" &&
		!String(config.vars.TURNSTILE_SITE_KEY).startsWith("1x000000"),
	"生产配置不能使用 Turnstile 测试 site key",
);
requireCondition(config.observability?.enabled === true, "Worker 可观测性尚未启用");
requireCondition(config.observability.logs?.enabled === true, "Worker 应用日志尚未启用");
requireCondition(
	config.observability.logs?.invocation_logs === false,
	"必须关闭持久化 invocation logs，避免记录公开查询字符串",
);
requireCondition(config.triggers?.crons?.includes("0 2 * * *"), "缺少每日保留周期 Cron");

const unsafeVariable = Object.keys(config.vars ?? {}).find((name) =>
	/SECRET|API_KEY|TOKEN/.test(name),
);
requireCondition(!unsafeVariable, `私密值 ${unsafeVariable} 不能写入 wrangler.jsonc`);

console.log(
	"Cloudflare 配置检查通过：custom domains、Worker、Assets、D1、Turnstile、日志与 Cron 已声明；R2/媒体延期。",
);
