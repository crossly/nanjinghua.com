import { readFileSync } from "node:fs";
import { parseD1DatabaseInfo } from "./operations-data.ts";
import { runCommand } from "./operations-runtime.ts";

type WranglerConfig = {
	d1_databases?: Array<Record<string, unknown>>;
};

function requireCondition(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

const config = JSON.parse(readFileSync("wrangler.jsonc", "utf8")) as WranglerConfig;
const database = config.d1_databases?.find((entry) => entry.binding === "SUBMISSIONS_DB");
requireCondition(typeof database?.database_name === "string", "生产 D1 缺少名称");
requireCondition(typeof database.database_id === "string", "生产 D1 缺少 ID");

const remote = parseD1DatabaseInfo(
	runCommand("pnpm", ["exec", "wrangler", "d1", "info", database.database_name, "--json"], true),
);
requireCondition(remote.name === database.database_name, "远端 D1 名称与 Worker 配置不一致");
requireCondition(remote.uuid === database.database_id, "远端 D1 ID 与 Worker 配置不一致");

console.log(`远端 Cloudflare 资源检查通过：D1 ${remote.name} (${remote.uuid})。`);
