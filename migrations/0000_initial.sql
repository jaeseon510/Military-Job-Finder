CREATE TABLE IF NOT EXISTS Company (
  code TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, industry TEXT NOT NULL,
  location TEXT NOT NULL, employee_count INTEGER, last_seen_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS Job (
  id TEXT PRIMARY KEY NOT NULL, company_code TEXT NOT NULL REFERENCES Company(code),
  source TEXT NOT NULL, classification TEXT NOT NULL, hash TEXT NOT NULL,
  first_seen_at TEXT NOT NULL, last_seen_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS job_company_idx ON Job(company_code);
CREATE TABLE IF NOT EXISTS MilitaryInfo (
  job_id TEXT PRIMARY KEY NOT NULL REFERENCES Job(id) ON DELETE CASCADE,
  active_assigned INTEGER, active_enrolled INTEGER, supplementary_assigned INTEGER,
  supplementary_enrolled INTEGER, verdict TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS JobSnapshot (
  id INTEGER PRIMARY KEY AUTOINCREMENT, job_id TEXT NOT NULL REFERENCES Job(id) ON DELETE CASCADE,
  hash TEXT NOT NULL, source TEXT NOT NULL, changes TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS snapshot_job_idx ON JobSnapshot(job_id, created_at);
