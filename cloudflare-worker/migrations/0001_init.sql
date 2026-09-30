CREATE TABLE IF NOT EXISTS agents (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'idle', current_task TEXT, heartbeat_at TEXT, metadata TEXT DEFAULT '{}');
CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, action TEXT NOT NULL, step TEXT NOT NULL, agent_id TEXT NOT NULL, status TEXT NOT NULL, priority INTEGER NOT NULL DEFAULT 50, input TEXT NOT NULL DEFAULT '{}', output TEXT DEFAULT '{}', attempts INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, error TEXT);
CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, ts TEXT NOT NULL, agent_id TEXT, task_id TEXT, type TEXT NOT NULL, status TEXT, payload TEXT NOT NULL DEFAULT '{}');
CREATE TABLE IF NOT EXISTS approvals (id TEXT PRIMARY KEY, task_id TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL, resolved_at TEXT);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts DESC);
