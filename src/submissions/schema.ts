import { z } from "zod";

const optionalTrimmedText = (maximum: number) =>
	z
		.string()
		.trim()
		.max(maximum)
		.optional()
		.transform((value) => value || undefined);

export const submissionTypeSchema = z.enum([
	"词语",
	"材料出处",
	"纠错",
	"权利请求",
	"隐私或安全请求",
	"录音意愿",
]);

export const submissionStatusSchema = z.enum(["已收到", "待补充", "核验中", "已采纳", "已关闭"]);

export const contactMethodSchema = z.enum(["电子邮箱", "手机", "微信"]);

export const submissionInputSchema = z
	.object({
		type: submissionTypeSchema,
		description: z.string().trim().min(20, "说明至少需要 20 个字").max(4000),
		sourceUrl: z.union([z.url("材料链接格式无效"), z.literal("")]).optional(),
		contactMethod: contactMethodSchema.optional(),
		contactValue: optionalTrimmedText(320),
		policyAccepted: z.literal(true, { error: "请确认信息用途与保留规则" }),
		turnstileToken: z.string().trim().min(1, "请完成人机验证"),
	})
	.strict()
	.superRefine((input, context) => {
		if (Boolean(input.contactMethod) !== Boolean(input.contactValue)) {
			context.addIssue({
				code: "custom",
				path: [input.contactMethod ? "contactValue" : "contactMethod"],
				message: "联系方式类型与内容需要同时提供",
			});
		}
	});

export const statusUpdateSchema = z
	.object({
		status: submissionStatusSchema,
		note: optionalTrimmedText(1000),
	})
	.strict();

export const dispositionInputSchema = z
	.object({
		decisionType: z.enum(["事实修订", "证据身份变更", "目录撤回", "隐私删除"]),
		publicCatalogAction: z.enum(["保留", "移除", "不适用"]),
		storedCopyAction: z.enum(["保留", "销毁", "未持有", "不适用"]),
		backupAction: z.enum(["保留", "销毁", "未持有", "不适用"]),
		note: z.string().trim().min(10, "处置说明至少需要 10 个字").max(2000),
	})
	.strict()
	.superRefine((input, context) => {
		if (input.decisionType === "事实修订" || input.decisionType === "证据身份变更") {
			for (const field of ["publicCatalogAction", "storedCopyAction", "backupAction"] as const) {
				if (input[field] !== "不适用") {
					context.addIssue({
						code: "custom",
						path: [field],
						message: "事实修订与证据身份变更不包含目录或文件处置",
					});
				}
			}
			return;
		}
		if (input.decisionType === "目录撤回" && input.publicCatalogAction !== "保留") {
			context.addIssue({
				code: "custom",
				path: ["publicCatalogAction"],
				message: "目录撤回必须明确保留最小目录",
			});
		}
		if (input.decisionType === "隐私删除" && input.publicCatalogAction !== "移除") {
			context.addIssue({
				code: "custom",
				path: ["publicCatalogAction"],
				message: "隐私删除必须移除公开目录",
			});
		}
		for (const field of ["storedCopyAction", "backupAction"] as const) {
			if (input[field] === "不适用") {
				context.addIssue({
					code: "custom",
					path: [field],
					message: "撤回或删除决定必须逐项记录副本与备份处置；未持有时请选择“未持有”",
				});
			}
		}
	});

export type SubmissionInput = z.infer<typeof submissionInputSchema>;
export type SubmissionStatus = z.infer<typeof submissionStatusSchema>;
export type SubmissionType = z.infer<typeof submissionTypeSchema>;
export type DispositionInput = z.infer<typeof dispositionInputSchema>;

export const prioritySubmissionTypes = new Set<SubmissionType>(["权利请求", "隐私或安全请求"]);
