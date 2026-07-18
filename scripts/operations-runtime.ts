import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type D1RowCounts, d1RowCountQuery, parseD1RowCounts } from "./operations-data.ts";

export function runCommand(command: string, args: string[], capture = false): string {
	const result = spawnSync(command, args, {
		cwd: process.cwd(),
		encoding: "utf8",
		stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
	});
	if (result.error) throw result.error;
	if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} 执行失败`);
	return capture ? result.stdout.trim() : "";
}

export function digestFile(path: string): string {
	return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function countContent(root: string): { archives: number; articles: number } {
	return {
		archives: readdirSync(join(root, "content/archive")).filter((file) =>
			file.endsWith(".meta.json"),
		).length,
		articles: readdirSync(join(root, "content/articles")).filter((file) =>
			file.endsWith(".meta.json"),
		).length,
	};
}

export function restoreD1Snapshot(
	databaseName: string,
	persistence: string,
	d1Path: string,
): D1RowCounts {
	runCommand("pnpm", [
		"exec",
		"wrangler",
		"d1",
		"execute",
		databaseName,
		"--local",
		`--persist-to=${persistence}`,
		`--file=${d1Path}`,
		"--yes",
	]);
	return parseD1RowCounts(
		runCommand(
			"pnpm",
			[
				"exec",
				"wrangler",
				"d1",
				"execute",
				databaseName,
				"--local",
				`--persist-to=${persistence}`,
				`--command=${d1RowCountQuery}`,
				"--json",
			],
			true,
		),
	);
}
