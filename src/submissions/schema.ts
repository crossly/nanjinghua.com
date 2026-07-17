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
		archiveId: z
			.union([z.string().regex(/^NJH\d{6}$/, "档案编号格式无效"), z.literal("")])
			.optional(),
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

export type SubmissionInput = z.infer<typeof submissionInputSchema>;
export type SubmissionStatus = z.infer<typeof submissionStatusSchema>;
export type SubmissionType = z.infer<typeof submissionTypeSchema>;

export const prioritySubmissionTypes = new Set<SubmissionType>(["权利请求", "隐私或安全请求"]);
