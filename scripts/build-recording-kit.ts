import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { zipSync } from "fflate";

const sourceDirectory = path.resolve("docs/recording-kit");
const outputDirectory = path.resolve("public/downloads");
const archiveName = "nanjinghua-recording-kit-v1.0.0.zip";
const archiveRoot = "nanjinghua-recording-kit";
const stableTimestamp = new Date("2026-07-17T00:00:00Z");

async function listFiles(directory: string, prefix = ""): Promise<string[]> {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = await Promise.all(
		entries.map(async (entry) => {
			const relativePath = path.posix.join(prefix, entry.name);
			return entry.isDirectory()
				? listFiles(path.join(directory, entry.name), relativePath)
				: [relativePath];
		}),
	);
	return files.flat().sort();
}

const archiveEntries: Record<string, [Uint8Array, { mtime: Date }]> = {};
for (const relativePath of await listFiles(sourceDirectory)) {
	archiveEntries[`${archiveRoot}/${relativePath}`] = [
		await readFile(path.join(sourceDirectory, relativePath)),
		{ mtime: stableTimestamp },
	];
}

const archive = zipSync(archiveEntries, { level: 9 });
const archiveHash = createHash("sha256").update(archive).digest("hex");

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
	writeFile(path.join(outputDirectory, archiveName), archive),
	writeFile(
		path.join(outputDirectory, `${archiveName}.sha256`),
		`${archiveHash}  ${archiveName}\n`,
	),
]);

console.log(`采集包已生成：${archiveName}（${archive.length} bytes，SHA-256 ${archiveHash}）`);
