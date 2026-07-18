import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { buildSitemap } from "../scripts/build-sitemap.ts";

test("站点地图包含所有正式档案和专题且排除治理夹具", async () => {
	const records = await buildSitemap();
	const locations = records.map((record) => record.loc);
	assert.equal(locations.filter((location) => location.includes("/archive/")).length, 20);
	assert.equal(locations.filter((location) => location.includes("/articles/")).length, 7);
	assert.ok(locations.includes("https://nanjinghua.com/browse"));
	assert.ok(locations.includes("https://nanjinghua.com/archive/NJH000020"));
	assert.ok(!locations.includes("https://nanjinghua.com/archive/NJH000021"));
	assert.ok(!locations.includes("https://nanjinghua.com/archive/NJH000022"));

	const sitemapPath = join(process.cwd(), "public", "sitemap.xml");
	const sitemap = await readFile(sitemapPath, "utf8");
	assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
});
