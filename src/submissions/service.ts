import type { SubmissionInput, SubmissionStatus } from "./schema";
import { prioritySubmissionTypes } from "./schema";

const activeStatuses: SubmissionStatus[] = ["已收到", "待补充", "核验中"];
const terminalStatuses: SubmissionStatus[] = ["已采纳", "已关闭"];

const allowedTransitions: Record<SubmissionStatus, SubmissionStatus[]> = {
	已收到: ["待补充", "核验中", "已采纳", "已关闭"],
	待补充: ["核验中", "已采纳", "已关闭"],
	核验中: ["待补充", "已采纳", "已关闭"],
	已采纳: ["已关闭"],
	已关闭: [],
};

export type SubmissionLead = {
	id: string;
	type: string;
	description: string;
	source_url: string | null;
	archive_id: string | null;
	priority: number;
	status: SubmissionStatus;
	policy_accepted_at: string;
	created_at: string;
	updated_at: string;
	status_changed_at: string;
	terminal_at: string | null;
	last_reviewed_at: string | null;
	reminder_sent_at: string | null;
	closed_reason: string | null;
};

type SubmissionContact = {
	lead_id: string;
	contact_method: string;
	contact_value: string;
	created_at: string;
};

type StatusEvent = {
	id: number;
	lead_id: string;
	from_status: SubmissionStatus | null;
	to_status: SubmissionStatus;
	note: string | null;
	actor: string;
	created_at: string;
};

function referenceId(now: Date): string {
	const date = now.toISOString().slice(0, 10).replaceAll("-", "");
	const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
	return `SUB-${date}-${suffix}`;
}

function isoBefore(now: Date, days: number): string {
	return new Date(now.getTime() - days * 86_400_000).toISOString();
}

export async function createSubmission(db: D1Database, input: SubmissionInput, now = new Date()) {
	const id = referenceId(now);
	const timestamp = now.toISOString();
	const priority = prioritySubmissionTypes.has(input.type) ? 1 : 0;
	const statements = [
		db
			.prepare(
				`INSERT INTO submission_leads (
					id, type, description, source_url, archive_id, priority, status,
					policy_accepted_at, created_at, updated_at, status_changed_at
				) VALUES (?, ?, ?, ?, ?, ?, '已收到', ?, ?, ?, ?)`,
			)
			.bind(
				id,
				input.type,
				input.description,
				input.sourceUrl || null,
				input.archiveId || null,
				priority,
				timestamp,
				timestamp,
				timestamp,
				timestamp,
			),
		db
			.prepare(
				`INSERT INTO submission_status_events
					(lead_id, from_status, to_status, note, actor, created_at)
				VALUES (?, NULL, '已收到', ?, '公众提交', ?)`,
			)
			.bind(id, priority ? "权利、隐私或安全优先线索" : null, timestamp),
	];

	if (input.contactMethod && input.contactValue) {
		statements.push(
			db
				.prepare(
					`INSERT INTO submission_contacts
						(lead_id, contact_method, contact_value, created_at)
					VALUES (?, ?, ?, ?)`,
				)
				.bind(id, input.contactMethod, input.contactValue, timestamp),
		);
	}

	await db.batch(statements);
	return { id, priority: Boolean(priority), status: "已收到" as const };
}

export async function getSubmissionForEditor(db: D1Database, id: string) {
	const [lead, contact, events] = await Promise.all([
		db.prepare("SELECT * FROM submission_leads WHERE id = ?").bind(id).first<SubmissionLead>(),
		db
			.prepare("SELECT * FROM submission_contacts WHERE lead_id = ?")
			.bind(id)
			.first<SubmissionContact>(),
		db
			.prepare("SELECT * FROM submission_status_events WHERE lead_id = ? ORDER BY id")
			.bind(id)
			.all<StatusEvent>(),
	]);

	if (!lead) return null;
	return { lead, contact, events: events.results };
}

export async function updateSubmissionStatus(
	db: D1Database,
	id: string,
	nextStatus: SubmissionStatus,
	note: string | undefined,
	now = new Date(),
) {
	const lead = await db
		.prepare("SELECT id, status FROM submission_leads WHERE id = ?")
		.bind(id)
		.first<Pick<SubmissionLead, "id" | "status">>();

	if (!lead) return { outcome: "not-found" as const };
	if (!allowedTransitions[lead.status].includes(nextStatus)) {
		return { outcome: "invalid-transition" as const, currentStatus: lead.status };
	}

	const timestamp = now.toISOString();
	const [, update] = await db.batch([
		db
			.prepare(
				`INSERT INTO submission_status_events
					(lead_id, from_status, to_status, note, actor, created_at)
				SELECT id, status, ?, ?, '编辑', ?
				FROM submission_leads
				WHERE id = ? AND status = ?`,
			)
			.bind(nextStatus, note || null, timestamp, id, lead.status),
		db
			.prepare(
				`UPDATE submission_leads
				SET status = ?, updated_at = ?, status_changed_at = ?, last_reviewed_at = ?,
					reminder_sent_at = CASE
						WHEN ? IN ('已收到', '待补充', '核验中') THEN NULL
						ELSE reminder_sent_at
					END,
					terminal_at = CASE
						WHEN ? IN ('已采纳', '已关闭') THEN COALESCE(terminal_at, ?)
						ELSE terminal_at
					END,
					closed_reason = CASE WHEN ? = '已关闭' THEN ? ELSE closed_reason END
				WHERE id = ? AND status = ?`,
			)
			.bind(
				nextStatus,
				timestamp,
				timestamp,
				timestamp,
				nextStatus,
				nextStatus,
				timestamp,
				nextStatus,
				note || null,
				id,
				lead.status,
			),
	]);

	if (update.meta.changes === 0) {
		const current = await db
			.prepare("SELECT status FROM submission_leads WHERE id = ?")
			.bind(id)
			.first<Pick<SubmissionLead, "status">>();
		return current
			? { outcome: "invalid-transition" as const, currentStatus: current.status }
			: { outcome: "not-found" as const };
	}

	return { outcome: "updated" as const, status: nextStatus };
}

export async function runSubmissionRetention(db: D1Database, now = new Date()) {
	const contactCutoff = isoBefore(now, 90);
	const inactiveCutoff = isoBefore(now, 180);
	const closeCutoff = isoBefore(now, 7);
	const timestamp = now.toISOString();

	const contacts = await db
		.prepare(
			`DELETE FROM submission_contacts
			WHERE lead_id IN (
				SELECT id FROM submission_leads
				WHERE status IN ('已采纳', '已关闭') AND terminal_at <= ?
			)`,
		)
		.bind(contactCutoff)
		.run();

	const overdue = await db
		.prepare(
			`SELECT id, status FROM submission_leads
			WHERE priority = 0
				AND status IN ('已收到', '待补充', '核验中')
				AND updated_at <= ?
				AND reminder_sent_at IS NOT NULL
				AND reminder_sent_at <= ?`,
		)
		.bind(inactiveCutoff, closeCutoff)
		.all<Pick<SubmissionLead, "id" | "status">>();

	let closedIds: string[] = [];
	if (overdue.results.length > 0) {
		const closeResults = await db.batch(
			overdue.results.flatMap((lead) => [
				db
					.prepare(
						`INSERT INTO submission_status_events
							(lead_id, from_status, to_status, note, actor, created_at)
						SELECT id, status, '已关闭',
							'180 天无处理，提醒宽限期后自动关闭', '保留周期任务', ?
						FROM submission_leads
						WHERE id = ? AND status = ? AND priority = 0
							AND updated_at <= ? AND reminder_sent_at <= ?`,
					)
					.bind(timestamp, lead.id, lead.status, inactiveCutoff, closeCutoff),
				db
					.prepare(
						`UPDATE submission_leads
						SET status = '已关闭', status_changed_at = ?, updated_at = ?,
							terminal_at = COALESCE(terminal_at, ?),
							closed_reason = '180 天无处理，提醒宽限期后自动关闭'
						WHERE id = ? AND status = ? AND priority = 0
							AND updated_at <= ? AND reminder_sent_at <= ?`,
					)
					.bind(timestamp, timestamp, timestamp, lead.id, lead.status, inactiveCutoff, closeCutoff),
			]),
		);
		closedIds = overdue.results
			.filter((_, index) => closeResults[index * 2 + 1]?.meta.changes === 1)
			.map((lead) => lead.id);
	}

	const dueReminders = await db
		.prepare(
			`SELECT id, status FROM submission_leads
			WHERE status IN ('已收到', '待补充', '核验中')
				AND updated_at <= ? AND reminder_sent_at IS NULL`,
		)
		.bind(inactiveCutoff)
		.all<Pick<SubmissionLead, "id" | "status">>();

	let reminderIds: string[] = [];
	if (dueReminders.results.length > 0) {
		const reminderResults = await db.batch(
			dueReminders.results.flatMap((lead) => [
				db
					.prepare(
						`INSERT INTO submission_status_events
							(lead_id, from_status, to_status, note, actor, created_at)
						SELECT id, status, status, '180 天无处理，提醒编辑复核', '保留周期任务', ?
						FROM submission_leads
						WHERE id = ? AND status = ? AND updated_at <= ?
							AND reminder_sent_at IS NULL`,
					)
					.bind(timestamp, lead.id, lead.status, inactiveCutoff),
				db
					.prepare(
						`UPDATE submission_leads
						SET reminder_sent_at = ?
						WHERE id = ? AND status = ? AND updated_at <= ?
							AND reminder_sent_at IS NULL`,
					)
					.bind(timestamp, lead.id, lead.status, inactiveCutoff),
			]),
		);
		reminderIds = dueReminders.results
			.filter((_, index) => reminderResults[index * 2 + 1]?.meta.changes === 1)
			.map((lead) => lead.id);
	}

	return {
		contactsDeleted: contacts.meta.changes,
		remindersTriggered: reminderIds.length,
		reminderIds,
		submissionsClosed: closedIds.length,
		closedIds,
	};
}

export function isTerminalStatus(status: SubmissionStatus) {
	return terminalStatuses.includes(status);
}

export function isActiveStatus(status: SubmissionStatus) {
	return activeStatuses.includes(status);
}
