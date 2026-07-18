import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
	type D1BusinessTable,
	d1BusinessTables,
	operationDirectoryArgument,
} from "./operations-data.ts";
import { countContent, digestFile, restoreD1Snapshot, runCommand } from "./operations-runtime.ts";

type Manifest = {
	version: number;
	gitHead: string;
	databaseName: string;
	contentCounts: { archives: number; articles: number };
	d1RowCounts?: Partial<Record<D1BusinessTable, number>>;
	files: Array<{ name: string; bytes: number; sha256: string }>;
};

if (process.argv.includes("--help")) {
	console.log("用法：pnpm ops:restore-drill -- /备份目录");
	process.exit(0);
}

process.umask(0o077);
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
	if (digestFile(path) !== file.sha256) throw new Error(`${file.name} 校验值不匹配`);
}

const bundlePath = join(backupDirectory, "content.git.bundle");
const d1Path = join(backupDirectory, "submissions.sql");
const drillDirectory = mkdtempSync(join(tmpdir(), "nanjinghua-restore-"));

try {
	const restoredRepo = join(drillDirectory, "repo");
	runCommand("git", ["bundle", "verify", bundlePath]);
	runCommand("git", ["clone", "--quiet", bundlePath, restoredRepo]);
	const restoredHead = runCommand("git", ["-C", restoredRepo, "rev-parse", "HEAD"], true);
	if (restoredHead !== manifest.gitHead) throw new Error("Git 恢复后的 HEAD 与备份清单不一致");

	const contentCounts = countContent(restoredRepo);
	if (
		contentCounts.archives !== manifest.contentCounts.archives ||
		contentCounts.articles !== manifest.contentCounts.articles
	) {
		throw new Error("Git 恢复后的内容数量与备份清单不一致");
	}

	const persistence = join(drillDirectory, "d1-state");
	const restoredRowCounts = restoreD1Snapshot(manifest.databaseName, persistence, d1Path);
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
				contentCounts,
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
