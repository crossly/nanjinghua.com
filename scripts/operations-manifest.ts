import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";
import type { BackupFileEncryption, backupEncryptionAlgorithm } from "./operations-crypto.ts";
import type { D1RowCounts } from "./operations-data.ts";

export const backupManifestAuthenticationAlgorithm = "hmac-sha256" as const;

export type BackupFileRecord = {
	name: string;
	bytes: number;
	sha256: string;
};

export type LegacyBackupManifest = {
	version: 1;
	createdAt?: string;
	gitHead: string;
	databaseName: string;
	contentCounts: { archives: number; articles: number };
	d1RowCounts?: Partial<D1RowCounts>;
	files: BackupFileRecord[];
	deferred?: string[];
};

export type EncryptedBackupFileRecord = BackupFileRecord & {
	plaintext: BackupFileRecord;
	encryption: BackupFileEncryption;
};

export type EncryptedBackupManifestPayload = {
	version: 2;
	createdAt: string;
	gitHead: string;
	databaseName: string;
	contentCounts: { archives: number; articles: number };
	d1RowCounts: D1RowCounts;
	encryption: {
		algorithm: typeof backupEncryptionAlgorithm;
		keyFingerprint: string;
	};
	files: EncryptedBackupFileRecord[];
	deferred: string[];
};

export type EncryptedBackupManifest = EncryptedBackupManifestPayload & {
	authentication: {
		algorithm: typeof backupManifestAuthenticationAlgorithm;
		tag: string;
	};
};

export type BackupManifest = LegacyBackupManifest | EncryptedBackupManifest;

function canonicalJson(value: unknown): string {
	if (value === null || typeof value === "boolean" || typeof value === "number") {
		return JSON.stringify(value);
	}
	if (typeof value === "string") return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
	if (typeof value === "object") {
		return `{${Object.entries(value)
			.filter(([, member]) => member !== undefined)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([name, member]) => `${JSON.stringify(name)}:${canonicalJson(member)}`)
			.join(",")}}`;
	}
	throw new Error("备份清单包含无法认证的数据类型");
}

function manifestAuthenticationKey(backupKey: Buffer): Buffer {
	return Buffer.from(
		hkdfSync(
			"sha256",
			backupKey,
			Buffer.from("nanjinghua.com backup manifest v2", "utf8"),
			Buffer.from("manifest authentication", "utf8"),
			32,
		),
	);
}

function authenticationTag(payload: EncryptedBackupManifestPayload, backupKey: Buffer): Buffer {
	const authenticationKey = manifestAuthenticationKey(backupKey);
	try {
		return createHmac("sha256", authenticationKey).update(canonicalJson(payload)).digest();
	} finally {
		authenticationKey.fill(0);
	}
}

export function authenticateBackupManifest(
	payload: EncryptedBackupManifestPayload,
	backupKey: Buffer,
): EncryptedBackupManifest {
	const authenticatedPayload = structuredClone(payload);
	return {
		...authenticatedPayload,
		authentication: {
			algorithm: backupManifestAuthenticationAlgorithm,
			tag: authenticationTag(authenticatedPayload, backupKey).toString("base64"),
		},
	};
}

export function verifyBackupManifestAuthentication(
	manifest: EncryptedBackupManifest,
	backupKey: Buffer,
): void {
	if (manifest.authentication?.algorithm !== backupManifestAuthenticationAlgorithm) {
		throw new Error("备份清单认证声明无效");
	}
	const suppliedTag = Buffer.from(manifest.authentication.tag, "base64");
	if (suppliedTag.length !== 32 || suppliedTag.toString("base64") !== manifest.authentication.tag) {
		throw new Error("备份清单认证标签无效");
	}
	const { authentication: _authentication, ...payload } = manifest;
	const expectedTag = authenticationTag(payload, backupKey);
	if (!timingSafeEqual(suppliedTag, expectedTag)) throw new Error("备份清单认证失败");
}
