import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, rename, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";

import { buildArchiveExports } from "./build-archive-exports.ts";
import { prepareReadonlyStatic } from "./prepare-readonly-static.ts";

type Snapshot = {
	path: string;
	backup: string;
	existed: boolean;
};

async function exists(path: string): Promise<boolean> {
	try {
		await stat(path);
		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
		throw error;
	}
}

async function snapshot(path: string, backupRoot: string): Promise<Snapshot> {
	const backup = join(backupRoot, basename(path));
	const existed = await exists(path);
	if (existed) await cp(path, backup, { recursive: true });
	return { path, backup, existed };
}

async function restore(saved: Snapshot): Promise<void> {
	await rm(saved.path, { recursive: true, force: true });
	if (!saved.existed) return;
	await mkdir(dirname(saved.path), { recursive: true });
	await cp(saved.backup, saved.path, { recursive: true });
}

async function run(command: string, args: string[], cwd: string): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		const child = spawn(command, args, { cwd, stdio: "inherit" });
		child.once("error", reject);
		child.once("exit", (code, signal) => {
			if (code === 0) resolve();
			else reject(new Error(`${command} ${args.join(" ")} 失败（${signal ?? `exit ${code}`}）`));
		});
	});
}

async function buildReadonlyStatic(projectRoot = process.cwd()): Promise<void> {
	const temporaryRoot = await mkdtemp(join(tmpdir(), "nanjinghua-readonly-build-"));
	const originalRoot = join(temporaryRoot, "original");
	const generatedRoot = join(temporaryRoot, "generated");
	await mkdir(originalRoot, { recursive: true });

	const snapshots = [
		await snapshot(join(projectRoot, "dist"), originalRoot),
		await snapshot(join(projectRoot, ".wrangler", "deploy"), originalRoot),
	];
	const finalDirectory = join(projectRoot, "dist", "readonly-static");
	const stagingDirectory = join(projectRoot, "dist", ".readonly-static-next");

	try {
		try {
			await run("pnpm", ["run", "validate:content"], projectRoot);
			await run("pnpm", ["run", "build:sitemap"], projectRoot);
			await run("pnpm", ["exec", "vite", "build", "--mode", "readonly-static"], projectRoot);
			await buildArchiveExports(projectRoot);
			await prepareReadonlyStatic(projectRoot, join(projectRoot, "dist", "client"), generatedRoot);
		} finally {
			for (const saved of snapshots) await restore(saved);
		}

		await mkdir(dirname(finalDirectory), { recursive: true });
		await rm(stagingDirectory, { recursive: true, force: true });
		await cp(generatedRoot, stagingDirectory, { recursive: true });
		await rm(finalDirectory, { recursive: true, force: true });
		await rename(stagingDirectory, finalDirectory);
		console.log(`隔离的只读静态产物已生成：${finalDirectory}`);
	} finally {
		await rm(stagingDirectory, { recursive: true, force: true });
		await rm(temporaryRoot, { recursive: true, force: true });
	}
}

await buildReadonlyStatic();
