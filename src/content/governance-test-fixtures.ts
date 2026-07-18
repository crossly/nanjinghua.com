import type { ArchiveEntryMetadata, ArchiveIdentifierRegistry } from "./schema";

export const governanceCatalogFixture: ArchiveEntryMetadata = {
	id: "NJH000019",
	title: "已撤回材料的最小目录占位",
	summary: "原正文、来源、地点与文件信息已经停止公开，仅保留经确认可展示的目录说明。",
	publicationStatus: "目录占位",
	rightsStatus: "不公开媒体",
	withdrawal: {
		type: "目录撤回",
		decidedAt: "2026-07-18",
		decidedBy: "南京话编辑",
		publicNote: "依权利请求停止公开原材料，仅保留当前目录占位。",
	},
	revisions: [
		{
			type: "证据身份变更",
			revisedAt: "2026-07-18",
			responsibleParty: "南京话编辑",
			summary: "复核材料性质后更新证据身份；撤回后只公开这条变更说明。",
			previousEvidenceIdentity: "待考说法",
			newEvidenceIdentity: "研究观点",
		},
	],
	publishedAt: "2026-07-17",
	updatedAt: "2026-07-18",
};

export const governanceIdentifierFixtures: ArchiveIdentifierRegistry["identifiers"] = [
	{
		id: "NJH000019",
		status: "目录占位",
		assignedAt: "2026-07-17",
		statusChangedAt: "2026-07-18",
		history: [
			{ status: "已发布", changedAt: "2026-07-17" },
			{ status: "目录占位", changedAt: "2026-07-18" },
		],
	},
	{
		id: "NJH000020",
		status: "隐私删除",
		assignedAt: "2026-07-17",
		statusChangedAt: "2026-07-18",
		history: [
			{ status: "已发布", changedAt: "2026-07-17" },
			{ status: "隐私删除", changedAt: "2026-07-18" },
		],
	},
];
