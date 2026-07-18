import { execFile } from "node:child_process";
import { access, readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
	parseArchiveEntries,
	parseArchiveIdentifierRegistry,
	parseArticles,
	parseCollections,
	validateArchiveIdentifierRegistryAppendOnly,
	validateArchiveIdentifiers,
} from "../src/content/schema.ts";

const executeFile = promisify(execFile);

async function readPriorIdentifierRegistries(projectRoot: string) {
	const refs = ["HEAD", process.env.ARCHIVE_IDENTIFIER_BASE_REF].filter((ref): ref is string =>
		Boolean(ref),
	);
	const commits = new Set<string>();

	for (const ref of refs) {
		try {
			const { stdout } = await executeFile(
				"git",
				["log", "--format=%H", ref, "--", "content/archive-identifiers.json"],
				{ cwd: projectRoot },
			);
			for (const commit of stdout.split("\n").filter(Boolean)) commits.add(commit);
		} catch (error) {
			if (ref === process.env.ARCHIVE_IDENTIFIER_BASE_REF) throw error;
			return [];
		}
	}

	return Promise.all(
		[...commits].map(async (commit) => {
			const { stdout } = await executeFile(
				"git",
				["show", `${commit}:content/archive-identifiers.json`],
				{ cwd: projectRoot },
			);
			return parseArchiveIdentifierRegistry(JSON.parse(stdout) as unknown);
		}),
	);
}

async function readMetadata(directory: string, requiresBody = true) {
	const directoryFileNames = await readdir(directory);
	const fileNames = directoryFileNames.filter((fileName) => fileName.endsWith(".meta.json"));
	const metadataBaseNames = new Set(
		fileNames.map((fileName) => fileName.replace(/\.meta\.json$/, "")),
	);
	if (requiresBody) {
		for (const bodyFileName of directoryFileNames.filter((fileName) => fileName.endsWith(".md"))) {
			const bodyBaseName = bodyFileName.replace(/\.md$/, "");
			if (!metadataBaseNames.has(bodyBaseName)) {
				throw new Error(`正文缺少对应内容元数据：${join(directory, bodyFileName)}`);
			}
		}
	}

	return Promise.all(
		fileNames.map(async (fileName) => {
			const metadataPath = join(directory, fileName);
			const metadata = JSON.parse(await readFile(metadataPath, "utf8")) as unknown;
			const bodyPath = metadataPath.replace(/\.meta\.json$/, ".md");
			const bodyFileName = fileName.replace(/\.meta\.json$/, ".md");
			const bodyExists = directoryFileNames.includes(bodyFileName);
			if (
				requiresBody &&
				(!metadata ||
					typeof metadata !== "object" ||
					!("publicationStatus" in metadata) ||
					metadata.publicationStatus === "公开")
			) {
				await access(bodyPath);
			}
			if (
				requiresBody &&
				metadata &&
				typeof metadata === "object" &&
				"publicationStatus" in metadata &&
				metadata.publicationStatus === "目录占位" &&
				bodyExists
			) {
				throw new Error(`目录占位不能保留公开正文：${bodyPath}`);
			}
			return metadata;
		}),
	);
}

export async function validateContentDirectory(
	projectRoot = process.cwd(),
	options: { enforceLaunchArchiveCount?: boolean } = {},
) {
	const resolvedProjectRoot = resolve(projectRoot);
	const contentRoot = join(resolvedProjectRoot, "content");
	const archives = parseArchiveEntries(await readMetadata(join(contentRoot, "archive")));
	const identifierRegistry = parseArchiveIdentifierRegistry(
		JSON.parse(await readFile(join(contentRoot, "archive-identifiers.json"), "utf8")),
	);
	for (const priorRegistry of await readPriorIdentifierRegistries(projectRoot)) {
		validateArchiveIdentifierRegistryAppendOnly(priorRegistry, identifierRegistry);
	}
	const articles = parseArticles(await readMetadata(join(contentRoot, "articles")));
	const collections = parseCollections(await readMetadata(join(contentRoot, "collections"), false));
	const archiveIds = new Set(archives.map((entry) => entry.id));
	const articleSlugs = new Set(articles.map((article) => article.slug));
	validateArchiveIdentifiers(archives, identifierRegistry);
	const publicArchiveCount = archives.filter((entry) => entry.publicationStatus === "公开").length;
	const enforceLaunchArchiveCount =
		options.enforceLaunchArchiveCount ?? resolvedProjectRoot === resolve(process.cwd());
	if (enforceLaunchArchiveCount && (publicArchiveCount < 20 || publicArchiveCount > 30)) {
		throw new Error(`首发正式档案必须为 20 至 30 条，当前为 ${publicArchiveCount} 条`);
	}

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
