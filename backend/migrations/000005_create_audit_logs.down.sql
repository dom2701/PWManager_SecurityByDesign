-- Drop indexes
DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_timestamp;
DROP INDEX IF EXISTS idx_audit_logs_user_id;

-- Drop table
DROP TABLE IF EXISTS audit_logs;
