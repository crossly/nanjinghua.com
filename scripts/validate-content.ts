import { access, readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { parseArchiveEntries, parseArticles, parseCollections } from "../src/content/schema.ts";

async function readMetadata(directory: string, requiresBody = true) {
	const fileNames = (await readdir(directory)).filter((fileName) =>
		fileName.endsWith(".meta.json"),
	);

	return Promise.all(
		fileNames.map(async (fileName) => {
			const metadataPath = join(directory, fileName);
			if (requiresBody) {
				const bodyPath = metadataPath.replace(/\.meta\.json$/, ".md");
				await access(bodyPath);
			}
			return JSON.parse(await readFile(metadataPath, "utf8")) as unknown;
		}),
	);
}

export async function validateContentDirectory(projectRoot = process.cwd()) {
	const contentRoot = join(resolve(projectRoot), "content");
	const archives = parseArchiveEntries(await readMetadata(join(contentRoot, "archive")));
	const articles = parseArticles(await readMetadata(join(contentRoot, "articles")));
	const collections = parseCollections(await readMetadata(join(contentRoot, "collections"), false));
	const archiveIds = new Set(archives.map((entry) => entry.id));
	const articleSlugs = new Set(articles.map((article) => article.slug));

	for (const article of articles) {
		for (const archiveId of article.archiveIds) {
			if (!archiveIds.has(archiveId)) {
				throw new Error(`专题文章 ${article.slug} 引用了不存在的档案编号 ${archiveId}`);
			}
		}
	}

	for (const collection of collections) {
		for (const articleSlug of collection.articleSlugs) {
			if (!articleSlugs.has(articleSlug)) {
				throw new Error(`专题集合 ${collection.slug} 引用了不存在的专题文章 ${articleSlug}`);
			}
		}
	}

	return {
		archives: archives.length,
		articles: articles.length,
		collections: collections.length,
	};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const result = await validateContentDirectory();
	console.log(
		`内容校验通过：${result.archives} 条档案，${result.articles} 篇专题，${result.collections} 个专题集合。`,
	);
}
