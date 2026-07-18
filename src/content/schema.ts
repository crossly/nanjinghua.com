import { z } from "zod";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期必须使用 YYYY-MM-DD 格式");
const requiredText = z.string().trim().min(1, "字段不能为空");
const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug 格式无效");

export const evidenceIdentitySchema = z.enum(["原始材料", "研究观点", "口述记忆", "待考说法"], {
	error: "证据身份必须使用受控词汇",
});

const archiveIdSchema = z.string().regex(/^NJH\d{6}$/, "档案编号必须使用 NJH 加六位数字");

export const languageScopeSchema = z.enum(["南京话", "南京地区方言", "历史南京语音"], {
	error: "语言对象必须使用受控词汇",
});

export const culturalFormSchema = z.enum(["白局", "童谣", "俗语", "曲艺", "方言书写", "音像记录"], {
	error: "文化形式必须使用受控词汇",
});

export const mediaLicenseSchema = z.enum(
	["公版", "CC0", "CC BY 2.5", "CC BY 4.0", "CC BY-SA 4.0", "已获授权"],
	{ error: "媒体许可必须使用受控词汇" },
);

export const rightsStatusSchema = z.enum(
	[
		"公版",
		"CC0",
		"CC BY 2.5",
		"CC BY 4.0",
		"CC BY-SA 4.0",
		"已获授权",
		"仅引文与目录信息",
		"不公开媒体",
	],
	{ error: "权利状态必须使用受控词汇" },
);

export const reviewStatusSchema = z.enum(["编辑核对后发布", "待专家复核", "专家复核"], {
	error: "审核状态必须使用受控词汇",
});

export const citationSchema = z
	.object({
		role: z.enum(["主要来源", "补充来源"]),
		responsibleParties: z.array(requiredText).min(1, "引用记录至少需要一位责任者"),
		title: requiredText,
		publication: requiredText,
		publicationDate: requiredText,
		locator: requiredText,
		stableIdentifier: requiredText,
		url: z.url("引用记录必须提供有效来源网址"),
		accessedAt: isoDateSchema,
		language: requiredText.optional(),
	})
	.strict();

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/, "SHA-256 必须使用 64 位小写十六进制");

const preservedFileSchema = z
	.object({
		kind: z.enum(["原始文件", "派生文件"]),
		fileName: requiredText,
		mediaType: requiredText,
		byteLength: z.number().int().positive("文件字节数必须为正整数"),
		sha256: sha256Schema,
		sourceUrl: z.url("保存文件必须提供有效来源网址"),
		preservedAt: isoDateSchema,
		storage: requiredText,
		publicAccess: z.boolean(),
		rightsBasis: requiredText,
		disposition: z
			.object({
				storedCopy: z.enum(["保留", "销毁"]),
				backups: z.enum(["保留", "销毁", "无独立备份"]),
				decidedAt: isoDateSchema,
				decidedBy: requiredText,
				basis: requiredText,
			})
			.strict(),
		derivedFromSha256: sha256Schema.optional(),
		processing: z.array(requiredText).min(1).optional(),
	})
	.strict()
	.superRefine((file, context) => {
		if (file.kind === "派生文件" && (!file.derivedFromSha256 || !file.processing)) {
			context.addIssue({
				code: "custom",
				message: "派生文件必须记录原始文件校验值和处理过程",
			});
		}

		if (file.kind === "原始文件" && (file.derivedFromSha256 || file.processing)) {
			context.addIssue({
				code: "custom",
				message: "原始文件不能声明派生来源或处理过程",
			});
		}
	});

const preservedFilesSchema = z
	.array(preservedFileSchema)
	.min(1)
	.superRefine((files, context) => {
		const originalHashes = new Set(
			files.filter((file) => file.kind === "原始文件").map((file) => file.sha256),
		);

		for (const [index, file] of files.entries()) {
			if (
				file.kind === "派生文件" &&
				file.derivedFromSha256 &&
				!originalHashes.has(file.derivedFromSha256)
			) {
				context.addIssue({
					code: "custom",
					message: "派生文件必须指向同一档案中已保存的原始文件",
					path: [index, "derivedFromSha256"],
				});
			}
		}
	});

const archiveTimeSchema = z
	.object({
		materialDate: requiredText,
		describedPeriod: requiredText,
		inferredPeriod: requiredText.optional(),
		inferenceBasis: requiredText.optional(),
		uncertainty: requiredText.optional(),
	})
	.strict()
	.superRefine((archiveTime, context) => {
		const inferenceFields = [
			archiveTime.inferredPeriod,
			archiveTime.inferenceBasis,
			archiveTime.uncertainty,
		];
		const hasInference = inferenceFields.some((field) => field !== undefined);

		if (hasInference && inferenceFields.some((field) => field === undefined)) {
			context.addIssue({
				code: "custom",
				message: "推定时期必须同时提供推定依据和不确定性",
			});
		}
	});

const revisionSchema = z
	.object({
		type: z.enum(["事实修订", "证据身份变更"]),
		revisedAt: isoDateSchema,
		responsibleParty: requiredText,
		summary: requiredText,
		previousEvidenceIdentity: evidenceIdentitySchema.optional(),
		newEvidenceIdentity: evidenceIdentitySchema.optional(),
	})
	.strict()
	.superRefine((revision, context) => {
		const hasPrevious = revision.previousEvidenceIdentity !== undefined;
		const hasNew = revision.newEvidenceIdentity !== undefined;
		if (revision.type === "证据身份变更" && (!hasPrevious || !hasNew)) {
			context.addIssue({
				code: "custom",
				message: "证据身份变更必须记录变更前后的证据身份",
			});
		}
		if (revision.type === "事实修订" && (hasPrevious || hasNew)) {
			context.addIssue({
				code: "custom",
				message: "事实修订不能声明证据身份变化",
			});
		}
	});

const withdrawalSchema = z
	.object({
		type: z.enum(["权利撤回", "目录撤回", "隐私或安全删除"]),
		decidedAt: isoDateSchema,
		decidedBy: requiredText,
		publicNote: requiredText,
		relatedSubmissionId: z
			.string()
			.regex(/^SUB-\d{8}-[A-F0-9]{10}$/, "关联申诉编号格式无效")
			.optional(),
	})
	.strict();

const publishedArchiveEntrySchema = z
	.object({
		id: archiveIdSchema,
		title: requiredText,
		summary: requiredText,
		evidenceIdentity: evidenceIdentitySchema,
		languageScope: z.array(languageScopeSchema).min(1, "档案条目至少需要一个语言对象"),
		culturalForms: z.array(culturalFormSchema).min(1, "文化形式不能为空").optional(),
		searchAliases: z
			.array(
				z
					.object({
						term: requiredText,
						mandarinPinyin: z
							.string()
							.trim()
							.regex(/^[a-z0-9 ]+$/, "普通话拼音辅助字段只能使用小写拉丁字母、数字和空格"),
					})
					.strict(),
			)
			.min(1)
			.optional(),
		rightsStatus: rightsStatusSchema,
		archiveTime: archiveTimeSchema,
		archivePlace: z
			.object({
				recordedName: requiredText,
				historicalJurisdiction: requiredText,
				currentLocation: requiredText.optional(),
				collectionLocation: requiredText.optional(),
				speakerUpbringingPlace: requiredText.optional(),
				materialCollectionPlace: requiredText.optional(),
				uncertainty: requiredText.optional(),
			})
			.strict(),
		preservedFiles: preservedFilesSchema.optional(),
		publicationStatus: z.literal("公开").default("公开"),
		revisions: z.array(revisionSchema).min(1).optional(),
		citations: z.array(citationSchema).min(1, "档案条目至少需要一条引用记录"),
		review: z
			.object({
				status: reviewStatusSchema,
				reviewer: requiredText,
				reviewedAt: isoDateSchema,
				scope: requiredText.optional(),
			})
			.strict(),
		aiAssistance: z.boolean(),
		publishedAt: isoDateSchema,
		updatedAt: isoDateSchema,
	})
	.strict()
	.superRefine((entry, context) => {
		const identityRevisions = entry.revisions?.filter(
			(revision) => revision.type === "证据身份变更",
		);
		const latestIdentityRevision = identityRevisions?.at(-1);
		if (
			latestIdentityRevision?.newEvidenceIdentity &&
			latestIdentityRevision.newEvidenceIdentity !== entry.evidenceIdentity
		) {
			context.addIssue({
				code: "custom",
				message: "最后一次证据身份变化必须与当前证据身份一致",
			});
		}
	});

const catalogPlaceholderSchema = z
	.object({
		id: archiveIdSchema,
		title: requiredText,
		summary: requiredText,
		publicationStatus: z.literal("目录占位"),
		rightsStatus: z.literal("不公开媒体"),
		withdrawal: withdrawalSchema.refine(
			(withdrawal) => withdrawal.type !== "隐私或安全删除",
			"隐私或安全删除不能保留目录占位",
		),
		revisions: z.array(revisionSchema).min(1).optional(),
		publishedAt: isoDateSchema,
		updatedAt: isoDateSchema,
	})
	.strict();

export const archiveEntrySchema = z.union([publishedArchiveEntrySchema, catalogPlaceholderSchema]);

export const archiveIdentifierRegistrySchema = z
	.object({
		format: z.literal("NJH######"),
		highWaterMark: z.number().int().positive(),
		identifiers: z
			.array(
				z
					.object({
						id: archiveIdSchema,
						status: z.enum(["已发布", "目录占位", "隐私删除"]),
						assignedAt: isoDateSchema,
						statusChangedAt: isoDateSchema.optional(),
						history: z
							.array(
								z
									.object({
										status: z.enum(["已发布", "目录占位", "隐私删除"]),
										changedAt: isoDateSchema,
									})
									.strict(),
							)
							.min(1),
					})
					.strict(),
			)
			.min(1),
	})
	.strict();

export const articleSchema = z
	.object({
		slug: slugSchema,
		title: requiredText,
		summary: requiredText,
		author: z
			.object({
				name: requiredText,
				role: requiredText,
			})
			.strict(),
		archiveIds: z.array(z.string().regex(/^NJH\d{6}$/)).min(1),
		visual: z
			.object({
				src: requiredText,
				width: z.number().int().positive("专题视觉宽度必须为正整数"),
				height: z.number().int().positive("专题视觉高度必须为正整数"),
				alt: requiredText,
				caption: requiredText,
				credit: requiredText,
				license: mediaLicenseSchema,
				licenseUrl: z.url("专题视觉必须提供有效许可网址"),
				sourceUrl: z.url("专题视觉必须提供有效来源网址"),
			})
			.strict()
			.optional(),
		plannedArchiveRelations: z
			.array(
				z
					.object({
						label: requiredText,
						status: z.literal("等待授权材料"),
						description: requiredText,
					})
					.strict(),
			)
			.min(1)
			.optional(),
		review: z
			.object({
				status: reviewStatusSchema,
				reviewer: requiredText,
				reviewedAt: isoDateSchema,
				scope: requiredText,
			})
			.strict(),
		aiAssistance: z.boolean(),
		publishedAt: isoDateSchema,
		updatedAt: isoDateSchema,
	})
	.strict();

export const collectionSchema = z
	.object({
		slug: slugSchema,
		title: requiredText,
		summary: requiredText,
		sequenceLabel: requiredText,
		sequenceNumber: z.string().regex(/^\d{2}$/, "专题集合序号必须使用两位数字"),
		articleSlugs: z.array(slugSchema).min(1, "专题集合至少需要一篇专题文章"),
		publishedAt: isoDateSchema,
		updatedAt: isoDateSchema,
	})
	.strict();

export type ArchiveEntryMetadata = z.infer<typeof archiveEntrySchema>;
export type ArchiveIdentifierRegistry = z.infer<typeof archiveIdentifierRegistrySchema>;
export type ArticleMetadata = z.infer<typeof articleSchema>;
export type CollectionMetadata = z.infer<typeof collectionSchema>;

export function parseArchiveEntries(input: unknown[]): ArchiveEntryMetadata[] {
	const entries = z.array(archiveEntrySchema).parse(input);
	const seenIds = new Set<string>();

	for (const entry of entries) {
		if (seenIds.has(entry.id)) {
			throw new Error(`重复档案编号 ${entry.id}`);
		}
		if (
			entry.publicationStatus === "公开" &&
			entry.citations.filter((citation) => citation.role === "主要来源").length !== 1
		) {
			throw new Error(`档案条目 ${entry.id} 必须且只能有一条主要来源`);
		}
		seenIds.add(entry.id);
	}

	return entries;
}

export function parseArchiveIdentifierRegistry(input: unknown): ArchiveIdentifierRegistry {
	const registry = archiveIdentifierRegistrySchema.parse(input);
	const seenIds = new Set<string>();
	let previousId = "";
	if (registry.identifiers.length !== registry.highWaterMark) {
		throw new Error("永久编号登记簿不能低于已分配编号高水位");
	}
	for (const [index, record] of registry.identifiers.entries()) {
		const expectedId = `NJH${String(index + 1).padStart(6, "0")}`;
		if (record.id !== expectedId) {
			throw new Error(`永久编号登记簿在 ${expectedId} 处缺号，撤回编号不能删除`);
		}
		if (seenIds.has(record.id)) throw new Error(`永久编号登记簿包含重复编号 ${record.id}`);
		if (previousId && record.id <= previousId) {
			throw new Error("永久编号登记簿必须按编号递增排列");
		}
		seenIds.add(record.id);
		previousId = record.id;
		if (record.status === "已发布" && record.statusChangedAt) {
			throw new Error(`已发布编号 ${record.id} 不能声明撤回日期`);
		}
		if (record.status !== "已发布" && !record.statusChangedAt) {
			throw new Error(`撤回编号 ${record.id} 必须记录状态变更日期`);
		}
		const [firstHistory] = record.history;
		const latestHistory = record.history.at(-1);
		if (firstHistory?.status !== "已发布" || firstHistory.changedAt !== record.assignedAt) {
			throw new Error(`永久编号 ${record.id} 的状态历史必须从分配日已发布开始`);
		}
		if (latestHistory?.status !== record.status) {
			throw new Error(`永久编号 ${record.id} 的当前状态必须与状态历史一致`);
		}
		if (record.status !== "已发布" && latestHistory?.changedAt !== record.statusChangedAt) {
			throw new Error(`撤回编号 ${record.id} 的状态日期必须与状态历史一致`);
		}
		for (const [historyIndex, event] of record.history.entries()) {
			const previous = record.history[historyIndex - 1];
			if (previous && event.changedAt < previous.changedAt) {
				throw new Error(`永久编号 ${record.id} 的状态历史日期不能倒序`);
			}
			if (previous?.status === "隐私删除") {
				throw new Error(`隐私删除编号 ${record.id} 不能再次改变状态`);
			}
			if (previous && previous.status !== "已发布" && event.status === "已发布") {
				throw new Error(`撤回编号 ${record.id} 不能重新激活为已发布`);
			}
		}
	}
	return registry;
}

export function validateArchiveIdentifiers(
	entries: Array<{ id: string; publicationStatus?: "公开" | "目录占位" }>,
	registry: ArchiveIdentifierRegistry,
) {
	const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
	const recordsById = new Map(registry.identifiers.map((record) => [record.id, record]));
	const expectedRegistryStatus = {
		公开: "已发布",
		目录占位: "目录占位",
	} as const;

	for (const entry of entries) {
		const record = recordsById.get(entry.id);
		if (!record) throw new Error(`档案编号 ${entry.id} 未写入永久编号登记簿`);
		const publicationStatus = entry.publicationStatus ?? "公开";
		if (record.status !== expectedRegistryStatus[publicationStatus]) {
			throw new Error(
				`档案编号 ${entry.id} 已登记为${record.status}，不得作为${publicationStatus}材料复用`,
			);
		}
	}

	for (const record of registry.identifiers) {
		if (
			(record.status === "已发布" || record.status === "目录占位") &&
			!entriesById.has(record.id)
		) {
			throw new Error(`永久编号 ${record.id} 登记为${record.status}但缺少档案条目`);
		}
		if (record.status === "隐私删除" && entriesById.has(record.id)) {
			throw new Error(`隐私删除编号 ${record.id} 的档案元数据与正文必须从当前内容树移除`);
		}
	}
}

export function validateArchiveIdentifierRegistryAppendOnly(
	previous: ArchiveIdentifierRegistry,
	current: ArchiveIdentifierRegistry,
) {
	if (current.highWaterMark < previous.highWaterMark) {
		throw new Error("永久编号高水位只能增加，不能回退");
	}

	for (const [index, previousRecord] of previous.identifiers.entries()) {
		const currentRecord = current.identifiers[index];
		if (!currentRecord || currentRecord.id !== previousRecord.id) {
			throw new Error(`永久编号 ${previousRecord.id} 的既有登记不能删除或改号`);
		}
		if (currentRecord.assignedAt !== previousRecord.assignedAt) {
			throw new Error(`永久编号 ${previousRecord.id} 的分配日期不能修改`);
		}
		if (currentRecord.history.length < previousRecord.history.length) {
			throw new Error(`永久编号 ${previousRecord.id} 的状态历史只能追加`);
		}
		for (const [historyIndex, previousEvent] of previousRecord.history.entries()) {
			const currentEvent = currentRecord.history[historyIndex];
			if (
				!currentEvent ||
				currentEvent.status !== previousEvent.status ||
				currentEvent.changedAt !== previousEvent.changedAt
			) {
				throw new Error(`永久编号 ${previousRecord.id} 的既有状态历史不能修改`);
			}
		}
	}
}

export function parseArticles(input: unknown[]): ArticleMetadata[] {
	const articles = z.array(articleSchema).parse(input);
	const seenSlugs = new Set<string>();

	for (const article of articles) {
		if (seenSlugs.has(article.slug)) {
			throw new Error(`重复专题文章 slug ${article.slug}`);
		}
		seenSlugs.add(article.slug);
	}

	return articles;
}

export function parseCollections(input: unknown[]): CollectionMetadata[] {
	const collections = z.array(collectionSchema).parse(input);
	const seenSlugs = new Set<string>();

	for (const collection of collections) {
		if (seenSlugs.has(collection.slug)) {
			throw new Error(`重复专题集合 slug ${collection.slug}`);
		}
		if (new Set(collection.articleSlugs).size !== collection.articleSlugs.length) {
			throw new Error(`专题集合 ${collection.slug} 包含重复专题文章`);
		}
		seenSlugs.add(collection.slug);
	}

	return collections;
}
