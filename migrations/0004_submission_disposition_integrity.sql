CREATE TABLE submission_disposition_events_v2 (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	lead_id TEXT NOT NULL UNIQUE,
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
	CHECK (
		(
			decision_type IN ('事实修订', '证据身份变更')
			AND public_catalog_action = '不适用'
			AND stored_copy_action = '不适用'
			AND backup_action = '不适用'
		)
		OR (
			decision_type = '目录撤回'
			AND public_catalog_action = '保留'
			AND stored_copy_action != '不适用'
			AND backup_action != '不适用'
		)
		OR (
			decision_type = '隐私删除'
			AND public_catalog_action = '移除'
			AND stored_copy_action != '不适用'
			AND backup_action != '不适用'
		)
	),
	FOREIGN KEY (lead_id) REFERENCES submission_leads(id) ON DELETE CASCADE
);

INSERT INTO submission_disposition_events_v2 (
	id, lead_id, archive_id, decision_type, public_catalog_action,
	stored_copy_action, backup_action, note, actor, created_at
)
SELECT
	id, lead_id, archive_id, decision_type, public_catalog_action,
	stored_copy_action, backup_action, note, actor, created_at
FROM submission_disposition_events;

DROP TABLE submission_disposition_events;
ALTER TABLE submission_disposition_events_v2 RENAME TO submission_disposition_events;

CREATE INDEX idx_submission_dispositions_lead
	ON submission_disposition_events(lead_id, created_at);
CREATE INDEX idx_submission_dispositions_archive
	ON submission_disposition_events(archive_id, created_at);

CREATE TRIGGER submission_disposition_requires_verification
BEFORE INSERT ON submission_disposition_events
BEGIN
	SELECT CASE
		WHEN NOT EXISTS (
			SELECT 1 FROM submission_leads
			WHERE id = NEW.lead_id AND status = '核验中'
		)
		THEN RAISE(ABORT, 'final disposition requires a verified submission')
	END;
	SELECT CASE
		WHEN NOT EXISTS (
			SELECT 1 FROM submission_leads
			WHERE id = NEW.lead_id
				AND (
					(type = '纠错' AND NEW.decision_type IN ('事实修订', '证据身份变更'))
					OR (type = '权利请求' AND NEW.decision_type = '目录撤回')
					OR (
						type = '隐私或安全请求'
						AND NEW.decision_type IN ('目录撤回', '隐私删除')
					)
				)
		)
		THEN RAISE(ABORT, 'final disposition is incompatible with submission type')
	END;
END;
