import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { policyDocuments } from "../src/content/policies.ts";
import { SITE_ORIGIN } from "../src/site.ts";

type SitemapRecord = {
	loc: string;
	lastmod?: string;
};

type ArchiveMetadata = {
	id: string;
	updatedAt?: string;
	publicationStatus?: "公开" | "目录占位" | "隐私删除";
};

type ArticleMetadata = {
	slug: string;
	updatedAt?: string;
};

function escapeXml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

async function readJsonFiles<T>(directory: string): Promise<T[]> {
	const fileNames = (await readdir(directory))
		.filter((fileName) => fileName.endsWith(".meta.json"))
		.sort();
	return Promise.all(
		fileNames.map(async (fileName) =>
			JSON.parse(await readFile(join(directory, fileName), "utf8")),
		),
	);
}

export async function buildSitemap(projectRoot = process.cwd()): Promise<SitemapRecord[]> {
	const root = resolve(projectRoot);
	const archives = await readJsonFiles<ArchiveMetadata>(join(root, "content", "archive"));
	const articles = await readJsonFiles<ArticleMetadata>(join(root, "content", "articles"));
	const records: SitemapRecord[] = [
		{ loc: `${SITE_ORIGIN}/` },
		{ loc: `${SITE_ORIGIN}/browse` },
		...policyDocuments.map((document) => ({
			loc: `${SITE_ORIGIN}/policies/${document.slug}`,
			lastmod: document.updatedAt,
		})),
		...articles.map((article) => ({
			loc: `${SITE_ORIGIN}/articles/${article.slug}`,
			lastmod: article.updatedAt,
		})),
		...archives
			.filter((entry) => entry.publicationStatus !== "隐私删除")
			.map((entry) => ({
				loc: `${SITE_ORIGIN}/archive/${entry.id}`,
				lastmod: entry.updatedAt,
			})),
	];
	const urls = records
		.map(
			(record) =>
				`  <url>\n    <loc>${escapeXml(record.loc)}</loc>${record.lastmod ? `\n    <lastmod>${escapeXml(record.lastmod)}</lastmod>` : ""}\n  </url>`,
		)
		.join("\n");
	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
	await writeFile(join(root, "public", "sitemap.xml"), xml, "utf8");
	return records;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const records = await buildSitemap();
	console.log(`站点地图已生成：${records.length} 个网址。`);
}
