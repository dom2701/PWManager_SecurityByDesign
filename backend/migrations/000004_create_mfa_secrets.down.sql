-- Drop trigger
DROP TRIGGER IF EXISTS update_mfa_secrets_updated_at ON mfa_secrets;

-- Drop index
DROP INDEX IF EXISTS idx_mfa_secrets_user_id;

-- Drop table
DROP TABLE IF EXISTS mfa_secrets;
