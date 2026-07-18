import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
	operationDirectoryArgument,
	parseD1DatabaseInfo,
	parseD1RowCounts,
} from "../scripts/operations-data.ts";

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
	assert.match(packageJson.scripts.deploy, /validate:cloudflare:remote/);
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

test("运维脚本忽略 pnpm 传入的参数分隔符并拒绝歧义目录", () => {
	assert.equal(operationDirectoryArgument(["--", ".ops/backups/example"]), ".ops/backups/example");
	assert.equal(operationDirectoryArgument([".ops/backups/example"]), ".ops/backups/example");
	assert.equal(operationDirectoryArgument([]), undefined);
	assert.equal(operationDirectoryArgument(["first", "second"]), undefined);
});

test("远端 D1 信息解析器返回可与生产配置比对的名称和 ID", () => {
	assert.deepEqual(
		parseD1DatabaseInfo(
			JSON.stringify({
				uuid: "1b8402bf-a88e-4d11-bd56-e06e6c70cfc1",
				name: "nanjinghua-submissions",
				num_tables: 5,
			}),
		),
		{
			uuid: "1b8402bf-a88e-4d11-bd56-e06e6c70cfc1",
			name: "nanjinghua-submissions",
		},
	);
	assert.throws(() => parseD1DatabaseInfo("{}"), /缺少名称或 ID/);
});

test("恢复脚本可从合成 Git 与 D1 备份还原内容和逐表数据", () => {
	const fixtureDirectory = mkdtempSync(join(tmpdir(), "nanjinghua-operations-test-"));
	try {
		const bundlePath = join(fixtureDirectory, "content.git.bundle");
		const d1Path = join(fixtureDirectory, "submissions.sql");
		const bundle = spawnSync("git", ["bundle", "create", bundlePath, "HEAD"], {
			encoding: "utf8",
		});
		assert.equal(bundle.status, 0, bundle.stderr);

		const migrations = readdirSync("migrations")
			.filter((file) => file.endsWith(".sql"))
			.sort()
			.map((file) => readFileSync(join("migrations", file), "utf8"));
		migrations.push(`
INSERT INTO submission_leads (
  id, type, description, priority, status, policy_accepted_at,
  created_at, updated_at, status_changed_at
) VALUES (
  'SUB-RESTORE-TEST', '纠错', 'restore fixture', 0, '核验中',
  '2026-07-18T00:00:00Z', '2026-07-18T00:00:00Z',
  '2026-07-18T00:00:00Z', '2026-07-18T00:00:00Z'
);
INSERT INTO submission_contacts (
  lead_id, contact_method, contact_value, created_at
) VALUES ('SUB-RESTORE-TEST', '电子邮箱', 'fixture@example.invalid', '2026-07-18T00:00:00Z');
INSERT INTO submission_status_events (
  lead_id, from_status, to_status, note, actor, created_at
) VALUES (
  'SUB-RESTORE-TEST', '已收到', '核验中', 'fixture', 'test', '2026-07-18T00:00:00Z'
);
INSERT INTO submission_disposition_events (
  lead_id, archive_id, decision_type, public_catalog_action,
  stored_copy_action, backup_action, note, actor, created_at
) VALUES (
  'SUB-RESTORE-TEST', 'NJH000001', '事实修订', '不适用',
  '不适用', '不适用', 'fixture', 'test', '2026-07-18T00:00:00Z'
);
`);
		writeFileSync(d1Path, `${migrations.join("\n")}\n`);

		const gitHead = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
		const digest = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
		const manifest = {
			version: 1,
			gitHead,
			databaseName: "nanjinghua-submissions",
			contentCounts: {
				archives: readdirSync("content/archive").filter((file) => file.endsWith(".meta.json"))
					.length,
				articles: readdirSync("content/articles").filter((file) => file.endsWith(".meta.json"))
					.length,
			},
			d1RowCounts: {
				submission_contacts: 1,
				submission_disposition_events: 1,
				submission_leads: 1,
				submission_status_events: 1,
			},
			files: [bundlePath, d1Path].map((path) => ({
				name: path.slice(fixtureDirectory.length + 1),
				bytes: statSync(path).size,
				sha256: digest(path),
			})),
		};
		writeFileSync(join(fixtureDirectory, "manifest.json"), JSON.stringify(manifest));

		const restored = runScript("scripts/restore-drill.ts", ["--", fixtureDirectory]);
		assert.equal(restored.status, 0, restored.stderr);
		assert.match(restored.stdout, /"outcome": "passed"/);
		assert.match(restored.stdout, /"submission_disposition_events": 1/);
	} finally {
		rmSync(fixtureDirectory, { recursive: true, force: true });
	}
});
