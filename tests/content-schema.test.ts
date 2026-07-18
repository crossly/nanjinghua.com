import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { validateContentDirectory } from "../scripts/validate-content.ts";
import { toPrivacyDeletionEntry, toPublicArchiveEntry } from "../src/content/publication.ts";
import {
	parseArchiveEntries,
	parseArchiveIdentifierRegistry,
	parseArticles,
	parseCollections,
	validateArchiveIdentifierRegistryAppendOnly,
	validateArchiveIdentifiers,
} from "../src/content/schema.ts";

const validEntry = {
	id: "NJH000001",
	title: "测试档案",
	summary: "用于验证档案内容模式的完整记录。",
	evidenceIdentity: "原始材料",
	languageScope: ["南京话"],
	culturalForms: ["白局", "曲艺"],
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
	visual: {
		src: "/images/test-cultural-form.jpg",
		width: 1800,
		height: 655,
		alt: "测试文化形式现场",
		caption: "测试文化形式现场记录。",
		credit: "测试作者",
		license: "CC BY 2.5",
		licenseUrl: "https://creativecommons.org/licenses/by/2.5/",
		sourceUrl: "https://commons.wikimedia.org/wiki/File:Example.jpg",
	},
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

const validOriginalFile = {
	kind: "原始文件",
	fileName: "source.wav",
	mediaType: "audio/wav",
	byteLength: 2048,
	sha256: "a".repeat(64),
	sourceUrl: "https://example.com/source.wav",
	preservedAt: "2026-07-17",
	storage: "编辑研究副本，未提交 Git",
	publicAccess: false,
	rightsBasis: "已获授权；原始文件不公开",
	disposition: {
		storedCopy: "保留",
		backups: "无独立备份",
		decidedAt: "2026-07-17",
		decidedBy: "南京话编辑",
		basis: "按授权范围保留研究副本，不向公众提供原件。",
	},
};

const validDerivedFile = {
	kind: "派生文件",
	fileName: "derived.mp3",
	mediaType: "audio/mpeg",
	byteLength: 1024,
	sha256: "b".repeat(64),
	sourceUrl: "https://example.com/derived.mp3",
	preservedAt: "2026-07-17",
	storage: "R2",
	publicAccess: true,
	rightsBasis: "已获授权",
	disposition: {
		storedCopy: "保留",
		backups: "无独立备份",
		decidedAt: "2026-07-17",
		decidedBy: "南京话编辑",
		basis: "保留公开派生件，原始文件另行受限保存。",
	},
	derivedFromSha256: validOriginalFile.sha256,
	processing: ["从 WAV 转码为 MP3"],
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

test("说话者成长地点与材料采集地点分别保存", () => {
	const [entry] = parseArchiveEntries([
		{
			...validEntry,
			archivePlace: {
				...validEntry.archivePlace,
				speakerUpbringingPlace: "南京出生、来自不同城区",
				materialCollectionPlace: "调查地点未公开",
			},
		},
	]);

	assert.ok(entry?.publicationStatus === "公开");
	assert.equal(entry.archivePlace.speakerUpbringingPlace, "南京出生、来自不同城区");
	assert.equal(entry.archivePlace.materialCollectionPlace, "调查地点未公开");
});

test("可保存的原始文件记录校验值、来源和访问状态", () => {
	const [entry] = parseArchiveEntries([
		{
			...validEntry,
			preservedFiles: [validOriginalFile],
		},
	]);

	assert.ok(entry?.publicationStatus === "公开");
	assert.equal(entry.preservedFiles?.[0]?.sha256, "a".repeat(64));
});

test("派生文件可以追溯到同一档案中的原始文件", () => {
	const [entry] = parseArchiveEntries([
		{
			...validEntry,
			preservedFiles: [validOriginalFile, validDerivedFile],
		},
	]);

	assert.ok(entry?.publicationStatus === "公开");
	assert.equal(entry.preservedFiles?.[1]?.derivedFromSha256, validOriginalFile.sha256);
});

test("派生文件必须记录原始文件校验值和处理过程", () => {
	assert.throws(
		() =>
			parseArchiveEntries([
				{
					...validEntry,
					preservedFiles: [
						{
							...validDerivedFile,
							derivedFromSha256: undefined,
							processing: undefined,
						},
					],
				},
			]),
		/派生文件必须记录原始文件校验值和处理过程/,
	);
});

test("派生文件拒绝悬空的原始文件校验值", () => {
	assert.throws(
		() =>
			parseArchiveEntries([
				{
					...validEntry,
					preservedFiles: [
						validOriginalFile,
						{ ...validDerivedFile, derivedFromSha256: "c".repeat(64) },
					],
				},
			]),
		/派生文件必须指向同一档案中已保存的原始文件/,
	);
});

test("派生文件不能把另一派生文件作为原始来源", () => {
	assert.throws(
		() =>
			parseArchiveEntries([
				{
					...validEntry,
					preservedFiles: [
						validOriginalFile,
						validDerivedFile,
						{
							...validDerivedFile,
							fileName: "second-derived.mp3",
							sha256: "c".repeat(64),
							derivedFromSha256: validDerivedFile.sha256,
						},
					],
				},
			]),
		/派生文件必须指向同一档案中已保存的原始文件/,
	);
});

test("保存文件必须记录原件与备份的保留或销毁决定", () => {
	const { disposition: _, ...fileWithoutDisposition } = validOriginalFile;
	assert.throws(
		() =>
			parseArchiveEntries([
				{
					...validEntry,
					preservedFiles: [fileWithoutDisposition],
				},
			]),
		/处置|disposition/i,
	);
});

test("事实修订与证据身份变化记录日期、责任人和前后身份", () => {
	const [entry] = parseArchiveEntries([
		{
			...validEntry,
			revisions: [
				{
					type: "事实修订",
					revisedAt: "2026-07-18",
					responsibleParty: "南京话编辑",
					summary: "更正来源页码，并说明核验范围。",
				},
				{
					type: "证据身份变更",
					revisedAt: "2026-07-18",
					responsibleParty: "南京话编辑",
					summary: "取得原件后由口述记忆改列为原始材料。",
					previousEvidenceIdentity: "口述记忆",
					newEvidenceIdentity: "原始材料",
				},
			],
			updatedAt: "2026-07-18",
		},
	]);

	assert.equal(entry?.revisions?.[1]?.newEvidenceIdentity, "原始材料");
});

test("证据身份变化的最后状态必须与当前编目一致", () => {
	assert.throws(
		() =>
			parseArchiveEntries([
				{
					...validEntry,
					revisions: [
						{
							type: "证据身份变更",
							revisedAt: "2026-07-18",
							responsibleParty: "南京话编辑",
							summary: "测试不一致的身份变化。",
							previousEvidenceIdentity: "口述记忆",
							newEvidenceIdentity: "研究观点",
						},
					],
					updatedAt: "2026-07-18",
				},
			]),
		/当前证据身份/,
	);
});

test("目录占位只公开最小字段，隐私删除不泄露历史个人信息", () => {
	const privateText = "张某的精确住址与私人身份";
	const baseWithdrawal = {
		decidedAt: "2026-07-18",
		decidedBy: "南京话编辑",
		publicNote: "依当事人请求停止公开，仅保留允许展示的目录信息。",
		relatedSubmissionId: "SUB-20260718-ABCDEF1234",
	};
	const [catalogEntry] = parseArchiveEntries([
		{
			id: validEntry.id,
			title: validEntry.title,
			summary: validEntry.summary,
			publicationStatus: "目录占位",
			rightsStatus: "不公开媒体",
			withdrawal: { ...baseWithdrawal, type: "目录撤回" },
			publishedAt: validEntry.publishedAt,
			updatedAt: "2026-07-18",
		},
	]);
	assert.ok(catalogEntry);
	const catalog = toPublicArchiveEntry({ ...catalogEntry, body: privateText });
	assert.equal(catalog.publicationStatus, "目录占位");
	assert.equal(catalog.title, validEntry.title);
	assert.equal("body" in catalog, false);
	assert.equal("citations" in catalog, false);

	assert.throws(
		() =>
			parseArchiveEntries([
				{
					...validEntry,
					title: privateText,
					publicationStatus: "隐私删除",
				},
			]),
		/Invalid input|公开|目录占位/,
	);
	const privacy = toPrivacyDeletionEntry("NJH000002", "2026-07-17", "2026-07-18");
	const serialized = JSON.stringify(privacy);
	assert.equal(privacy.publicationStatus, "隐私删除");
	assert.equal(serialized.includes(privateText), false);
	assert.equal("withdrawal" in privacy, false);
	assert.equal("archivePlace" in privacy, false);
});

test("永久编号登记簿允许保留撤回编号但拒绝将其分配给公开材料", () => {
	const registry = parseArchiveIdentifierRegistry({
		format: "NJH######",
		highWaterMark: 2,
		identifiers: [
			{
				id: "NJH000001",
				status: "已发布",
				assignedAt: "2026-07-17",
				history: [{ status: "已发布", changedAt: "2026-07-17" }],
			},
			{
				id: "NJH000002",
				status: "隐私删除",
				assignedAt: "2026-07-17",
				statusChangedAt: "2026-07-18",
				history: [
					{ status: "已发布", changedAt: "2026-07-17" },
					{ status: "隐私删除", changedAt: "2026-07-18" },
				],
			},
		],
	});
	assert.doesNotThrow(() => validateArchiveIdentifiers([validEntry], registry));

	assert.throws(
		() => validateArchiveIdentifiers([{ ...validEntry, id: "NJH000002" }], registry),
		/隐私删除|撤回|不复用/,
	);
});

test("专题集合元数据可以声明有序专题文章", () => {
	assert.deepEqual(parseCollections([validCollection])[0]?.articleSlugs, ["test-article"]);
});

test("专题文章可以预留待关联档案位置", () => {
	const [article] = parseArticles([
		{
			...validArticle,
			plannedArchiveRelations: [
				{
					label: "首批原创语音样本",
					status: "等待授权材料",
					description: "取得授权后关联正式档案编号。",
				},
			],
		},
	]);

	assert.equal(article?.plannedArchiveRelations?.[0]?.status, "等待授权材料");
});

async function createContentFixture(
	entries: unknown[],
	options: { articles?: unknown[]; collections?: unknown[]; identifiers?: unknown } = {},
) {
	const projectRoot = await mkdtemp(join(tmpdir(), "nanjinghua-content-"));
	const archiveDirectory = join(projectRoot, "content", "archive");
	const articleDirectory = join(projectRoot, "content", "articles");
	const collectionDirectory = join(projectRoot, "content", "collections");
	await mkdir(archiveDirectory, { recursive: true });
	await mkdir(articleDirectory, { recursive: true });
	await mkdir(collectionDirectory, { recursive: true });
	const identifiers = options.identifiers ?? {
		format: "NJH######",
		highWaterMark: new Set(
			entries.flatMap((entry) =>
				entry && typeof entry === "object" && "id" in entry ? [entry.id] : [],
			),
		).size,
		identifiers: [
			...new Map(
				entries.flatMap((entry) => {
					if (!entry || typeof entry !== "object" || !("id" in entry)) return [];
					const record = entry as { id: unknown; publicationStatus?: unknown };
					const status = record.publicationStatus === "目录占位" ? "目录占位" : "已发布";
					return [
						[
							record.id,
							{
								id: record.id,
								status,
								assignedAt: "2026-07-17",
								...(status === "目录占位" ? { statusChangedAt: "2026-07-18" } : {}),
								history:
									status === "目录占位"
										? [
												{ status: "已发布", changedAt: "2026-07-17" },
												{ status: "目录占位", changedAt: "2026-07-18" },
											]
										: [{ status: "已发布", changedAt: "2026-07-17" }],
							},
						],
					];
				}),
			).values(),
		],
	};
	await writeFile(
		join(projectRoot, "content", "archive-identifiers.json"),
		JSON.stringify(identifiers),
		"utf8",
	);

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

test("生产构建要求首发正式档案数量保持在 20 至 30 条", async () => {
	const projectRoot = await createContentFixture([validEntry]);

	try {
		await assert.rejects(
			validateContentDirectory(projectRoot, { enforceLaunchArchiveCount: true }),
			/首发正式档案必须为 20 至 30 条，当前为 1 条/,
		);
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

test("生产构建接受受控文化形式并拒绝自由标签", async () => {
	const validProjectRoot = await createContentFixture([validEntry]);
	const invalidProjectRoot = await createContentFixture([
		{ ...validEntry, culturalForms: ["泛民俗"] },
	]);

	try {
		await assert.doesNotReject(validateContentDirectory(validProjectRoot));
		await assert.rejects(validateContentDirectory(invalidProjectRoot), /文化形式/);
	} finally {
		await rm(validProjectRoot, { recursive: true, force: true });
		await rm(invalidProjectRoot, { recursive: true, force: true });
	}
});

test("生产构建要求专题视觉分别记录替代文本、署名、许可和来源", async () => {
	const { alt: _, ...visualWithoutAlt } = validArticle.visual;
	const projectRoot = await createContentFixture([validEntry], {
		articles: [{ ...validArticle, visual: visualWithoutAlt }],
	});

	try {
		await assert.rejects(validateContentDirectory(projectRoot), /alt|expected string/i);
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

test("生产构建拒绝把登记为撤回的永久编号分配给其他材料", async () => {
	const projectRoot = await createContentFixture([validEntry], {
		identifiers: {
			format: "NJH######",
			highWaterMark: 1,
			identifiers: [
				{
					id: "NJH000001",
					status: "隐私删除",
					assignedAt: "2026-07-17",
					statusChangedAt: "2026-07-18",
					history: [
						{ status: "已发布", changedAt: "2026-07-17" },
						{ status: "隐私删除", changedAt: "2026-07-18" },
					],
				},
			],
		},
	});

	try {
		await assert.rejects(validateContentDirectory(projectRoot), /隐私删除|撤回|不复用/);
	} finally {
		await rm(projectRoot, { recursive: true, force: true });
	}
});

test("生产构建拒绝孤儿正文和目录占位正文", async () => {
	const orphanRoot = await createContentFixture([validEntry]);
	const catalogRoot = await createContentFixture(
		[
			{
				id: "NJH000001",
				title: "允许保留的目录题名",
				summary: "仅保留经过权利确认的最小目录说明。",
				publicationStatus: "目录占位",
				rightsStatus: "不公开媒体",
				withdrawal: {
					type: "目录撤回",
					decidedAt: "2026-07-18",
					decidedBy: "南京话编辑",
					publicNote: "停止公开正文和来源。",
				},
				publishedAt: "2026-07-17",
				updatedAt: "2026-07-18",
			},
		],
		{
			identifiers: {
				format: "NJH######",
				highWaterMark: 1,
				identifiers: [
					{
						id: "NJH000001",
						status: "目录占位",
						assignedAt: "2026-07-17",
						statusChangedAt: "2026-07-18",
						history: [
							{ status: "已发布", changedAt: "2026-07-17" },
							{ status: "目录占位", changedAt: "2026-07-18" },
						],
					},
				],
			},
		},
	);
	await writeFile(
		join(orphanRoot, "content", "archive", "removed-private-record.md"),
		"不应进入客户端包的历史正文",
		"utf8",
	);

	try {
		await assert.rejects(validateContentDirectory(orphanRoot), /正文缺少对应内容元数据/);
		await assert.rejects(validateContentDirectory(catalogRoot), /目录占位不能保留公开正文/);
	} finally {
		await rm(orphanRoot, { recursive: true, force: true });
		await rm(catalogRoot, { recursive: true, force: true });
	}
});

test("永久编号高水位不允许缺号或删除末尾撤回记录", () => {
	assert.throws(
		() =>
			parseArchiveIdentifierRegistry({
				format: "NJH######",
				highWaterMark: 2,
				identifiers: [
					{
						id: "NJH000001",
						status: "已发布",
						assignedAt: "2026-07-17",
						history: [{ status: "已发布", changedAt: "2026-07-17" }],
					},
				],
			}),
		/高水位/,
	);
	assert.throws(
		() =>
			parseArchiveIdentifierRegistry({
				format: "NJH######",
				highWaterMark: 2,
				identifiers: [
					{
						id: "NJH000001",
						status: "已发布",
						assignedAt: "2026-07-17",
						history: [{ status: "已发布", changedAt: "2026-07-17" }],
					},
					{
						id: "NJH000003",
						status: "已发布",
						assignedAt: "2026-07-18",
						history: [{ status: "已发布", changedAt: "2026-07-18" }],
					},
				],
			}),
		/缺号/,
	);
	assert.throws(
		() =>
			parseArchiveIdentifierRegistry({
				format: "NJH######",
				highWaterMark: 1,
				identifiers: [
					{
						id: "NJH000001",
						status: "已发布",
						assignedAt: "2026-07-17",
						history: [
							{ status: "已发布", changedAt: "2026-07-17" },
							{ status: "隐私删除", changedAt: "2026-07-18" },
							{ status: "已发布", changedAt: "2026-07-19" },
						],
					},
				],
			}),
		/不能重新激活|不能再次改变状态/,
	);
});

test("永久编号登记簿相对既有 Git 版本只能追加历史", () => {
	const previous = parseArchiveIdentifierRegistry({
		format: "NJH######",
		highWaterMark: 1,
		identifiers: [
			{
				id: "NJH000001",
				status: "目录占位",
				assignedAt: "2026-07-17",
				statusChangedAt: "2026-07-18",
				history: [
					{ status: "已发布", changedAt: "2026-07-17" },
					{ status: "目录占位", changedAt: "2026-07-18" },
				],
			},
		],
	});
	const reset = parseArchiveIdentifierRegistry({
		format: "NJH######",
		highWaterMark: 1,
		identifiers: [
			{
				id: "NJH000001",
				status: "已发布",
				assignedAt: "2026-07-17",
				history: [{ status: "已发布", changedAt: "2026-07-17" }],
			},
		],
	});
	assert.throws(
		() => validateArchiveIdentifierRegistryAppendOnly(previous, reset),
		/只能追加|不能修改/,
	);

	const privacyDeletion = parseArchiveIdentifierRegistry({
		format: "NJH######",
		highWaterMark: 1,
		identifiers: [
			{
				id: "NJH000001",
				status: "隐私删除",
				assignedAt: "2026-07-17",
				statusChangedAt: "2026-07-19",
				history: [
					{ status: "已发布", changedAt: "2026-07-17" },
					{ status: "目录占位", changedAt: "2026-07-18" },
					{ status: "隐私删除", changedAt: "2026-07-19" },
				],
			},
		],
	});
	assert.doesNotThrow(() => validateArchiveIdentifierRegistryAppendOnly(previous, privacyDeletion));
});
