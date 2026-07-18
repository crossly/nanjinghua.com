import {
	existsSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import {
	backupEncryptionAlgorithm,
	backupKeyEnvironmentVariable,
	backupKeyFingerprint,
	backupKeyFromEnvironment,
	decryptBackupFile,
} from "./operations-crypto.ts";
import { d1BusinessTables, operationDirectoryArgument } from "./operations-data.ts";
import {
	type BackupFileRecord,
	type BackupManifest,
	verifyBackupManifestAuthentication,
} from "./operations-manifest.ts";
import { countContent, digestFile, restoreD1Snapshot, runCommand } from "./operations-runtime.ts";

function backupMemberPath(directory: string, name: string): string {
	const root = resolve(directory);
	const path = resolve(root, name);
	if (name !== basename(name) || !path.startsWith(`${root}${sep}`)) {
		throw new Error(`备份清单包含越界路径：${name}`);
	}
	return path;
}

function requireExpectedPayload(paths: Map<string, string>, name: string): string {
	const path = paths.get(name);
	if (!path) throw new Error(`备份清单缺少 ${name}`);
	return path;
}

function assertValidFileRecord(file: BackupFileRecord): void {
	if (
		!file.name ||
		!Number.isInteger(file.bytes) ||
		file.bytes < 0 ||
		!/^[a-f0-9]{64}$/.test(file.sha256)
	) {
		throw new Error("备份清单包含无效文件记录");
	}
}

if (process.argv.includes("--help")) {
	console.log(
		"用法：NANJINGHUA_BACKUP_KEY=<32-byte-base64-key> pnpm ops:restore-drill -- /备份目录",
	);
	process.exit(0);
}

process.umask(0o077);
const backupArgument = operationDirectoryArgument(process.argv.slice(2));
if (!backupArgument) throw new Error("必须提供包含 manifest.json 的备份目录");
const backupDirectory = resolve(backupArgument);
const manifestPath = join(backupDirectory, "manifest.json");
if (!existsSync(manifestPath)) throw new Error("备份目录缺少 manifest.json");
const parsedManifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { version?: unknown };
if (parsedManifest.version !== 1 && parsedManifest.version !== 2) {
	throw new Error(`不支持的备份版本：${String(parsedManifest.version)}`);
}
const manifest = parsedManifest as BackupManifest;
for (const table of d1BusinessTables) {
	if (
		!Number.isInteger(manifest.d1RowCounts?.[table]) ||
		Number(manifest.d1RowCounts?.[table]) < 0
	) {
		throw new Error(`备份清单缺少有效 D1 行数：${table}`);
	}
}

for (const file of manifest.files) {
	assertValidFileRecord(file);
	const path = backupMemberPath(backupDirectory, file.name);
	if (!existsSync(path)) throw new Error(`备份缺少 ${file.name}`);
	if (!lstatSync(path).isFile()) throw new Error(`${file.name} 不是普通文件`);
	if (statSync(path).size !== file.bytes) throw new Error(`${file.name} 文件大小不匹配`);
	if (digestFile(path) !== file.sha256) throw new Error(`${file.name} 校验值不匹配`);
}

const drillDirectory = mkdtempSync(join(tmpdir(), "nanjinghua-restore-"));

try {
	let bundlePath: string;
	let d1Path: string;
	if (manifest.version === 1) {
		const payloads = new Map(
			manifest.files.map((file) => [file.name, backupMemberPath(backupDirectory, file.name)]),
		);
		bundlePath = requireExpectedPayload(payloads, "content.git.bundle");
		d1Path = requireExpectedPayload(payloads, "submissions.sql");
	} else {
		if (
			manifest.encryption.algorithm !== backupEncryptionAlgorithm ||
			!/^[a-f0-9]{16}$/.test(manifest.encryption.keyFingerprint)
		) {
			throw new Error("备份清单包含无效加密声明");
		}
		const decryptedDirectory = join(drillDirectory, "decrypted");
		mkdirSync(decryptedDirectory, { mode: 0o700 });
		const payloads = new Map<string, string>();
		const backupKey = backupKeyFromEnvironment();
		delete process.env[backupKeyEnvironmentVariable];
		try {
			if (backupKeyFingerprint(backupKey) !== manifest.encryption.keyFingerprint) {
				throw new Error("备份密钥指纹与清单不匹配");
			}
			verifyBackupManifestAuthentication(manifest, backupKey);

			for (const file of manifest.files) {
				assertValidFileRecord(file.plaintext);
				const encryptedPath = backupMemberPath(backupDirectory, file.name);
				const plaintextPath = backupMemberPath(decryptedDirectory, file.plaintext.name);
				try {
					await decryptBackupFile(encryptedPath, plaintextPath, backupKey, file.encryption);
				} catch (error) {
					throw new Error(`${file.name} 无法认证解密；密钥错误或密文已损坏`, {
						cause: error,
					});
				}
				if (statSync(plaintextPath).size !== file.plaintext.bytes) {
					throw new Error(`${file.plaintext.name} 解密后文件大小不匹配`);
				}
				if (digestFile(plaintextPath) !== file.plaintext.sha256) {
					throw new Error(`${file.plaintext.name} 解密后校验值不匹配`);
				}
				if (payloads.has(file.plaintext.name)) {
					throw new Error(`备份清单重复声明 ${file.plaintext.name}`);
				}
				payloads.set(file.plaintext.name, plaintextPath);
			}
		} finally {
			backupKey.fill(0);
		}
		bundlePath = requireExpectedPayload(payloads, "content.git.bundle");
		d1Path = requireExpectedPayload(payloads, "submissions.sql");
	}

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
