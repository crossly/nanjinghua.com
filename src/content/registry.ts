import {
	type ArchiveEntryMetadata,
	type ArticleMetadata,
	type CollectionMetadata,
	parseArchiveEntries,
	parseArticles,
	parseCollections,
} from "./schema";

export type ArchiveEntry = ArchiveEntryMetadata & { body: string };
export type Article = ArticleMetadata & { body: string };
export type Collection = CollectionMetadata;

const archiveMetadataModules = import.meta.glob("/content/archive/*.meta.json", {
	eager: true,
	import: "default",
}) as Record<string, unknown>;
const archiveBodyModules = import.meta.glob("/content/archive/*.md", {
	eager: true,
	query: "?raw",
	import: "default",
}) as Record<string, string>;
const articleMetadataModules = import.meta.glob("/content/articles/*.meta.json", {
	eager: true,
	import: "default",
}) as Record<string, unknown>;
const articleBodyModules = import.meta.glob("/content/articles/*.md", {
	eager: true,
	query: "?raw",
	import: "default",
}) as Record<string, string>;
const collectionMetadataModules = import.meta.glob("/content/collections/*.meta.json", {
	eager: true,
	import: "default",
}) as Record<string, unknown>;

function contentBodyFor(metadataPath: string, bodies: Record<string, string>): string {
	const bodyPath = metadataPath.replace(/\.meta\.json$/, ".md");
	const body = bodies[bodyPath];

	if (!body) {
		throw new Error(`内容元数据缺少对应 Markdown 正文：${metadataPath}`);
	}

	return body;
}

const archiveMetadata = parseArchiveEntries(Object.values(archiveMetadataModules));
const archiveBodyById = new Map(
	Object.entries(archiveMetadataModules).map(([path, metadata]) => {
		const parsed = parseArchiveEntries([metadata])[0];
		if (!parsed) throw new Error(`无法解析档案元数据：${path}`);
		return [parsed.id, contentBodyFor(path, archiveBodyModules)];
	}),
);

export const archiveEntries: ArchiveEntry[] = archiveMetadata.map((metadata) => ({
	...metadata,
	body: archiveBodyById.get(metadata.id) ?? "",
}));

const articleMetadata = parseArticles(Object.values(articleMetadataModules));
const articleBodyBySlug = new Map(
	Object.entries(articleMetadataModules).map(([path, metadata]) => {
		const parsed = parseArticles([metadata])[0];
		if (!parsed) throw new Error(`无法解析专题文章元数据：${path}`);
		return [parsed.slug, contentBodyFor(path, articleBodyModules)];
	}),
);
const archiveIds = new Set(archiveEntries.map((entry) => entry.id));

export const articles: Article[] = articleMetadata.map((metadata) => {
	for (const archiveId of metadata.archiveIds) {
		if (!archiveIds.has(archiveId)) {
			throw new Error(`专题文章 ${metadata.slug} 引用了不存在的档案编号 ${archiveId}`);
		}
	}

	return {
		...metadata,
		body: articleBodyBySlug.get(metadata.slug) ?? "",
	};
});

export const collections: Collection[] = parseCollections(Object.values(collectionMetadataModules));
const articleSlugs = new Set(articles.map((article) => article.slug));

for (const collection of collections) {
	for (const articleSlug of collection.articleSlugs) {
		if (!articleSlugs.has(articleSlug)) {
			throw new Error(`专题集合 ${collection.slug} 引用了不存在的专题文章 ${articleSlug}`);
		}
	}
}

export function getArchiveEntry(id: string): ArchiveEntry | undefined {
	return archiveEntries.find((entry) => entry.id === id);
}

export function getPrimaryCitation(entry: ArchiveEntry) {
	const citation = entry.citations.find((candidate) => candidate.role === "主要来源");
	if (!citation) throw new Error(`档案条目 ${entry.id} 缺少主要来源`);
	return citation;
}

export function getArticle(slug: string): Article | undefined {
	return articles.find((article) => article.slug === slug);
}

export function getCollection(slug: string): Collection | undefined {
	return collections.find((collection) => collection.slug === slug);
}

export function getArticlesForCollection(collection: Collection): Article[] {
	return collection.articleSlugs.flatMap((articleSlug) => {
		const article = getArticle(articleSlug);
		return article ? [article] : [];
	});
}

export function getArchiveEntriesForArticle(article: Article): ArchiveEntry[] {
	return article.archiveIds.flatMap((archiveId) => {
		const entry = getArchiveEntry(archiveId);
		return entry ? [entry] : [];
	});
}

export function getArticlesForArchive(archiveId: string): Article[] {
	return articles.filter((article) => article.archiveIds.includes(archiveId));
}
