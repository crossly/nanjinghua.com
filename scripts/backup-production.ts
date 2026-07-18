import {
	chmodSync,
	existsSync,
	mkdirSync,
	readdirSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { type D1RowCounts, operationDirectoryArgument } from "./operations-data.ts";
import { countContent, digestFile, restoreD1Snapshot, runCommand } from "./operations-runtime.ts";

const databaseName = "nanjinghua-submissions";

if (process.argv.includes("--help")) {
	console.log("用法：pnpm ops:backup -- /受限且加密的备份目录/时间戳");
	process.exit(0);
}

const destinationArgument = operationDirectoryArgument(process.argv.slice(2));
if (!destinationArgument) throw new Error("必须提供备份目标目录；不得把含线索的 D1 导出写入 Git");

const dirty = runCommand("git", ["status", "--porcelain"], true);
if (dirty) throw new Error("工作区不干净；请先提交或移走变更再创建可重放备份");

process.umask(0o077);
const destination = resolve(destinationArgument);
if (existsSync(destination) && readdirSync(destination).length > 0) {
	throw new Error(`备份目标不是空目录：${destination}`);
}
mkdirSync(destination, { recursive: true, mode: 0o700 });

const bundlePath = resolve(destination, "content.git.bundle");
const d1Path = resolve(destination, "submissions.sql");
const gitHead = runCommand("git", ["rev-parse", "HEAD"], true);
const contentCounts = countContent(process.cwd());

runCommand("git", ["bundle", "create", bundlePath, "HEAD", "--branches", "--tags"]);
runCommand("pnpm", [
	"exec",
	"wrangler",
	"d1",
	"export",
	databaseName,
	"--remote",
	`--output=${d1Path}`,
	"--skip-confirmation",
]);

const verificationPersistence = resolve(destination, ".d1-verification");
let d1RowCounts: D1RowCounts;
try {
	d1RowCounts = restoreD1Snapshot(databaseName, verificationPersistence, d1Path);
} finally {
	rmSync(verificationPersistence, { recursive: true, force: true });
}

chmodSync(bundlePath, 0o600);
chmodSync(d1Path, 0o600);
const manifest = {
	version: 1,
	createdAt: new Date().toISOString(),
	gitHead,
	databaseName,
	contentCounts,
	d1RowCounts,
	files: [bundlePath, d1Path].map((path) => ({
		name: path.slice(destination.length + 1),
		bytes: statSync(path).size,
		sha256: digestFile(path),
	})),
	deferred: ["R2 media", "audio assets"],
};
const manifestPath = resolve(destination, "manifest.json");
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });

console.log(`备份完成：${destination}`);
console.log(`Git ${gitHead}；D1 ${databaseName}；R2/媒体未包含。`);
