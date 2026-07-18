import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	chmodSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import {
	type D1RowCounts,
	d1RowCountQuery,
	operationDirectoryArgument,
	parseD1RowCounts,
} from "./operations-data.ts";

const databaseName = "nanjinghua-submissions";

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
	console.log("用法：pnpm ops:backup -- /受限且加密的备份目录/时间戳");
	process.exit(0);
}

const destinationArgument = operationDirectoryArgument(process.argv.slice(2));
if (!destinationArgument) throw new Error("必须提供备份目标目录；不得把含线索的 D1 导出写入 Git");

const dirty = run("git", ["status", "--porcelain"], true);
if (dirty) throw new Error("工作区不干净；请先提交或移走变更再创建可重放备份");

process.umask(0o077);
const destination = resolve(destinationArgument);
if (existsSync(destination) && readdirSync(destination).length > 0) {
	throw new Error(`备份目标不是空目录：${destination}`);
}
mkdirSync(destination, { recursive: true, mode: 0o700 });

const bundlePath = resolve(destination, "content.git.bundle");
const d1Path = resolve(destination, "submissions.sql");
const gitHead = run("git", ["rev-parse", "HEAD"], true);
const archiveCount = readdirSync("content/archive").filter((file) =>
	file.endsWith(".meta.json"),
).length;
const articleCount = readdirSync("content/articles").filter((file) =>
	file.endsWith(".meta.json"),
).length;

run("git", ["bundle", "create", bundlePath, "HEAD", "--branches", "--tags"]);
run("pnpm", [
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
	run("pnpm", [
		"exec",
		"wrangler",
		"d1",
		"execute",
		databaseName,
		"--local",
		`--persist-to=${verificationPersistence}`,
		`--file=${d1Path}`,
		"--yes",
	]);
	d1RowCounts = parseD1RowCounts(
		run(
			"pnpm",
			[
				"exec",
				"wrangler",
				"d1",
				"execute",
				databaseName,
				"--local",
				`--persist-to=${verificationPersistence}`,
				`--command=${d1RowCountQuery}`,
				"--json",
			],
			true,
		),
	);
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
	contentCounts: { archives: archiveCount, articles: articleCount },
	d1RowCounts,
	files: [bundlePath, d1Path].map((path) => ({
		name: path.slice(destination.length + 1),
		bytes: statSync(path).size,
		sha256: digest(path),
	})),
	deferred: ["R2 media", "audio assets"],
};
const manifestPath = resolve(destination, "manifest.json");
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });

console.log(`备份完成：${destination}`);
console.log(`Git ${gitHead}；D1 ${databaseName}；R2/媒体未包含。`);
