import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseD1RowCounts } from "../scripts/operations-data.ts";

function runScript(path: string, args: string[] = []) {
	return spawnSync(process.execPath, [path, ...args], { encoding: "utf8" });
}

test("Cloudflare 生产配置声明 Worker、D1、Turnstile 与隐私友好日志", () => {
	const result = runScript("scripts/validate-cloudflare-config.ts");
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /R2\/媒体延期/);
});

test("备份与恢复工具提供不接触生产数据的帮助入口", () => {
	for (const path of ["scripts/backup-production.ts", "scripts/restore-drill.ts"]) {
		const result = runScript(path, ["--help"]);
		assert.equal(result.status, 0, result.stderr);
		assert.match(result.stdout, /用法/);
	}
});

test("部署门禁包含性能、Cloudflare 配置、秘密与远端迁移检查", () => {
	const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
		scripts: Record<string, string>;
	};
	assert.match(packageJson.scripts.deploy, /performance:check/);
	assert.match(packageJson.scripts.deploy, /validate:cloudflare/);
	assert.match(packageJson.scripts.deploy, /validate:secrets/);
	assert.match(packageJson.scripts.deploy, /db:migrate:remote/);
});

test("D1 计数解析器读取 Wrangler JSON 并要求四张业务表完整", () => {
	const output = JSON.stringify([
		{
			results: [
				{ table_name: "submission_contacts", row_count: 0 },
				{ table_name: "submission_disposition_events", row_count: 0 },
				{ table_name: "submission_leads", row_count: 1 },
				{ table_name: "submission_status_events", row_count: 2 },
			],
			success: true,
		},
	]);

	assert.deepEqual(parseD1RowCounts(output), {
		submission_contacts: 0,
		submission_disposition_events: 0,
		submission_leads: 1,
		submission_status_events: 2,
	});

	assert.throws(
		() =>
			parseD1RowCounts(
				JSON.stringify([
					{ results: [{ table_name: "submission_leads", row_count: 1 }], success: true },
				]),
			),
		/缺少表 submission_contacts/,
	);
});
