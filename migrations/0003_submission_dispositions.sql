CREATE TABLE submission_disposition_events (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	lead_id TEXT NOT NULL,
	archive_id TEXT NOT NULL,
	decision_type TEXT NOT NULL CHECK (
		decision_type IN ('事实修订', '证据身份变更', '目录撤回', '隐私删除')
	),
	public_catalog_action TEXT NOT NULL CHECK (
		public_catalog_action IN ('保留', '移除', '不适用')
	),
	stored_copy_action TEXT NOT NULL CHECK (
		stored_copy_action IN ('保留', '销毁', '未持有', '不适用')
	),
	backup_action TEXT NOT NULL CHECK (
		backup_action IN ('保留', '销毁', '未持有', '不适用')
	),
	note TEXT NOT NULL,
	actor TEXT NOT NULL,
	created_at TEXT NOT NULL,
	FOREIGN KEY (lead_id) REFERENCES submission_leads(id) ON DELETE CASCADE
);

CREATE INDEX idx_submission_dispositions_lead
	ON submission_disposition_events(lead_id, created_at);
CREATE INDEX idx_submission_dispositions_archive
	ON submission_disposition_events(archive_id, created_at);
