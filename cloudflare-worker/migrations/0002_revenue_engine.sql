ALTER TABLE tasks ADD COLUMN approval_granted INTEGER NOT NULL DEFAULT 0;

ALTER TABLE tasks ADD COLUMN compute_budget_usd REAL NOT NULL DEFAULT 0.25;
ALTER TABLE tasks ADD COLUMN max_output_tokens INTEGER NOT NULL DEFAULT 1200;
CREATE INDEX IF NOT EXISTS idx_tasks_queue ON tasks(status,priority,created_at);
