import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { toPrivacyDeletionEntry, toPublicArchiveEntry } from "../src/content/publication.ts";
import { parseArchiveEntries, parseArchiveIdentifierRegistry } from "../src/content/schema.ts";
import { toArchiveExport } from "../src/content/structured-data.ts";

export async function buildArchiveExports(
	projectRoot = process.cwd(),
	outputDirectory = join(projectRoot, "dist", "client", "exports"),
) {
	const root = resolve(projectRoot);
	const archiveDirectory = join(root, "content", "archive");
	const metadataFiles = (await readdir(archiveDirectory))
		.filter((fileName) => fileName.endsWith(".meta.json"))
		.sort();
	const metadata = parseArchiveEntries(
		await Promise.all(
			metadataFiles.map(async (fileName) =>
				JSON.parse(await readFile(join(archiveDirectory, fileName), "utf8")),
			),
		),
	);
	const publicEntries = await Promise.all(
		metadata.map(async (entry) =>
			toPublicArchiveEntry({
				...entry,
				body:
					entry.publicationStatus === "公开"
						? await readFile(join(archiveDirectory, `${entry.id}.md`), "utf8")
						: "",
			}),
		),
	);

	const knownIds = new Set(publicEntries.map((entry) => entry.id));
	const identifierRegistry = parseArchiveIdentifierRegistry(
		JSON.parse(await readFile(join(root, "content", "archive-identifiers.json"), "utf8")),
	);
	for (const record of identifierRegistry.identifiers) {
		if (record.status === "隐私删除" && record.statusChangedAt && !knownIds.has(record.id)) {
			publicEntries.push(
				toPrivacyDeletionEntry(record.id, record.assignedAt, record.statusChangedAt),
			);
		}
	}

	const output = resolve(outputDirectory);
	await rm(output, { recursive: true, force: true });
	await mkdir(output, { recursive: true });
	for (const entry of publicEntries.sort((left, right) => left.id.localeCompare(right.id))) {
		await writeFile(
			join(output, `${entry.id}.json`),
			`${JSON.stringify(toArchiveExport(entry), null, 2)}\n`,
			"utf8",
		);
	}
	return publicEntries;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const entries = await buildArchiveExports();
	console.log(`静态档案导出已生成：${entries.length} 条。`);
}
