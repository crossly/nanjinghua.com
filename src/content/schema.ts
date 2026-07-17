import { z } from "zod";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期必须使用 YYYY-MM-DD 格式");
const requiredText = z.string().trim().min(1, "字段不能为空");
const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug 格式无效");

export const evidenceIdentitySchema = z.enum(["原始材料", "研究观点", "口述记忆", "待考说法"], {
	error: "证据身份必须使用受控词汇",
});

export const languageScopeSchema = z.enum(["南京话", "南京地区方言", "历史南京语音"], {
	error: "语言对象必须使用受控词汇",
});

export const rightsStatusSchema = z.enum(
	["公版", "CC0", "CC BY 4.0", "已获授权", "仅引文与目录信息", "不公开媒体"],
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

export const archiveEntrySchema = z
	.object({
		id: z.string().regex(/^NJH\d{6}$/, "档案编号必须使用 NJH 加六位数字"),
		title: requiredText,
		summary: requiredText,
		evidenceIdentity: evidenceIdentitySchema,
		languageScope: z.array(languageScopeSchema).min(1, "档案条目至少需要一个语言对象"),
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
export type ArticleMetadata = z.infer<typeof articleSchema>;
export type CollectionMetadata = z.infer<typeof collectionSchema>;

export function parseArchiveEntries(input: unknown[]): ArchiveEntryMetadata[] {
	const entries = z.array(archiveEntrySchema).parse(input);
	const seenIds = new Set<string>();

	for (const entry of entries) {
		if (seenIds.has(entry.id)) {
			throw new Error(`重复档案编号 ${entry.id}`);
		}
		if (entry.citations.filter((citation) => citation.role === "主要来源").length !== 1) {
			throw new Error(`档案条目 ${entry.id} 必须且只能有一条主要来源`);
		}
		seenIds.add(entry.id);
	}

	return entries;
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
