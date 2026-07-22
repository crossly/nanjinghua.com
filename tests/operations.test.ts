import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	chmodSync,
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	symlinkSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
	backupEncryptionAlgorithm,
	backupKeyFingerprint,
	encryptBackupFile,
} from "../scripts/operations-crypto.ts";
import {
	operationDirectoryArgument,
	parseD1DatabaseInfo,
	parseD1RowCounts,
} from "../scripts/operations-data.ts";
import {
	authenticateBackupManifest,
	type EncryptedBackupManifestPayload,
} from "../scripts/operations-manifest.ts";

function runScript(path: string, args: string[] = [], environment: Record<string, string> = {}) {
	return spawnSync(process.execPath, [path, ...args], {
		encoding: "utf8",
		env: { ...process.env, ...environment },
	});
}

function syntheticD1Sql(): string {
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
	return `${migrations.join("\n")}\n`;
}

const syntheticD1RowCounts = {
	submission_contacts: 1,
	submission_disposition_events: 1,
	submission_leads: 1,
	submission_status_events: 1,
};

test("Cloudflare 生产配置声明 Worker、D1、Turnstile 与隐私友好日志", () => {
	const result = runScript("scripts/validate-cloudflare-config.ts");
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /R2\/媒体延期/);
});

test("生产运维工具提供不接触生产数据或网络的帮助入口", () => {
	for (const path of [
		"scripts/backup-production.ts",
		"scripts/restore-drill.ts",
		"scripts/diagnose-mainland-route.ts",
	]) {
		const result = runScript(path, ["--help"]);
		assert.equal(result.status, 0, result.stderr);
		assert.match(result.stdout, /用法/);
	}
});

test("部署门禁包含性能、Cloudflare 配置、秘密与远端迁移检查", () => {
	const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
		scripts: Record<string, string>;
	};
	assert.match(packageJson.scripts["ops:verify"], /^pnpm run build &&/);
	assert.match(packageJson.scripts.deploy, /performance:check/);
	assert.match(packageJson.scripts.deploy, /validate:cloudflare/);
	assert.match(packageJson.scripts.deploy, /validate:cloudflare:remote/);
	assert.match(packageJson.scripts.deploy, /validate:secrets/);
	assert.match(packageJson.scripts.deploy, /db:migrate:remote/);
});

test("定时大陆门禁只读运行并始终保留跨时间报告", () => {
	const workflow = readFileSync(".github/workflows/mainland-access.yml", "utf8");
	assert.match(workflow, /cron: "17 0,8,16 \* \* \*"/);
	assert.match(workflow, /contents: read/);
	assert.match(workflow, /pnpm --silent run ops:validate:mainland/);
	assert.match(workflow, /NANJINGHUA_MAINLAND_ROUNDS: "3"/);
	assert.match(workflow, /if: always\(\)/);
	assert.match(workflow, /retention-days: 30/);
	assert.doesNotMatch(workflow, /wrangler deploy|pnpm run deploy|db:migrate/);
	for (const action of workflow.matchAll(/uses: ([^\s#]+)/g)) {
		assert.match(action[1], /@[0-9a-f]{40}$/);
	}
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

test("生产备份 CLI 只留下可恢复的认证加密载荷并在失败时清理", () => {
	const fixtureDirectory = mkdtempSync(join(tmpdir(), "nanjinghua-backup-cli-test-"));
	try {
		const fakeBin = join(fixtureDirectory, "bin");
		const backupDirectory = join(fixtureDirectory, "backup");
		const failedBackupDirectory = join(fixtureDirectory, "failed-backup");
		const commandLog = join(fixtureDirectory, "commands.log");
		const exportState = join(fixtureDirectory, "export-path.txt");
		mkdirSync(fakeBin);

		const fakeGitPath = join(fakeBin, "git");
		writeFileSync(
			fakeGitPath,
			`#!/usr/bin/env node
const { appendFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const args = process.argv.slice(2);
appendFileSync(process.env.FAKE_COMMAND_LOG, "git key=" + Boolean(process.env.NANJINGHUA_BACKUP_KEY) + " " + args.join(" ") + "\\n");
if (args[0] === "status") process.exit(0);
const result = spawnSync(process.env.REAL_GIT, args, { cwd: process.cwd(), stdio: "inherit" });
process.exit(result.status ?? 1);
`,
			{ mode: 0o700 },
		);
		chmodSync(fakeGitPath, 0o700);

		const fakePnpmPath = join(fakeBin, "pnpm");
		writeFileSync(
			fakePnpmPath,
			`#!/usr/bin/env node
const { appendFileSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const args = process.argv.slice(2);
appendFileSync(process.env.FAKE_COMMAND_LOG, "pnpm key=" + Boolean(process.env.NANJINGHUA_BACKUP_KEY) + " " + args.join(" ") + "\\n");
if (args.includes("export")) {
  const output = args.find((arg) => arg.startsWith("--output=")).slice("--output=".length);
  writeFileSync(output, Buffer.from(process.env.FAKE_D1_SQL_BASE64, "base64"));
  writeFileSync(process.env.FAKE_EXPORT_STATE, output);
  process.exit(0);
}
if (args.includes("execute")) {
  if (args.includes("--json")) {
    process.stdout.write(JSON.stringify([{ success: true, results: [
      { table_name: "submission_contacts", row_count: 1 },
      { table_name: "submission_disposition_events", row_count: 1 },
      { table_name: "submission_leads", row_count: 1 },
      { table_name: "submission_status_events", row_count: 1 }
    ] }]));
    if (process.env.FAKE_REMOVE_EXPORT_AFTER_VERIFY === "1") {
      rmSync(readFileSync(process.env.FAKE_EXPORT_STATE, "utf8"), { force: true });
    }
    process.exit(0);
  }
  process.exit(0);
}
process.exit(2);
`,
			{ mode: 0o700 },
		);
		chmodSync(fakePnpmPath, 0o700);

		const realGit = spawnSync("which", ["git"], { encoding: "utf8" }).stdout.trim();
		const encodedBackupKey = Buffer.alloc(32, 11).toString("base64");
		const fakeEnvironment = {
			PATH: `${fakeBin}:${process.env.PATH}`,
			NANJINGHUA_BACKUP_KEY: encodedBackupKey,
			REAL_GIT: realGit,
			FAKE_COMMAND_LOG: commandLog,
			FAKE_D1_SQL_BASE64: Buffer.from(syntheticD1Sql()).toString("base64"),
			FAKE_EXPORT_STATE: exportState,
		};

		const backedUp = runScript(
			"scripts/backup-production.ts",
			["--", backupDirectory],
			fakeEnvironment,
		);
		assert.equal(backedUp.status, 0, backedUp.stderr);
		assert.deepEqual(readdirSync(backupDirectory).sort(), [
			"content.git.bundle.enc",
			"manifest.json",
			"submissions.sql.enc",
		]);
		for (const name of readdirSync(backupDirectory)) {
			assert.equal(statSync(join(backupDirectory, name)).mode & 0o777, 0o600);
		}
		const manifest = JSON.parse(readFileSync(join(backupDirectory, "manifest.json"), "utf8")) as {
			version: number;
			authentication?: { algorithm?: string };
		};
		assert.equal(manifest.version, 2);
		assert.equal(manifest.authentication?.algorithm, "hmac-sha256");
		assert.doesNotMatch(readFileSync(commandLog, "utf8"), /key=true/);

		const restored = runScript("scripts/restore-drill.ts", ["--", backupDirectory], {
			NANJINGHUA_BACKUP_KEY: encodedBackupKey,
		});
		assert.equal(restored.status, 0, restored.stderr);
		assert.match(restored.stdout, /"outcome": "passed"/);

		const failed = runScript("scripts/backup-production.ts", ["--", failedBackupDirectory], {
			...fakeEnvironment,
			FAKE_REMOVE_EXPORT_AFTER_VERIFY: "1",
		});
		assert.notEqual(failed.status, 0);
		assert.deepEqual(readdirSync(failedBackupDirectory), []);
	} finally {
		rmSync(fixtureDirectory, { recursive: true, force: true });
	}
});

test("恢复脚本可认证解密合成 Git 与 D1 备份并还原逐表数据", async () => {
	const fixtureDirectory = mkdtempSync(join(tmpdir(), "nanjinghua-operations-test-"));
	try {
		const bundlePath = join(fixtureDirectory, "content.git.bundle");
		const d1Path = join(fixtureDirectory, "submissions.sql");
		const encryptedBundlePath = `${bundlePath}.enc`;
		const encryptedD1Path = `${d1Path}.enc`;
		const backupKey = Buffer.alloc(32, 7);
		const encodedBackupKey = backupKey.toString("base64");
		const legacyDirectory = join(fixtureDirectory, "legacy");
		mkdirSync(legacyDirectory);
		const bundle = spawnSync("git", ["bundle", "create", bundlePath, "HEAD"], {
			encoding: "utf8",
		});
		assert.equal(bundle.status, 0, bundle.stderr);

		writeFileSync(d1Path, syntheticD1Sql());

		const gitHead = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
		const digest = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
		const contentCounts = {
			archives: readdirSync("content/archive").filter((file) => file.endsWith(".meta.json")).length,
			articles: readdirSync("content/articles").filter((file) => file.endsWith(".meta.json"))
				.length,
		};
		const d1RowCounts = syntheticD1RowCounts;
		const legacyBundlePath = join(legacyDirectory, "content.git.bundle");
		const legacyD1Path = join(legacyDirectory, "submissions.sql");
		copyFileSync(bundlePath, legacyBundlePath);
		copyFileSync(d1Path, legacyD1Path);
		writeFileSync(
			join(legacyDirectory, "manifest.json"),
			JSON.stringify({
				version: 1,
				gitHead,
				databaseName: "nanjinghua-submissions",
				contentCounts,
				d1RowCounts,
				files: [legacyBundlePath, legacyD1Path].map((path) => ({
					name: path.slice(legacyDirectory.length + 1),
					bytes: statSync(path).size,
					sha256: digest(path),
				})),
			}),
		);
		const encryptedFiles = await Promise.all(
			[
				[bundlePath, encryptedBundlePath],
				[d1Path, encryptedD1Path],
			].map(async ([plaintextPath, encryptedPath]) => {
				const encryption = await encryptBackupFile(plaintextPath, encryptedPath, backupKey);
				return {
					name: encryptedPath.slice(fixtureDirectory.length + 1),
					bytes: statSync(encryptedPath).size,
					sha256: digest(encryptedPath),
					plaintext: {
						name: plaintextPath.slice(fixtureDirectory.length + 1),
						bytes: statSync(plaintextPath).size,
						sha256: digest(plaintextPath),
					},
					encryption,
				};
			}),
		);
		rmSync(bundlePath);
		rmSync(d1Path);

		const manifestPayload: EncryptedBackupManifestPayload = {
			version: 2,
			createdAt: "2026-07-19T00:00:00.000Z",
			gitHead,
			databaseName: "nanjinghua-submissions",
			contentCounts,
			d1RowCounts,
			encryption: {
				algorithm: backupEncryptionAlgorithm,
				keyFingerprint: backupKeyFingerprint(backupKey),
			},
			files: encryptedFiles,
			deferred: ["R2 media", "audio assets"],
		};
		let manifest = authenticateBackupManifest(manifestPayload, backupKey);
		const manifestPath = join(fixtureDirectory, "manifest.json");
		writeFileSync(manifestPath, JSON.stringify(manifest));

		const withoutKey = runScript("scripts/restore-drill.ts", ["--", fixtureDirectory]);
		assert.notEqual(withoutKey.status, 0);
		assert.match(withoutKey.stderr, /NANJINGHUA_BACKUP_KEY/);

		const restored = runScript("scripts/restore-drill.ts", ["--", fixtureDirectory], {
			NANJINGHUA_BACKUP_KEY: encodedBackupKey,
		});
		assert.equal(restored.status, 0, restored.stderr);
		assert.match(restored.stdout, /"outcome": "passed"/);
		assert.match(restored.stdout, /"submission_disposition_events": 1/);

		const originalGitHead = manifest.gitHead;
		manifest.gitHead = "0".repeat(40);
		writeFileSync(manifestPath, JSON.stringify(manifest));
		const unauthenticatedManifest = runScript(
			"scripts/restore-drill.ts",
			["--", fixtureDirectory],
			{ NANJINGHUA_BACKUP_KEY: encodedBackupKey },
		);
		assert.notEqual(unauthenticatedManifest.status, 0);
		assert.match(unauthenticatedManifest.stderr, /清单认证/);
		manifest.gitHead = originalGitHead;
		manifest = authenticateBackupManifest(manifestPayload, backupKey);
		writeFileSync(manifestPath, JSON.stringify(manifest));

		const legacyRestored = runScript("scripts/restore-drill.ts", ["--", legacyDirectory]);
		assert.equal(legacyRestored.status, 0, legacyRestored.stderr);
		assert.match(legacyRestored.stdout, /"outcome": "passed"/);

		const originalCiphertext = readFileSync(encryptedBundlePath);
		const damagedCiphertext = Buffer.from(originalCiphertext);
		damagedCiphertext[0] ^= 0xff;
		writeFileSync(encryptedBundlePath, damagedCiphertext);
		const damagedPayload = {
			...manifestPayload,
			files: manifestPayload.files.map((file, index) =>
				index === 0 ? { ...file, sha256: digest(encryptedBundlePath) } : file,
			),
		};
		manifest = authenticateBackupManifest(damagedPayload, backupKey);
		writeFileSync(manifestPath, JSON.stringify(manifest));
		const damaged = runScript("scripts/restore-drill.ts", ["--", fixtureDirectory], {
			NANJINGHUA_BACKUP_KEY: encodedBackupKey,
		});
		assert.notEqual(damaged.status, 0);
		assert.match(damaged.stderr, /无法认证解密/);

		writeFileSync(encryptedBundlePath, originalCiphertext);
		manifest = authenticateBackupManifest(manifestPayload, backupKey);
		const originalEncryptedName = manifest.files[0].name;
		manifest.files[0].name = `../${originalEncryptedName}`;
		writeFileSync(manifestPath, JSON.stringify(manifest));
		const traversal = runScript("scripts/restore-drill.ts", ["--", fixtureDirectory], {
			NANJINGHUA_BACKUP_KEY: encodedBackupKey,
		});
		assert.notEqual(traversal.status, 0);
		assert.match(traversal.stderr, /越界路径/);

		manifest = authenticateBackupManifest(manifestPayload, backupKey);
		writeFileSync(manifestPath, JSON.stringify(manifest));
		unlinkSync(encryptedBundlePath);
		symlinkSync(legacyBundlePath, encryptedBundlePath);
		const symlink = runScript("scripts/restore-drill.ts", ["--", fixtureDirectory], {
			NANJINGHUA_BACKUP_KEY: encodedBackupKey,
		});
		assert.notEqual(symlink.status, 0);
		assert.match(symlink.stderr, /普通文件/);
	} finally {
		rmSync(fixtureDirectory, { recursive: true, force: true });
	}
});
