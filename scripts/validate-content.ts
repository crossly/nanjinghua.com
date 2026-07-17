import { access, readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { parseArchiveEntries, parseArticles } from "../src/content/schema.ts";

async function readMetadata(directory: string) {
	const fileNames = (await readdir(directory)).filter((fileName) =>
		fileName.endsWith(".meta.json"),
	);

	return Promise.all(
		fileNames.map(async (fileName) => {
			const metadataPath = join(directory, fileName);
			const bodyPath = metadataPath.replace(/\.meta\.json$/, ".md");
			await access(bodyPath);
			return JSON.parse(await readFile(metadataPath, "utf8")) as unknown;
		}),
	);
}

export async function validateContentDirectory(projectRoot = process.cwd()) {
	const contentRoot = join(resolve(projectRoot), "content");
	const archives = parseArchiveEntries(await readMetadata(join(contentRoot, "archive")));
	const articles = parseArticles(await readMetadata(join(contentRoot, "articles")));
	const archiveIds = new Set(archives.map((entry) => entry.id));

	for (const article of articles) {
		for (const archiveId of article.archiveIds) {
			if (!archiveIds.has(archiveId)) {
				throw new Error(`专题文章 ${article.slug} 引用了不存在的档案编号 ${archiveId}`);
			}
		}
	}

	return { archives: archives.length, articles: articles.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const result = await validateContentDirectory();
	console.log(`内容校验通过：${result.archives} 条档案，${result.articles} 篇专题。`);
}
