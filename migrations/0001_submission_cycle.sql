PRAGMA foreign_keys = ON;

CREATE TABLE submission_leads (
	id TEXT PRIMARY KEY,
	type TEXT NOT NULL CHECK (
		type IN ('词语', '材料出处', '纠错', '权利请求', '隐私或安全请求', '录音意愿')
	),
	description TEXT NOT NULL,
	source_url TEXT,
	archive_id TEXT,
	priority INTEGER NOT NULL DEFAULT 0 CHECK (priority IN (0, 1)),
	status TEXT NOT NULL DEFAULT '已收到' CHECK (
		status IN ('已收到', '待补充', '核验中', '已采纳', '已关闭')
	),
	policy_accepted_at TEXT NOT NULL,
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL,
	status_changed_at TEXT NOT NULL,
	last_reviewed_at TEXT,
	reminder_sent_at TEXT,
	closed_reason TEXT
);

CREATE TABLE submission_contacts (
	lead_id TEXT PRIMARY KEY,
	contact_method TEXT NOT NULL CHECK (contact_method IN ('电子邮箱', '手机', '微信')),
	contact_value TEXT NOT NULL,
	created_at TEXT NOT NULL,
	FOREIGN KEY (lead_id) REFERENCES submission_leads(id) ON DELETE CASCADE
);

CREATE TABLE submission_status_events (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	lead_id TEXT NOT NULL,
	from_status TEXT,
	to_status TEXT NOT NULL CHECK (
		to_status IN ('已收到', '待补充', '核验中', '已采纳', '已关闭')
	),
	note TEXT,
	actor TEXT NOT NULL,
	created_at TEXT NOT NULL,
	FOREIGN KEY (lead_id) REFERENCES submission_leads(id) ON DELETE CASCADE
);

CREATE INDEX idx_submission_leads_status_changed
	ON submission_leads(status, status_changed_at);
CREATE INDEX idx_submission_leads_retention
	ON submission_leads(priority, updated_at, reminder_sent_at);
CREATE INDEX idx_submission_events_lead
	ON submission_status_events(lead_id, created_at);
