import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { createDiscoveryItems, filterDiscoveryItems } from "../src/content/discovery.ts";
import type { ArchiveEntry } from "../src/content/registry.ts";
import { parseArchiveEntries } from "../src/content/schema.ts";

function archiveEntry(id: string): ArchiveEntry {
	const basePath = resolve("content", "archive", id);
	const [metadata] = parseArchiveEntries([
		JSON.parse(readFileSync(`${basePath}.meta.json`, "utf8")),
	]);
	if (!metadata) throw new Error(`测试档案不存在：${id}`);
	return { ...metadata, body: readFileSync(`${basePath}.md`, "utf8") } as ArchiveEntry;
}

const items = createDiscoveryItems({
	archiveEntries: [archiveEntry("NJH000014"), archiveEntry("NJH000015"), archiveEntry("NJH000019")],
	articles: [],
	collections: [],
});

test("检索覆盖题名、责任者、正文和明确的普通话拼音辅助字段", () => {
	assert.deepEqual(
		filterDiscoveryItems(items, { q: "国家级非物质文化遗产" }).map((item) => item.id),
		["NJH000015"],
	);
	assert.deepEqual(
		filterDiscoveryItems(items, { q: "Keith Johnson" }).map((item) => item.id),
		["NJH000019"],
	);
	assert.deepEqual(
		filterDiscoveryItems(items, { q: "受控听觉感知任务" }).map((item) => item.id),
		["NJH000019"],
	);
	assert.deepEqual(
		filterDiscoveryItems(items, { q: "nanjing baiju" }).map((item) => item.id),
		["NJH000015"],
	);
});

test("受控组合筛选只命中符合全部字段的档案", () => {
	const results = filterDiscoveryItems(items, {
		type: "档案条目",
		evidence: "原始材料",
		time: "2000 年至今",
		place: "南京市秦淮区",
		culture: "白局",
	});
	assert.deepEqual(
		results.map((item) => item.id),
		["NJH000015"],
	);
});

test("跨片区档案保留全部受控地点分面", () => {
	for (const place of ["南京市秦淮区", "南京市鼓楼区"] as const) {
		assert.ok(
			filterDiscoveryItems(items, { place })
				.map((item) => item.id)
				.includes("NJH000014"),
		);
	}
});

test("无匹配内容时返回空结果", () => {
	assert.deepEqual(filterDiscoveryItems(items, { q: "不存在的档案词条" }), []);
});
