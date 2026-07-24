import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { buildSitemap } from "../scripts/build-sitemap.ts";

test("站点地图只包含当前城市故事、制度、采集工具与反馈页面", async () => {
	const records = await buildSitemap();
	const locations = records.map((record) => record.loc);
	assert.equal(locations.length, 25);
	assert.equal(locations.filter((location) => location.includes("/stories/")).length, 15);
	assert.equal(locations.filter((location) => location.includes("/policies/")).length, 7);
	assert.ok(locations.includes("https://nanjinghua.com/contribute"));
	assert.ok(locations.includes("https://nanjinghua.com/recording-kit"));
	assert.ok(!locations.some((location) => location.includes("/archive/")));
	assert.ok(!locations.some((location) => location.includes("/articles/")));
	assert.ok(!locations.includes("https://nanjinghua.com/browse"));

	const sitemap = await readFile(join(process.cwd(), "public", "sitemap.xml"), "utf8");
	assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
});
