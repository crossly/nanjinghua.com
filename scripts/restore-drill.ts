import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
	type D1BusinessTable,
	d1BusinessTables,
	d1RowCountQuery,
	operationDirectoryArgument,
	parseD1RowCounts,
} from "./operations-data.ts";

type Manifest = {
	version: number;
	gitHead: string;
	databaseName: string;
	contentCounts: { archives: number; articles: number };
	d1RowCounts?: Partial<Record<D1BusinessTable, number>>;
	files: Array<{ name: string; bytes: number; sha256: string }>;
};

function run(command: string, args: string[], capture = false) {
	const result = spawnSync(command, args, {
		cwd: process.cwd(),
		encoding: "utf8",
		stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
	});
	if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} 执行失败`);
	return capture ? result.stdout.trim() : "";
}

function digest(path: string) {
	return createHash("sha256").update(readFileSync(path)).digest("hex");
}

if (process.argv.includes("--help")) {
	console.log("用法：pnpm ops:restore-drill -- /备份目录");
	process.exit(0);
}

const backupArgument = operationDirectoryArgument(process.argv.slice(2));
if (!backupArgument) throw new Error("必须提供包含 manifest.json 的备份目录");
const backupDirectory = resolve(backupArgument);
const manifestPath = join(backupDirectory, "manifest.json");
if (!existsSync(manifestPath)) throw new Error("备份目录缺少 manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
if (manifest.version !== 1) throw new Error(`不支持的备份版本：${manifest.version}`);
for (const table of d1BusinessTables) {
	if (
		!Number.isInteger(manifest.d1RowCounts?.[table]) ||
		Number(manifest.d1RowCounts?.[table]) < 0
	) {
		throw new Error(`备份清单缺少有效 D1 行数：${table}`);
	}
}

for (const file of manifest.files) {
	const path = join(backupDirectory, file.name);
	if (!existsSync(path)) throw new Error(`备份缺少 ${file.name}`);
	if (digest(path) !== file.sha256) throw new Error(`${file.name} 校验值不匹配`);
}

const bundlePath = join(backupDirectory, "content.git.bundle");
const d1Path = join(backupDirectory, "submissions.sql");
const drillDirectory = mkdtempSync(join(tmpdir(), "nanjinghua-restore-"));

try {
	const restoredRepo = join(drillDirectory, "repo");
	run("git", ["bundle", "verify", bundlePath]);
	run("git", ["clone", "--quiet", bundlePath, restoredRepo]);
	const restoredHead = run("git", ["-C", restoredRepo, "rev-parse", "HEAD"], true);
	if (restoredHead !== manifest.gitHead) throw new Error("Git 恢复后的 HEAD 与备份清单不一致");

	const archiveCount = readdirSync(join(restoredRepo, "content/archive")).filter((file) =>
		file.endsWith(".meta.json"),
	).length;
	const articleCount = readdirSync(join(restoredRepo, "content/articles")).filter((file) =>
		file.endsWith(".meta.json"),
	).length;
	if (
		archiveCount !== manifest.contentCounts.archives ||
		articleCount !== manifest.contentCounts.articles
	) {
		throw new Error("Git 恢复后的内容数量与备份清单不一致");
	}

	const persistence = join(drillDirectory, "d1-state");
	run("pnpm", [
		"exec",
		"wrangler",
		"d1",
		"execute",
		manifest.databaseName,
		"--local",
		`--persist-to=${persistence}`,
		`--file=${d1Path}`,
		"--yes",
	]);
	const restoredRowCounts = parseD1RowCounts(
		run(
			"pnpm",
			[
				"exec",
				"wrangler",
				"d1",
				"execute",
				manifest.databaseName,
				"--local",
				`--persist-to=${persistence}`,
				`--command=${d1RowCountQuery}`,
				"--json",
			],
			true,
		),
	);
	for (const table of d1BusinessTables) {
		if (restoredRowCounts[table] !== manifest.d1RowCounts?.[table]) {
			throw new Error(`D1 恢复后的 ${table} 行数与备份清单不一致`);
		}
	}

	console.log(
		JSON.stringify(
			{
				outcome: "passed",
				gitHead: restoredHead,
				contentCounts: { archives: archiveCount, articles: articleCount },
				databaseName: manifest.databaseName,
				d1RowCounts: restoredRowCounts,
				deferred: ["R2 media", "audio assets"],
			},
			null,
			2,
		),
	);
} finally {
	rmSync(drillDirectory, { recursive: true, force: true });
}
