import {
	chmodSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
	backupEncryptionAlgorithm,
	backupKeyEnvironmentVariable,
	backupKeyFingerprint,
	backupKeyFromEnvironment,
	encryptBackupFile,
} from "./operations-crypto.ts";
import { type D1RowCounts, operationDirectoryArgument } from "./operations-data.ts";
import {
	authenticateBackupManifest,
	type EncryptedBackupManifestPayload,
} from "./operations-manifest.ts";
import { countContent, digestFile, restoreD1Snapshot, runCommand } from "./operations-runtime.ts";

const databaseName = "nanjinghua-submissions";

if (process.argv.includes("--help")) {
	console.log(
		"用法：NANJINGHUA_BACKUP_KEY=<32-byte-base64-key> pnpm ops:backup -- /独立备份目录/时间戳",
	);
	process.exit(0);
}

const destinationArgument = operationDirectoryArgument(process.argv.slice(2));
if (!destinationArgument) throw new Error("必须提供备份目标目录；不得把含线索的 D1 导出写入 Git");

const backupKey = backupKeyFromEnvironment();
delete process.env[backupKeyEnvironmentVariable];
const keyFingerprint = backupKeyFingerprint(backupKey);

try {
	const dirty = runCommand("git", ["status", "--porcelain"], true);
	if (dirty) throw new Error("工作区不干净；请先提交或移走变更再创建可重放备份");

	process.umask(0o077);
	const destination = resolve(destinationArgument);
	if (existsSync(destination) && readdirSync(destination).length > 0) {
		throw new Error(`备份目标不是空目录：${destination}`);
	}
	mkdirSync(destination, { recursive: true, mode: 0o700 });

	const generatedPaths = [
		join(destination, "content.git.bundle.enc"),
		join(destination, "submissions.sql.enc"),
		join(destination, "manifest.json"),
	];
	const workingDirectory = mkdtempSync(join(tmpdir(), "nanjinghua-backup-"));
	let completed = false;
	try {
		const bundlePath = join(workingDirectory, "content.git.bundle");
		const d1Path = join(workingDirectory, "submissions.sql");
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

		const verificationPersistence = join(workingDirectory, ".d1-verification");
		let d1RowCounts: D1RowCounts;
		try {
			d1RowCounts = restoreD1Snapshot(databaseName, verificationPersistence, d1Path);
		} finally {
			rmSync(verificationPersistence, { recursive: true, force: true });
		}

		const files = [];
		for (const { plaintextPath, plaintextName } of [
			{ plaintextPath: bundlePath, plaintextName: "content.git.bundle" },
			{ plaintextPath: d1Path, plaintextName: "submissions.sql" },
		]) {
			const name = `${plaintextName}.enc`;
			const encryptedPath = join(destination, name);
			const encryption = await encryptBackupFile(plaintextPath, encryptedPath, backupKey);
			files.push({
				name,
				bytes: statSync(encryptedPath).size,
				sha256: digestFile(encryptedPath),
				plaintext: {
					name: plaintextName,
					bytes: statSync(plaintextPath).size,
					sha256: digestFile(plaintextPath),
				},
				encryption,
			});
		}
		const manifestPayload: EncryptedBackupManifestPayload = {
			version: 2,
			createdAt: new Date().toISOString(),
			gitHead,
			databaseName,
			contentCounts,
			d1RowCounts,
			encryption: {
				algorithm: backupEncryptionAlgorithm,
				keyFingerprint,
			},
			files,
			deferred: ["R2 media", "audio assets"],
		};
		const manifest = authenticateBackupManifest(manifestPayload, backupKey);
		const manifestPath = resolve(destination, "manifest.json");
		writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
		chmodSync(manifestPath, 0o600);
		completed = true;

		console.log(`加密备份完成：${destination}`);
		console.log(`Git ${gitHead}；D1 ${databaseName}；R2/媒体未包含。`);
	} finally {
		rmSync(workingDirectory, { recursive: true, force: true });
		if (!completed) {
			for (const path of generatedPaths) rmSync(path, { force: true });
		}
	}
} finally {
	backupKey.fill(0);
}
