ALTER TABLE submission_leads ADD COLUMN terminal_at TEXT;

UPDATE submission_leads
SET terminal_at = status_changed_at
WHERE status IN ('已采纳', '已关闭') AND terminal_at IS NULL;

CREATE INDEX idx_submission_leads_terminal_at
	ON submission_leads(status, terminal_at);
