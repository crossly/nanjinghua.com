import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { chmodSync, createReadStream, createWriteStream, rmSync } from "node:fs";
import { pipeline } from "node:stream/promises";

export const backupEncryptionAlgorithm = "aes-256-gcm" as const;
export const backupKeyEnvironmentVariable = "NANJINGHUA_BACKUP_KEY";

export type BackupFileEncryption = {
	algorithm: typeof backupEncryptionAlgorithm;
	initializationVector: string;
	authenticationTag: string;
};

function decodeBase64(value: string, label: string): Buffer {
	const normalized = value.trim();
	const decoded = Buffer.from(normalized, "base64");
	if (decoded.toString("base64").replace(/=+$/, "") !== normalized.replace(/=+$/, "")) {
		throw new Error(`${label} 不是有效 Base64`);
	}
	return decoded;
}

export function backupKeyFromEnvironment(environment: NodeJS.ProcessEnv = process.env): Buffer {
	const encodedKey = environment[backupKeyEnvironmentVariable];
	if (!encodedKey)
		throw new Error(`必须通过 ${backupKeyEnvironmentVariable} 提供独立保管的备份密钥`);
	const key = decodeBase64(encodedKey, backupKeyEnvironmentVariable);
	if (key.length !== 32)
		throw new Error(`${backupKeyEnvironmentVariable} 解码后必须正好为 32 bytes`);
	return key;
}

export function backupKeyFingerprint(key: Buffer): string {
	return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

export async function encryptBackupFile(
	plaintextPath: string,
	encryptedPath: string,
	key: Buffer,
): Promise<BackupFileEncryption> {
	const initializationVector = randomBytes(12);
	const cipher = createCipheriv(backupEncryptionAlgorithm, key, initializationVector);
	try {
		await pipeline(
			createReadStream(plaintextPath),
			cipher,
			createWriteStream(encryptedPath, { mode: 0o600 }),
		);
		chmodSync(encryptedPath, 0o600);
	} catch (error) {
		rmSync(encryptedPath, { force: true });
		throw error;
	}
	return {
		algorithm: backupEncryptionAlgorithm,
		initializationVector: initializationVector.toString("base64"),
		authenticationTag: cipher.getAuthTag().toString("base64"),
	};
}

export async function decryptBackupFile(
	encryptedPath: string,
	plaintextPath: string,
	key: Buffer,
	encryption: BackupFileEncryption,
): Promise<void> {
	if (encryption.algorithm !== backupEncryptionAlgorithm) {
		throw new Error(`不支持的备份加密算法：${String(encryption.algorithm)}`);
	}
	const initializationVector = decodeBase64(encryption.initializationVector, "初始化向量");
	const authenticationTag = decodeBase64(encryption.authenticationTag, "认证标签");
	if (initializationVector.length !== 12) throw new Error("备份初始化向量长度无效");
	if (authenticationTag.length !== 16) throw new Error("备份认证标签长度无效");

	const decipher = createDecipheriv(backupEncryptionAlgorithm, key, initializationVector);
	decipher.setAuthTag(authenticationTag);
	try {
		await pipeline(
			createReadStream(encryptedPath),
			decipher,
			createWriteStream(plaintextPath, { mode: 0o600 }),
		);
		chmodSync(plaintextPath, 0o600);
	} catch (error) {
		rmSync(plaintextPath, { force: true });
		throw error;
	}
}
