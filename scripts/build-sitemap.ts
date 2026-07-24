import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { cityStories } from "../src/content/city-stories.ts";
import { policyDocuments } from "../src/content/policies.ts";
import { SITE_ORIGIN } from "../src/site.ts";

type SitemapRecord = {
	loc: string;
	lastmod?: string;
};

function escapeXml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

export async function buildSitemap(projectRoot = process.cwd()): Promise<SitemapRecord[]> {
	const root = resolve(projectRoot);
	const records: SitemapRecord[] = [
		{ loc: `${SITE_ORIGIN}/` },
		...cityStories.map((story) => ({ loc: `${SITE_ORIGIN}/stories/${story.slug}` })),
		...policyDocuments.map((document) => ({
			loc: `${SITE_ORIGIN}/policies/${document.slug}`,
			lastmod: document.updatedAt,
		})),
		{ loc: `${SITE_ORIGIN}/recording-kit` },
		{ loc: `${SITE_ORIGIN}/contribute` },
	];
	const urls = records
		.map(
			(record) =>
				`  <url>\n    <loc>${escapeXml(record.loc)}</loc>${record.lastmod ? `\n    <lastmod>${escapeXml(record.lastmod)}</lastmod>` : ""}\n  </url>`,
		)
		.join("\n");
	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
	await writeFile(resolve(root, "public", "sitemap.xml"), xml, "utf8");
	return records;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const records = await buildSitemap();
	console.log(`站点地图已生成：${records.length} 个网址。`);
}
