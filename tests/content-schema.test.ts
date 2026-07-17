import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { validateContentDirectory } from "../scripts/validate-content.ts";
import { parseArchiveEntries, parseCollections } from "../src/content/schema.ts";

const validEntry = {
	id: "NJH000001",
	title: "测试档案",
	summary: "用于验证档案内容模式的完整记录。",
	evidenceIdentity: "原始材料",
	languageScope: ["南京话"],
	rightsStatus: "仅引文与目录信息",
	archiveTime: {
		materialDate: "1930",
		describedPeriod: "1930 年代",
	},
	archivePlace: {
		recordedName: "南京市",
		historicalJurisdiction: "南京市",
		currentLocation: "江苏省南京市",
	},
	citations: [
		{
			role: "主要来源",
			responsibleParties: ["测试责任者"],
			title: "测试来源",
			publication: "测试出版物",
			publicationDate: "1930",
			locator: "第 1 页",
			stableIdentifier: "TEST-1",
			url: "https://example.com/source",
			accessedAt: "2026-07-17",
		},
	],
	review: {
		status: "编辑核对后发布",
		reviewer: "南京话编辑",
		reviewedAt: "2026-07-17",
	},
	aiAssistance: true,
	publishedAt: "2026-07-17",
	updatedAt: "2026-07-17",
};

const validArticle = {
	slug: "test-article",
	title: "测试专题",
	summary: "用于验证专题集合引用的测试专题。",
	author: { name: "测试编辑", role: "内容责任人" },
	archiveIds: ["NJH000001"],
	review: {
		status: "编辑核对后发布",
		reviewer: "测试编辑",
		reviewedAt: "2026-07-17",
	},
	aiAssistance: true,
	publishedAt: "2026-07-17",
	updatedAt: "2026-07-17",
};

const validCollection = {
	slug: "test-collection",
	title: "测试专题集合",
	summary: "用于验证专题集合发布边界。",
	sequenceLabel: "第一辑",
	sequenceNumber: "01",
	articleSlugs: ["test-article"],
	publishedAt: "2026-07-17",
	updatedAt: "2026-07-17",
};

test("完整档案元数据可以通过模式校验", () => {
	assert.equal(parseArchiveEntries([validEntry])[0]?.id, "NJH000001");
});

test("非法证据身份会被拒绝", () => {
	assert.throws(
		() => parseArchiveEntries([{ ...validEntry, evidenceIdentity: "确定史实" }]),
		/证据身份/,
	);
});

test("无效语言对象会被拒绝", () => {
	assert.throws(
		() => parseArchiveEntries([{ ...validEntry, languageScope: ["泛南京方言"] }]),
		/语言对象/,
	);
});

test("缺少权利状态会被拒绝", () => {
	const { rightsStatus: _, ...entryWithoutRights } = validEntry;
	assert.throws(() => parseArchiveEntries([entryWithoutRights]), /权利状态/);
});

test("重复档案编号会被拒绝", () => {
	assert.throws(() => parseArchiveEntries([validEntry, validEntry]), /重复档案编号 NJH000001/);
});

test("推定时期必须同时提供依据和不确定性", () => {
	assert.throws(
		() =>
			parseArchiveEntries([
				{
					...validEntry,
					archiveTime: { ...validEntry.archiveTime, inferredPeriod: "约 1930 年代" },
				},
			]),
		/推定时期必须同时提供推定依据和不确定性/,
	);
});

test("专题集合元数据可以声明有序专题文章", () => {
	assert.deepEqual(parseCollections([validCollection])[0]?.articleSlugs, ["test-article"]);
});

async function createContentFixture(
	entries: unknown[],
	options: { articles?: unknown[]; collections?: unknown[] } = {},
) {
	const projectRoot = await mkdtemp(join(tmpdir(), "nanjinghua-content-"));
	const archiveDirectory = join(projectRoot, "content", "archive");
	const articleDirectory = join(projectRoot, "content", "articles");
	const collectionDirectory = join(projectRoot, "content", "collections");
	await mkdir(archiveDirectory, { recursive: true });
	await mkdir(articleDirectory, { recursive: true });
	await mkdir(collectionDirectory, { recursive: true });

	for (const [index, entry] of entries.entries()) {
		const basePath = join(archiveDirectory, `fixture-${index}`);
		await writeFile(`${basePath}.meta.json`, JSON.stringify(entry), "utf8");
		await writeFile(`${basePath}.md`, "测试正文", "utf8");
	}

	for (const [index, article] of (options.articles ?? []).entries()) {
		const basePath = join(articleDirectory, `fixture-${index}`);
		await writeFile(`${basePath}.meta.json`, JSON.stringify(article), "utf8");
		await writeFile(`${basePath}.md`, "测试正文", "utf8");
	}

	for (const [index, collection] of (options.collections ?? []).entries()) {
		await writeFile(
			join(collectionDirectory, `fixture-${index}.meta.json`),
			JSON.stringify(collection),
			"utf8",
		);
	}

	return projectRoot;
}

test("生产构建使用的内容校验器会读取并接受完整文件", async () => {
	const projectRoot = await createContentFixture([validEntry]);

	try {
		assert.deepEqual(await validateContentDirectory(projectRoot), {
			archives: 1,
			articles: 0,
			collections: 0,
		});
	} finally {
		await rm(projectRoot, { recursive: true, force: true });
	}
});

test("生产构建拒绝专题集合引用不存在的专题文章", async () => {
	const projectRoot = await createContentFixture([validEntry], {
		articles: [validArticle],
		collections: [{ ...validCollection, articleSlugs: ["missing-article"] }],
	});

	try {
		await assert.rejects(
			validateContentDirectory(projectRoot),
			/专题集合 test-collection 引用了不存在的专题文章 missing-article/,
		);
	} finally {
		await rm(projectRoot, { recursive: true, force: true });
	}
});

test("生产构建使用的内容校验器会拒绝真实文件中的重复编号", async () => {
	const projectRoot = await createContentFixture([validEntry, validEntry]);

	try {
		await assert.rejects(validateContentDirectory(projectRoot), /重复档案编号 NJH000001/);
	} finally {
		await rm(projectRoot, { recursive: true, force: true });
	}
});

test("生产构建使用的内容校验器会拒绝真实文件中的无效受控词", async () => {
	const projectRoot = await createContentFixture([{ ...validEntry, evidenceIdentity: "确定史实" }]);

	try {
		await assert.rejects(validateContentDirectory(projectRoot), /证据身份/);
	} finally {
		await rm(projectRoot, { recursive: true, force: true });
	}
});

test("生产构建使用的内容校验器会拒绝真实文件中的缺失权利状态", async () => {
	const { rightsStatus: _, ...entryWithoutRights } = validEntry;
	const projectRoot = await createContentFixture([entryWithoutRights]);

	try {
		await assert.rejects(validateContentDirectory(projectRoot), /权利状态/);
	} finally {
		await rm(projectRoot, { recursive: true, force: true });
	}
});
