import type { ArchiveEntryMetadata } from "./schema";

export type ArchiveEntrySource = ArchiveEntryMetadata & { body: string };
export type PublishedArchiveEntry = Extract<ArchiveEntryMetadata, { publicationStatus: "公开" }> & {
	body: string;
};

export type PublicArchiveEntry =
	| PublishedArchiveEntry
	| {
			id: string;
			title: string;
			summary: string;
			publicationStatus: "目录占位";
			rightsStatus: "不公开媒体";
			withdrawal: {
				type: "权利撤回" | "目录撤回";
				decidedAt: string;
				decidedBy: string;
				publicNote: string;
			};
			revisions?: ArchiveEntryMetadata["revisions"];
			publishedAt: string;
			updatedAt: string;
	  }
	| {
			id: string;
			title: "档案已因隐私请求移除";
			summary: "为保护相关人员隐私或人身安全，本页不保留原目录信息。";
			publicationStatus: "隐私删除";
			rightsStatus: "不公开媒体";
			publishedAt: string;
			updatedAt: string;
	  };

export function toPublicArchiveEntry(entry: ArchiveEntrySource): PublicArchiveEntry {
	if (entry.publicationStatus === "公开") return entry as PublishedArchiveEntry;

	if (entry.withdrawal.type === "隐私或安全删除") {
		throw new Error(`档案 ${entry.id} 缺少可公开的目录撤回处置`);
	}

	return {
		id: entry.id,
		title: entry.title,
		summary: entry.summary,
		publicationStatus: "目录占位",
		rightsStatus: "不公开媒体",
		withdrawal: {
			type: entry.withdrawal.type,
			decidedAt: entry.withdrawal.decidedAt,
			decidedBy: entry.withdrawal.decidedBy,
			publicNote: entry.withdrawal.publicNote,
		},
		revisions: entry.revisions,
		publishedAt: entry.publishedAt,
		updatedAt: entry.updatedAt,
	};
}

export function toPrivacyDeletionEntry(
	id: string,
	assignedAt: string,
	statusChangedAt: string,
): PublicArchiveEntry {
	return {
		id,
		title: "档案已因隐私请求移除",
		summary: "为保护相关人员隐私或人身安全，本页不保留原目录信息。",
		publicationStatus: "隐私删除",
		rightsStatus: "不公开媒体",
		publishedAt: assignedAt,
		updatedAt: statusChangedAt,
	};
}
